/**
 * Drives the extra (one-off) deposit flow for an existing PersonalFund,
 * including the 24-hour grace-period reclaim mechanism.
 */

import { useState, useCallback }                         from 'react'
import { usePublicClient, useWalletClient, useChainId }  from 'wagmi'
import { useReadContracts }                              from 'wagmi'
import { getContractAddresses }                          from '@/config/addresses'
import { PERSONAL_FUND_ABI, ERC20_ABI }                 from '@/config/abis'
import { useToast }                                      from '@/stores/uiStore'
import { toUsdcBigInt }                                  from '@/lib/calculator'
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

// Constants

/** 24 hours in seconds — must match the grace period in the PersonalFund contract. */
const EXTRA_GRACE = 86_400

// Inline ABI for extra-deposit state reads 
// Kept inline to avoid polluting the shared abis file with narrow-use entries.

const EXTRA_DEPOSIT_ABI = [
  { name: 'lastExtraDepositTime',  type: 'function', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { name: 'lastExtraDepositGross', type: 'function', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { name: 'lastExtraDepositNet',   type: 'function', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { name: 'extraReclaimUsed',      type: 'function', inputs: [], outputs: [{ type: 'bool'    }], stateMutability: 'view' },
] as const

// Types

export type ExtraDepositStatus = 'idle' | 'approving' | 'depositing' | 'reclaiming' | 'success' | 'error'

interface UseExtraDepositOptions {
  fundAddress: `0x${string}` | null
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

export function useExtraDeposit({ fundAddress }: UseExtraDepositOptions) {
  const chainId                = useChainId()
  const publicClient           = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const toast                  = useToast()
  const contracts              = getContractAddresses(chainId)

  // Gross approve amount is calculated by useProtocolFee so we never
  // hard-code fee arithmetic in this hook.
  const { approveAmount } = useProtocolFee()

  const [status,   setStatus]   = useState<ExtraDepositStatus>('idle')
  const [txHash,   setTxHash]   = useState<`0x${string}` | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // On-chain state reads 

  const { data: results, refetch } = useReadContracts({
    contracts: fundAddress
      ? [
          { address: fundAddress, abi: EXTRA_DEPOSIT_ABI, functionName: 'lastExtraDepositTime'  },
          { address: fundAddress, abi: EXTRA_DEPOSIT_ABI, functionName: 'lastExtraDepositGross' },
          { address: fundAddress, abi: EXTRA_DEPOSIT_ABI, functionName: 'lastExtraDepositNet'   },
          { address: fundAddress, abi: EXTRA_DEPOSIT_ABI, functionName: 'extraReclaimUsed'      },
        ]
      : [],
    query: { enabled: !!fundAddress },
  })

  const lastExtraTime    = Number((results?.[0]?.status === 'success' ? results[0].result : 0n) as bigint)
  const lastExtraGross   =        (results?.[1]?.status === 'success' ? results[1].result : 0n) as bigint
  const lastExtraNet     =        (results?.[2]?.status === 'success' ? results[2].result : 0n) as bigint
  const reclaimUsed      =        (results?.[3]?.status === 'success' ? results[3].result : true) as boolean
  const nowSec           = Math.floor(Date.now() / 1000)
  const graceEnd         = lastExtraTime + EXTRA_GRACE
  const inGrace          = !reclaimUsed && lastExtraTime > 0 && nowSec <= graceEnd && lastExtraNet > 0n
  const graceSecondsLeft = Math.max(graceEnd - nowSec, 0)

  // Deposit 

  const deposit = useCallback(async (amountUsdc: number) => {
    if (!walletClient || !publicClient) { toast.error('Wallet not connected');  return }
    if (!fundAddress)                   { toast.error('Fund not found');        return }
    if (!contracts)                     { toast.error('Unsupported network');   return }
    if (amountUsdc < 1)                 { toast.error('Minimum amount: 1 USDC'); return }

    const amountWei = toUsdcBigInt(amountUsdc)

    setStatus('approving')
    setErrorMsg(null)
    setTxHash(null)

    try {
      // approveAmount() returns amountWei gross-up including the protocol
      // fee + 1 USDC rounding buffer, sourced from the Treasury on-chain.
      const grossApprove = approveAmount(amountWei)

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

      // _maxFeeBP must be the second argument of depositExtra.
      // It is a slippage guard: the contract reverts if Treasury fee > _maxFeeBP.
      // We use MAX_FEE_BPS (500 = 5%) per product spec.
      const gasD = await publicClient.estimateContractGas({
        address:  fundAddress,
        abi:      PERSONAL_FUND_ABI,
        functionName: 'depositExtra',
        args:     [amountWei, MAX_FEE_BPS],
        account:  walletClient.account,
      }).catch(() => undefined)

      const depositTx = await walletClient.writeContract({
        address:  fundAddress,
        abi:      PERSONAL_FUND_ABI,
        functionName: 'depositExtra',
        args:     [amountWei, MAX_FEE_BPS],
        ...(gasD ? { gas: gasD * 120n / 100n } : {}),
      })

      setTxHash(depositTx)
      toast.info('Extra deposit sent — confirming…')
      await publicClient.waitForTransactionReceipt({ hash: depositTx })

      setStatus('success')
      toast.success(`$${amountUsdc.toFixed(2)} USDC deposited! You have 24 h to reclaim if needed.`)
      void refetch()
    } catch (err) {
      const msg = extractMsg(err)
      setStatus('error')
      setErrorMsg(msg)
      toast.error(msg)
    }
  }, [
    walletClient, publicClient,
    fundAddress, contracts,
    approveAmount, toast, refetch,
  ])

  // Reclaim (within 24-hour grace period, 1% penalty) 

  const reclaim = useCallback(async () => {
    if (!walletClient || !publicClient) { toast.error('Wallet not connected');       return }
    if (!fundAddress)                   { toast.error('Fund not found');             return }
    if (!inGrace)                       { toast.error('Grace period has expired');   return }

    setStatus('reclaiming')
    setErrorMsg(null)
    setTxHash(null)

    try {
      // reclaimExtraDeposit has no parameters.
      const gasR = await publicClient.estimateContractGas({
        address:  fundAddress,
        abi:      PERSONAL_FUND_ABI,
        functionName: 'reclaimExtraDeposit',
        account:  walletClient.account,
      }).catch(() => undefined)

      const tx = await walletClient.writeContract({
        address:  fundAddress,
        abi:      PERSONAL_FUND_ABI,
        functionName: 'reclaimExtraDeposit',
        ...(gasR ? { gas: gasR * 120n / 100n } : {}),
      })

      setTxHash(tx)
      toast.info('Reclaiming deposit — confirming…')
      await publicClient.waitForTransactionReceipt({ hash: tx })

      setStatus('success')
      toast.success('Deposit reclaimed (1% penalty deducted)')
      void refetch()
    } catch (err) {
      const msg = extractMsg(err)
      setStatus('error')
      setErrorMsg(msg)
      toast.error(msg)
    }
  }, [walletClient, publicClient, fundAddress, inGrace, toast, refetch])

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
    inGrace,
    graceSecondsLeft,
    lastExtraGross,
    lastExtraNet,
    isLoading:  status === 'approving' || status === 'depositing' || status === 'reclaiming',
    deposit,
    reclaim,
    reset,
    explorerUrl: txHash ? getExplorerUrl(chainId, txHash) : null,
  }
}