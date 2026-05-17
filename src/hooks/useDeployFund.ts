import { useState, useCallback }                        from 'react'
import { usePublicClient, useWalletClient, useChainId } from 'wagmi'
import { parseAbiItem, decodeEventLog }                 from 'viem'
import type { PublicClient }                            from 'viem'
import { getContractAddresses }                         from '@/config/addresses'
import { FACTORY_ABI, ERC20_ABI }                      from '@/config/abis'
import { useWizardStore }                               from '@/stores/wizardStore'
import { useToast }                                     from '@/stores/uiStore'
import { toUsdcBigInt }                                 from '@/lib/calculator'
import { fundsService }                                 from '@/services/fundsService'

export type DeployStatus =
  | 'idle' | 'approving' | 'approved' | 'deploying' | 'registering' | 'success' | 'error'

const FUND_CREATED_EVENT = parseAbiItem(
  'event FundCreated(address indexed fundAddress, address indexed owner, uint256 initialDeposit, uint256 principal, uint256 monthlyDeposit, address selectedProtocol, uint256 retirementAge, uint256 timelockEnd, uint256 timestamp)'
)

const TESTNET_CHAIN_IDS = new Set([421614, 11155111, 80002, 84532])
function isTestnet(chainId: number): boolean { return TESTNET_CHAIN_IDS.has(chainId) }

interface GasConfig { minPriorityFee: bigint; minMaxFee: bigint; bumpPct: bigint }

const GAS_CONFIG: Record<'testnet' | 'mainnet', GasConfig> = {
  testnet: { minPriorityFee: 100_000_000_000n, minMaxFee: 100_000_000_000n, bumpPct: 160n },
  mainnet: { minPriorityFee: 10_000_000n,      minMaxFee: 100_000_000n,     bumpPct: 130n },
}
const GAS_FLOOR:          Record<'testnet' | 'mainnet', bigint> = { testnet: 3_000_000n, mainnet: 1_000_000n }
const GAS_LIMIT_BUMP_PCT: Record<'testnet' | 'mainnet', bigint> = { testnet: 160n,       mainnet: 130n }
const bigintMax = (a: bigint, b: bigint) => a > b ? a : b

async function getGasOverrides(publicClient: PublicClient, chainId: number) {
  const cfg = GAS_CONFIG[isTestnet(chainId) ? 'testnet' : 'mainnet']
  try {
    const block = await publicClient.getBlock({ blockTag: 'latest' })
    if (block.baseFeePerGas != null) {
      const maxPriorityFeePerGas = bigintMax(cfg.minPriorityFee, 1n)
      const maxFeePerGas = bigintMax(block.baseFeePerGas * cfg.bumpPct / 100n + maxPriorityFeePerGas, cfg.minMaxFee)
      return { maxFeePerGas, maxPriorityFeePerGas }
    }
    return { gasPrice: bigintMax(await publicClient.getGasPrice() * cfg.bumpPct / 100n, cfg.minMaxFee) }
  } catch {
    return isTestnet(chainId)
      ? { maxFeePerGas: cfg.minMaxFee, maxPriorityFeePerGas: cfg.minPriorityFee }
      : {}
  }
}

function extractErrorMsg(err: unknown): string {
  if (err instanceof Error) {
    return err.message
      .replace(/^.*ContractFunctionExecutionError:\s*/s, '')
      .split('\n')[0] ?? 'Error desconocido'
  }
  return 'Error desconocido'
}

