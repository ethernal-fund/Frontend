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

interface DepositAmounts {
  /** Principal en wei USDC (6 decimales). Sin fee — el contrato no aplica fee al principal por separado. */
  principalWei: bigint
  monthlyNetWei: bigint
  approveWei: bigint
}

function buildDepositAmounts(
  principal:    number,
  monthlyNet:   number,
): DepositAmounts {
  const principalWei  = toUsdcBigInt(principal)
  const monthlyNetWei = toUsdcBigInt(monthlyNet)
  const approveWei    = principalWei + monthlyNetWei
  return { principalWei, monthlyNetWei, approveWei }
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

  // Step 1: Approve USDC al Factory
  //
  // Aprobamos exactamente principal + monthlyNet al Factory.
  // El Factory hará transferFrom(user → fund, principal + monthlyNet).
  // El fondo luego descuenta el 5% de ese monto y se lo manda al Treasury.

  const approveUsdc = useCallback(async () => {
    if (!walletClient || !publicClient) { toast.error('Wallet not connected');     return }
    if (!result)                        { toast.error('Run the calculator first'); return }
    const addrs = getAddresses()
    if (!addrs) return

    // result.monthlyNet debe existir en el CalcResult. Es el monto que el
    // calculator ya calculó descontando el fee (monthlyGross / 1.fee).
    // Si por alguna razón no existe, usamos monthlyGross como fallback seguro
    // aunque eso significaría pasar gross — en ese caso el frontend debe ser
    // corregido para exponer monthlyNet correctamente desde el calculator.
    const monthlyNetValue = result.monthlyNet ?? result.monthlyGross

    const { approveWei } = buildDepositAmounts(calculator.principal, monthlyNetValue)

    setStatus('approving')
    setErrorMsg(null)

    try {
      const gasOverrides = await getGasOverrides(publicClient, chainId)

      const hash = await walletClient.writeContract({
        address:      addrs.usdc,
        abi:          ERC20_ABI,
        functionName: 'approve',
        args:         [addrs.personalFundFactory, approveWei],
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
  // Factory.createPersonalFund signature:
  //   _principal        uint256   → NET, sin fee
  //   _monthlyDeposit   uint256   → NET, el fondo cobra fee encima en cada depósito
  //   _currentAge       uint256
  //   _retirementAge    uint256
  //   _desiredMonthly   uint256   → income deseado en retiro (para referencia)
  //   _yearsPayments    uint256
  //   _interestRate     uint256   → en bps (5% = 500)
  //   _timelockYears    uint256   → años hasta retiro, clampado por Factory config
  //   _selectedProtocol address

  const deployFund = useCallback(async () => {
    if (!walletClient || !publicClient) { toast.error('Wallet not connected');      return }
    if (!result || !selectedProtocol)   { toast.error('Complete the wizard first'); return }
    const addrs = getAddresses()
    if (!addrs) return

    // Leer config del Factory para validar y calcular timelockYears.
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

    const monthlyNetValue = result.monthlyNet ?? result.monthlyGross
    const { principalWei, monthlyNetWei } = buildDepositAmounts(
      calculator.principal,
      monthlyNetValue,
    )

    // Verificar que el usuario todavía tiene suficiente allowance antes de
    // intentar la simulación. Si hicieron approve y luego movieron fondos,
    // esta comprobación da un error claro antes de gastar gas.
    try {
      const [allowance, balance] = await Promise.all([
        publicClient.readContract({
          address:      addrs.usdc,
          abi:          ERC20_ABI,
          functionName: 'allowance',
          args:         [walletClient.account.address, addrs.personalFundFactory],
        }) as Promise<bigint>,
        publicClient.readContract({
          address:      addrs.usdc,
          abi:          ERC20_ABI,
          functionName: 'balanceOf',
          args:         [walletClient.account.address],
        }) as Promise<bigint>,
      ])

      const required = principalWei + monthlyNetWei

      if (allowance < required) {
        setStatus('error')
        setErrorMsg(`Insufficient allowance. Required: ${required}, current: ${allowance}. Please approve again.`)
        toast.error('Allowance insuficiente — volvé a aprobar')
        return
      }
      if (balance < required) {
        setStatus('error')
        setErrorMsg(`Insufficient USDC balance. Required: ${required}, current: ${balance}.`)
        toast.error('Balance USDC insuficiente')
        return
      }
    } catch (checkErr) {
      // No es bloqueante — si la lectura falla, dejamos que la simulación lo detecte.
      console.warn('[useDeployFund] Pre-flight balance check failed:', checkErr)
    }

    const txArgs = [
      principalWei,
      monthlyNetWei,
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

    // Simular antes de enviar — expone revert reasons sin gastar gas.
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

    // Extraer la dirección del fondo del evento FundCreated en el receipt.
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
          // Log de otro contrato — ignorar silenciosamente.
        }
      }
    } catch (err) {
      console.warn('[useDeployFund] waitForTransactionReceipt failed:', err)
    }

    if (!deployedFundAddr) {
      console.warn('[useDeployFund] Could not extract fund address from receipt logs')
      toast.warning('Fund deployed! Could not extract address — check the explorer.')
      setStatus('success')
      return
    }

    // Persistir la dirección en el store ANTES de setear status=success para
    // que Step3Deploy vea ambos truthy en el mismo ciclo de render.
    setFundAddr(deployedFundAddr)
    storeSetFundAddr(deployedFundAddr)

    // ⚠️  El registro en DB lo maneja Step3Deploy.runPostDeployFlow exclusivamente.
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