/**
 * useDeployFund.ts
 *
 * Drives the two on-chain transactions required to create a PersonalFund:
 *   1. approveUsdc  — ERC-20 approve to the Factory for the initial deposit
 *                     (principal + first monthly, inclusive of protocol fee).
 *   2. deployFund   — Factory.createPersonalFund(...)
 *
 * Changes vs previous version:
 *  - approveUsdc no longer has a silent fallback when calculateInitialDeposit
 *    fails. If the Factory read reverts, we surface the error immediately
 *    instead of approving an insufficient amount that would cause deployFund
 *    to revert later with a harder-to-diagnose error.
 *  - The approve amount is now sourced from Factory.calculateInitialDeposit,
 *    which already includes the Treasury fee. useProtocolFee is no longer
 *    needed here because the Factory exposes the exact gross amount via that
 *    view function.
 *  - _maxFeeBP is NOT a parameter of Factory.createPersonalFund — it is
 *    passed by the Factory internally to PersonalFund.initialize. The frontend
 *    does not need to send it.
 */

import { useState, useCallback }                        from 'react'
import { usePublicClient, useWalletClient, useChainId } from 'wagmi'
import { parseAbiItem, decodeEventLog }                 from 'viem'
import type { PublicClient }                            from 'viem'
import { getContractAddresses }                         from '@/config/addresses'
import { FACTORY_ABI, ERC20_ABI }                       from '@/config/abis'
import { useWizardStore }                               from '@/stores/wizardStore'
import { useToast }                                     from '@/stores/uiStore'
import { toUsdcBigInt }                                 from '@/lib/calculator'

// Types

export type DeployStatus =
  | 'idle'
  | 'approving'
  | 'approved'
  | 'deploying'
  | 'success'
  | 'error'

// Constants

const FUND_CREATED_EVENT = parseAbiItem(
  'event FundCreated(address indexed fundAddress, address indexed owner, uint256 initialDeposit, uint256 principal, uint256 monthlyDeposit, address selectedProtocol, uint256 retirementAge, uint256 timelockEnd, uint256 timestamp)'
)

const TESTNET_CHAIN_IDS = new Set([421614, 11155111, 80002, 84532])

// Gas helpers 

interface GasConfig {
  minPriorityFee: bigint
  minMaxFee:      bigint
  bumpPct:        bigint
}

const GAS_CONFIG: Record<'testnet' | 'mainnet', GasConfig> = {
  testnet: { minPriorityFee: 100_000_000_000n, minMaxFee: 100_000_000_000n, bumpPct: 160n },
  mainnet: { minPriorityFee: 10_000_000n,      minMaxFee: 100_000_000n,     bumpPct: 130n },
}

const GAS_FLOOR: Record<'testnet' | 'mainnet', bigint> = {
  testnet: 3_000_000n,
  mainnet: 1_000_000n,
}

const GAS_LIMIT_BUMP_PCT: Record<'testnet' | 'mainnet', bigint> = {
  testnet: 160n,
  mainnet: 130n,
}

function isTestnet(chainId: number): boolean {
  return TESTNET_CHAIN_IDS.has(chainId)
}

const bigintMax = (a: bigint, b: bigint) => (a > b ? a : b)

async function getGasOverrides(publicClient: PublicClient, chainId: number) {
  const cfg = GAS_CONFIG[isTestnet(chainId) ? 'testnet' : 'mainnet']
  try {
    const block = await publicClient.getBlock({ blockTag: 'latest' })
    if (block.baseFeePerGas != null) {
      const maxPriorityFeePerGas = bigintMax(cfg.minPriorityFee, 1n)
      const maxFeePerGas         = bigintMax(
        block.baseFeePerGas * cfg.bumpPct / 100n + maxPriorityFeePerGas,
        cfg.minMaxFee,
      )
      return { maxFeePerGas, maxPriorityFeePerGas }
    }
    return {
      gasPrice: bigintMax(
        await publicClient.getGasPrice() * cfg.bumpPct / 100n,
        cfg.minMaxFee,
      ),
    }
  } catch {
    return isTestnet(chainId)
      ? { maxFeePerGas: cfg.minMaxFee, maxPriorityFeePerGas: cfg.minPriorityFee }
      : {}
  }
}

// Factory config helper 

interface FactoryConfig {
  minTimelockYears:  bigint
  maxTimelockYears:  bigint
  minMonthlyDeposit: bigint
  minPrincipal:      bigint
  maxPrincipal:      bigint
  minAge:            bigint
  maxAge:            bigint
  minRetirementAge:  bigint
}