export function useDeployFund() {
  const approvedFromStore        = useWizardStore((s) => s.approved)
  const [status,    setStatus]   = useState<DeployStatus>(approvedFromStore ? 'approved' : 'idle')
  const [txHash,    setTxHash]   = useState<`0x${string}` | null>(null)
  const [fundAddr,  setFundAddr] = useState<`0x${string}` | null>(null)
  const [errorMsg,  setErrorMsg] = useState<string | null>(null)

  const chainId                = useChainId()
  const publicClient           = usePublicClient()
  const { data: walletClient } = useWalletClient()

  const {
    result,
    calculator,
    selectedProtocol,
    setApproved,
    setTxHash:   storeSetTxHash,
    setFundAddr: storeSetFundAddr,
  } = useWizardStore()

  const toast     = useToast()
  const chainType = isTestnet(chainId) ? 'testnet' : 'mainnet'

  const getAddresses = useCallback(() => {
    const addrs = getContractAddresses(chainId)
    if (!addrs) { toast.error(`No contracts deployed on chain ${chainId}`); return null }
    return addrs
  }, [chainId, toast])

  // Approve USDC 

  const approveUsdc = useCallback(async () => {
    if (!walletClient || !publicClient) { toast.error('Wallet not connected');     return }
    if (!result)                        { toast.error('Run the calculator first'); return }
    const addrs = getAddresses(); if (!addrs) return

    setStatus('approving'); setErrorMsg(null)
    try {
      const gasOverrides = await getGasOverrides(publicClient, chainId)
      const hash = await walletClient.writeContract({
        address:      addrs.usdc,
        abi:          ERC20_ABI,
        functionName: 'approve',
        args:         [
          addrs.personalFundFactory,
          toUsdcBigInt(calculator.principal) + toUsdcBigInt(result.monthlyGross),
        ],
        ...gasOverrides,
      })
      toast.info('Approval sent — waiting for confirmation…')
      await publicClient.waitForTransactionReceipt({ hash })
      setApproved(true); setStatus('approved'); toast.success('USDC approved ✓')
    } catch (err) {
      const msg = extractErrorMsg(err)
      setStatus('error'); setErrorMsg(msg); toast.error(msg)
    }
  }, [walletClient, publicClient, result, calculator, chainId, getAddresses, setApproved, toast])

  // Deploy fund

  const deployFund = useCallback(async () => {
    if (!walletClient || !publicClient) { toast.error('Wallet not connected');      return }
    if (!result || !selectedProtocol)   { toast.error('Complete the wizard first'); return }
    const addrs = getAddresses(); if (!addrs) return

    const txArgs = [
      toUsdcBigInt(calculator.principal),
      toUsdcBigInt(result.monthlyGross),
      BigInt(calculator.currentAge),
      BigInt(calculator.retirementAge),
      toUsdcBigInt(calculator.desiredMonthlyIncome),
      BigInt(calculator.paymentYears),
      BigInt(Math.round(calculator.apyPercent * 100)),
      0n,
      selectedProtocol.address,
    ] as const

    setStatus('deploying'); setErrorMsg(null)

    // ── Gas estimate ──
    let gasEstimate: bigint
    try {
      gasEstimate = await publicClient.estimateContractGas({
        address:      addrs.personalFundFactory,
        abi:          FACTORY_ABI,
        functionName: 'createPersonalFund',
        args:         txArgs,
        account:      walletClient.account,
      })
      gasEstimate = gasEstimate * GAS_LIMIT_BUMP_PCT[chainType] / 100n
      if (gasEstimate < GAS_FLOOR[chainType]) gasEstimate = GAS_FLOOR[chainType]
    } catch (simErr) {
      const clean = extractErrorMsg(simErr)
      setStatus('error'); setErrorMsg(clean)
      toast.error(`Simulation failed: ${clean}`)
      return
    }

    // ── Submit tx ──
    let hash: `0x${string}`
    try {
      hash = await walletClient.writeContract({
        address:      addrs.personalFundFactory,
        abi:          FACTORY_ABI,
        functionName: 'createPersonalFund',
        args:         txArgs,
        gas:          gasEstimate,
        ...await getGasOverrides(publicClient, chainId),
      })
    } catch (err) {
      const msg = extractErrorMsg(err)
      setStatus('error'); setErrorMsg(msg); toast.error(msg)
      return
    }

    setTxHash(hash); storeSetTxHash(hash)
    toast.info('Transaction sent — waiting for confirmation…')
    let deployedFundAddr: `0x${string}` | null = null
    try {
      const receipt = await publicClient.waitForTransactionReceipt({ hash })
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi:    [FUND_CREATED_EVENT],
            data:   log.data,
            topics: log.topics,
          })
          if (decoded.eventName === 'FundCreated') {
            deployedFundAddr = decoded.args.fundAddress
            break
          }
        } catch { /* log from another contract — skip */ }
      }
    } catch (err) {
      console.warn('[useDeployFund] waitForTransactionReceipt failed:', err)
    }

    if (!deployedFundAddr) {
      console.warn('[useDeployFund] Could not extract fund address from receipt')
      toast.success('Fund deployed! Address extraction failed — check the explorer.')
      setStatus('success')
      return
    }

    // Fund address extracted 
    setFundAddr(deployedFundAddr)
    storeSetFundAddr(deployedFundAddr)
    toast.success('Fund deployed on-chain! Registering… 🎉')

    // Register in DB 
    // Transition to 'registering' so the UI can show a spinner while we call the backend.
    // fundsService.registerAndSync() has built-in retry (5 attempts, exponential backoff).
    // If all retries fail it saves to localStorage so useSiweAuth retries on next login.
    setStatus('registering')
    try {
      await fundsService.registerAndSync({
        contract_address:       deployedFundAddr,
        principal:              calculator.principal,
        monthly_deposit:        result.monthlyGross,
        desired_monthly_income: calculator.desiredMonthlyIncome,
        current_age:            calculator.currentAge,
        retirement_age:         calculator.retirementAge,
        payment_years:          calculator.paymentYears,
        // apy_percent: backend expects a plain percentage (e.g. 5.5), not basis points.
        apy_percent:            calculator.apyPercent,
        // protocol_address: backend stores lowercase; sending checksum is fine,
        // fund_repo.py normalises with .lower() before querying.
        protocol_address:       selectedProtocol.address,
      })
      toast.success('Fund registered in database ✓')
    } catch (err) {
      // The fund EXISTS on-chain — registration failure is recoverable.
      // fundsService already saved to localStorage; retryPendingRegister()
      // will pick it up automatically on the next SIWE login.
      console.error('[useDeployFund] DB registration failed after all retries:', err)
      toast.warning(
        'Fund created on-chain. Database registration will retry automatically on next login.',
      )
    }

    setStatus('success')
  }, [
    walletClient, publicClient, result, calculator,
    selectedProtocol, chainId, chainType,
    getAddresses, storeSetTxHash, storeSetFundAddr, toast,
  ])

  const approved =
    approvedFromStore      ||
    status === 'approved'  ||
    status === 'deploying' ||
    status === 'registering' ||
    status === 'success'

  return { status, txHash, fundAddr, errorMsg, approveUsdc, deployFund, approved }
}