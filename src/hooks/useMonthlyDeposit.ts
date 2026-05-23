import { useState, useCallback }                         from 'react'
import { usePublicClient, useWalletClient, useChainId }  from 'wagmi'
import { useReadContract }                               from 'wagmi'
import { getContractAddresses }                          from '@/config/addresses'
import { PERSONAL_FUND_ABI, ERC20_ABI }                  from '@/config/abis'
import { useToast }                                      from '@/stores/uiStore'
import { useProtocolFee }                                from '@/hooks/useProtocolFee'
import { MAX_FEE_BPS }                                   from '@/config/constants'

// Explorer helper 

function getExplorerUrl(chainId: number, txHash: string): string {
  const explorers: Record<number, string> = {
    1:      'https://etherscan.io/tx/',
    8453:   'https://basescan.org/tx/',
    84532:  'https://sepolia.basescan.org/tx/',
    137:    'https://polygonscan.com/tx/',
    42161:  'https://arbiscan.io/tx/',
    421614: 'https://sepolia.arbiscan.io/tx/',
    10:     'https://optimistic.etherscan.io/tx/',
  }
  return `${explorers[chainId] ?? 'https://etherscan.io/tx/'}${txHash}`
}

// Timing ABI — inline to avoid polluting the shared abis file 

const MONTHLY_TIMING_ABI = [
  {
    name: 'lastMonthlyDepositTime',
    type: 'function',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    name: 'missedMonths',
    type: 'function',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
] as const

// Constants 

/** 30 days in seconds — must match the value in the PersonalFund contract. */
const MONTHLY_INTERVAL = 2_592_000

// Types 

export type MonthlyDepositStatus = 'idle' | 'approving' | 'depositing' | 'success' | 'error'

interface UseMonthlyDepositOptions {
  fundAddress:   `0x${string}` | null
  /** Net monthly deposit amount in USDC wei (6 decimals) as stored on-chain. */
  monthlyAmount: bigint
}

// Error extraction

function extractMsg(err: unknown): string {
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

export function useMonthlyDeposit({ fundAddress, monthlyAmount }: UseMonthlyDepositOptions) {
  const chainId                = useChainId()
  const publicClient           = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const toast                  = useToast()
  const contracts              = getContractAddresses(chainId)

  // Gross approve amount is calculated by useProtocolFee so we never
  // hard-code fee arithmetic in this hook.
  const { approveAmount } = useProtocolFee()

  const [status,   setStatus]   = useState<MonthlyDepositStatus>('idle')
  const [txHash,   setTxHash]   = useState<`0x${string}` | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // On-chain timing reads

  const { data: lastDepositTime, refetch: refetchTime } = useReadContract({
    address:      fundAddress ?? undefined,
    abi:          MONTHLY_TIMING_ABI,
    functionName: 'lastMonthlyDepositTime',
    query:        { enabled: !!fundAddress },
  })

  const { data: missedMonths } = useReadContract({
    address:      fundAddress ?? undefined,
    abi:          MONTHLY_TIMING_ABI,
    functionName: 'missedMonths',
    query:        { enabled: !!fundAddress },
  })

  const lastTime    = Number(lastDepositTime ?? 0n)
  const nextTime    = lastTime + MONTHLY_INTERVAL
  const nowSec      = Math.floor(Date.now() / 1000)
  const canDeposit  = nowSec >= nextTime
  const secondsLeft = Math.max(nextTime - nowSec, 0)

  // Deposit 

  const deposit = useCallback(async () => {
    if (!walletClient || !publicClient) { toast.error('Wallet not connected');                 return }
    if (!fundAddress)                   { toast.error('Fund not found');                       return }
    if (!contracts)                     { toast.error('Unsupported network');                  return }
    if (!canDeposit)                    { toast.error('Monthly deposit not yet available');    return }

    setStatus('approving')
    setErrorMsg(null)
    setTxHash(null)

    try {
      // approveAmount() returns monthlyAmount gross-up including the protocol
      // fee + 1 USDC rounding buffer, sourced from the Treasury on-chain.
      const grossApprove = approveAmount(monthlyAmount)

      const gasA = await publicClient.estimateContractGas({
        address:  contracts.usdc,
        abi:      ERC20_ABI,
        functionName: 'approve',
        args:     [fundAddress, grossApprove],
        account:  walletClient.account,
      }).catch(() => undefined)

      const approveTx = await walletClient.writeContract({
        address:  contracts.usdc,
        abi:      ERC20_ABI,
        functionName: 'approve',
        args:     [fundAddress, grossApprove],
        ...(gasA ? { gas: gasA * 120n / 100n } : {}),
      })
      toast.info('Approval sent — waiting for confirmation…')
      await publicClient.waitForTransactionReceipt({ hash: approveTx })

      setStatus('depositing')

      // _maxFeeBP must be passed to depositMonthly — it is a slippage guard
      // that causes the contract to revert if the Treasury fee exceeds the
      // value the user accepted. We use MAX_FEE_BPS (500 = 5%) per product spec.
      const gasD = await publicClient.estimateContractGas({
        address:  fundAddress,
        abi:      PERSONAL_FUND_ABI,
        functionName: 'depositMonthly',
        args:     [MAX_FEE_BPS],
        account:  walletClient.account,
      }).catch(() => undefined)

      const depositTx = await walletClient.writeContract({
        address:  fundAddress,
        abi:      PERSONAL_FUND_ABI,
        functionName: 'depositMonthly',
        args:     [MAX_FEE_BPS],
        ...(gasD ? { gas: gasD * 120n / 100n } : {}),
      })

      setTxHash(depositTx)
      toast.info('Deposit sent — confirming…')
      await publicClient.waitForTransactionReceipt({ hash: depositTx })

      setStatus('success')
      toast.success('Monthly deposit complete! 🎉')
      void refetchTime()
    } catch (err) {
      const msg = extractMsg(err)
      setStatus('error')
      setErrorMsg(msg)
      toast.error(msg)
    }
  }, [
    walletClient, publicClient,
    fundAddress, monthlyAmount,
    contracts, canDeposit,
    approveAmount, toast, refetchTime,
  ])

  // Reset 

  const reset = useCallback(() => {
    setStatus('idle')
    setTxHash(null)
    setErrorMsg(null)
  }, [])

  return {
    status,
    txHash,
    errorMsg,
    canDeposit,
    secondsLeft,
    missedMonths: Number(missedMonths ?? 0n),
    isLoading:    status === 'approving' || status === 'depositing',
    deposit,
    reset,
    explorerUrl: txHash ? getExplorerUrl(chainId, txHash) : null,
  }
}