function resolveTimelockYears(
  currentAge:    number,
  retirementAge: number,
  config:        FactoryConfig,
): bigint {
  const years = BigInt(retirementAge - currentAge)
  if (years < config.minTimelockYears) return config.minTimelockYears
  if (years > config.maxTimelockYears) return config.maxTimelockYears
  return years
}

async function fetchFactoryConfig(
  publicClient:   PublicClient,
  factoryAddress: `0x${string}`,
): Promise<FactoryConfig> {
  return publicClient.readContract({
    address:      factoryAddress,
    abi:          FACTORY_ABI,
    functionName: 'getConfiguration',
  }) as Promise<FactoryConfig>
}

// Error extraction

function extractErrorMsg(err: unknown): string {
  if (err instanceof Error) {
    return (
      err.message
        .replace(/^.*ContractFunctionExecutionError:\s*/s, '')
        .split('\n')[0] ?? 'Unknown error'
    )
  }
  return 'Unknown error'
}

// Hook 

export function useDeployFund() {
  const approvedFromStore       = useWizardStore((s) => s.approved)
  const [status,   setStatus]   = useState<DeployStatus>(approvedFromStore ? 'approved' : 'idle')
  const [txHash,   setTxHash]   = useState<`0x${string}` | null>(null)
  const [fundAddr, setFundAddr] = useState<`0x${string}` | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const chainId                = useChainId()
  const publicClient           = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const chainType              = isTestnet(chainId) ? 'testnet' : 'mainnet'

  const {
    result,
    calculator,
    selectedProtocol,
    setApproved,
    setTxHash:   storeSetTxHash,
    setFundAddr: storeSetFundAddr,
  } = useWizardStore()

  const toast = useToast()

  const getAddresses = useCallback(() => {
    const addrs = getContractAddresses(chainId)
    if (!addrs) {
      toast.error(`No contracts deployed on chain ${chainId}`)
      return null
    }
    return addrs
  }, [chainId, toast])

  // Step 1: Approve USDC 
  //
  // Amount is sourced from Factory.calculateInitialDeposit, which returns the
  // gross amount already inclusive of the Treasury fee. This is the only
  // correct way to compute it — doing it client-side would require mirroring
  // the fee arithmetic from the Solidity contract.
  //
  // No silent fallback: if the Factory read fails, we abort and surface the
  // error. Approving a guessed amount that turns out to be insufficient would
  // cause deployFund to revert with a confusing ERC-20 error instead of this
  // clear one.

  const approveUsdc = useCallback(async () => {
    if (!walletClient || !publicClient) { toast.error('Wallet not connected');     return }
    if (!result)                        { toast.error('Run the calculator first'); return }
    const addrs = getAddresses()
    if (!addrs) return

    setStatus('approving')
    setErrorMsg(null)

    try {
      const principalRaw = toUsdcBigInt(calculator.principal)
      const monthlyRaw   = toUsdcBigInt(result.monthlyGross)

      // Factory.calculateInitialDeposit returns gross (net + fee).
      // No fallback — a failure here means the ABI or address is wrong and
      // we must not proceed with an incorrect allowance.
      let initialDeposit: bigint
      try {
        initialDeposit = await publicClient.readContract({
          address:      addrs.personalFundFactory,
          abi:          FACTORY_ABI,
          functionName: 'calculateInitialDeposit',
          args:         [principalRaw, monthlyRaw],
        }) as bigint
      } catch (calcErr) {
        const msg = extractErrorMsg(calcErr)
        console.error('[useDeployFund] calculateInitialDeposit failed:', calcErr)
        setStatus('error')
        setErrorMsg(`Cannot read deposit amount from factory: ${msg}`)
        toast.error('Factory read failed — please refresh the page and try again')
        return
      }

      // +1 USDC buffer absorbs any integer-division rounding dust in the
      // contract's fee calculation so the allowance is always sufficient.
      const approveAmount = initialDeposit + 1_000_000n
      const gasOverrides  = await getGasOverrides(publicClient, chainId)

      const hash = await walletClient.writeContract({
        address:      addrs.usdc,
        abi:          ERC20_ABI,
        functionName: 'approve',
        args:         [addrs.personalFundFactory, approveAmount],
        ...gasOverrides,
      })

      toast.info('Approval sent — waiting for confirmation…')
      await publicClient.waitForTransactionReceipt({ hash })

      setApproved(true)
      setStatus('approved')
      toast.success('USDC approved ✓')
    } catch (err) {
      const msg = extractErrorMsg(err)
      setStatus('error')
      setErrorMsg(msg)
      toast.error(msg)
    }
  }, [walletClient, publicClient, result, calculator, chainId, getAddresses, setApproved, toast])

  // Step 2: Deploy fund on-chain 
  //
  // Note: Factory.createPersonalFund does NOT take _maxFeeBP as a parameter.
  // The Factory passes it internally to PersonalFund.initialize using its own
  // configured value. The frontend has no role in setting it.

  const deployFund = useCallback(async () => {
    if (!walletClient || !publicClient) { toast.error('Wallet not connected');      return }
    if (!result || !selectedProtocol)   { toast.error('Complete the wizard first'); return }
    const addrs = getAddresses()
    if (!addrs) return

    // Read factory config — validates connectivity and surfaces misconfiguration
    // before we attempt to send a tx that would revert on-chain.
    let factoryConfig: FactoryConfig
    try {
      factoryConfig = await fetchFactoryConfig(publicClient, addrs.personalFundFactory)
    } catch (cfgErr) {
      const msg = extractErrorMsg(cfgErr)
      setStatus('error')
      setErrorMsg(msg)
      toast.error(`Could not read factory config: ${msg}`)
      return
    }

    const timelockYears = resolveTimelockYears(
      calculator.currentAge,
      calculator.retirementAge,
      factoryConfig,
    )

    // Arguments must match Factory.createPersonalFund signature exactly:
    // (principal, monthlyDeposit, currentAge, retirementAge, desiredMonthly,
    //  yearsPayments, interestRate, timelockYears, selectedProtocol)
    const txArgs = [
      toUsdcBigInt(calculator.principal),
      toUsdcBigInt(result.monthlyGross),
      BigInt(calculator.currentAge),
      BigInt(calculator.retirementAge),
      toUsdcBigInt(calculator.desiredMonthlyIncome),
      BigInt(calculator.paymentYears),
      BigInt(Math.round(calculator.apyPercent * 100)), // bps: 5% → 500
      timelockYears,
      selectedProtocol.address,
    ] as const

    setStatus('deploying')
    setErrorMsg(null)

    // Simulate before sending — surfaces revert reasons (insufficient allowance,
    // validation failures, etc.) without spending gas.
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
      setStatus('error')
      setErrorMsg(clean)
      toast.error(`Simulation failed: ${clean}`)
      return
    }

    // Submit
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
      setStatus('error')
      setErrorMsg(msg)
      toast.error(msg)
      return
    }

    setTxHash(hash)
    storeSetTxHash(hash)
    toast.info('Transaction sent — waiting for confirmation…')

    // Extract deployed fund address from FundCreated event in receipt logs.
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
        } catch {
          // Log from a different contract — skip silently.
        }
      }
    } catch (err) {
      console.warn('[useDeployFund] waitForTransactionReceipt failed:', err)
    }

    if (!deployedFundAddr) {
      // Tx confirmed but FundCreated event not found in logs.
      // Mark success anyway — Step3Deploy will handle the missing address.
      console.warn('[useDeployFund] Could not extract fund address from receipt logs')
      toast.warning('Fund deployed! Could not extract address — check the explorer.')
      setStatus('success')
      return
    }

    // Commit address to local state AND Zustand store atomically before
    // setting status=success. This ensures Step3Deploy's useEffect (which
    // watches [isSuccess, fundAddr]) sees both truthy in the same render cycle.
    setFundAddr(deployedFundAddr)
    storeSetFundAddr(deployedFundAddr)

    // ⚠️  DB registration is handled exclusively by Step3Deploy.runPostDeployFlow
    //     to prevent double-registration and race conditions.
    setStatus('success')
    toast.success('Fund deployed on-chain! 🎉')
  }, [
    walletClient, publicClient,
    result, calculator, selectedProtocol,
    chainId, chainType,
    getAddresses,
    storeSetTxHash, storeSetFundAddr,
    toast,
  ])

  // Derived state 

  const approved =
    approvedFromStore      ||
    status === 'approved'  ||
    status === 'deploying' ||
    status === 'success'

  return {
    status,
    txHash,
    fundAddr,  
    errorMsg,
    approveUsdc,
    deployFund,
    approved,
  }
}