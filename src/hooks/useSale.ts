/**
 * useSale.ts
 *
 * Hook principal de la página de venta. Responsabilidades:
 *  1. Leer estado on-chain con wagmi (useReadContracts)
 *  2. Exponer mutaciones tipadas: approveUSDC, buyTokens, claimTokens
 *  3. Sincronizar el saleStore después de cada lectura y escritura
 *
 * ⚠️  Este hook NO define ABIs, addresses, parsers ni formatters.
 *     Todo eso vive en saleService.ts — importalo desde ahí.
 *
 */

import { useCallback, useEffect } from 'react'
import {
  useConnection,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi'
import { parseUnits, formatUnits, type Address, type Hash } from 'viem'
import { useQueryClient } from '@tanstack/react-query'
import {
  SALE_ADDRESS,
  USDC_ADDRESS,
  SALE_ABI,
  USDC_ABI,
  parseRound,
  parsePurchase,
  calcTokensOut  as calcTokensOutPure,
  needsApproval  as needsApprovalPure,
  formatUSDC,
  formatETRF,
} from '@/services/saleService'
import { useSaleStore } from '@/stores/saleStore'
import type { RoundInfo, UserPurchase } from '@/sale/types'

export { formatUSDC, formatETRF, SALE_ABI, SALE_ADDRESS, USDC_ADDRESS }
export interface UseSaleReturn {
  round:         RoundInfo | null
  purchase:      UserPurchase | null
  usdcBalance:   string
  usdcAllowance: string
  userAddress:   Address | undefined

  calcTokensOut: (amount: string) => string
  needsApproval: (amount: string) => boolean

  refetch:       () => void
  txHash:        Hash | undefined
  isPending:     boolean
  isConfirming:  boolean
  isConfirmed:   boolean
  error:         Error | null

  approveUSDC:   (usdcAmount: string) => Promise<Hash>
  buyTokens:     (usdcAmount: string) => Promise<Hash>
  claimTokens:   () => Promise<Hash>
}

export function useSale(): UseSaleReturn {
  // ── Wallet ──
  const { address, isConnected } = useConnection()
  const queryClient = useQueryClient()
  const {
    setRound,
    setPurchase,
    setBalances,
    setTxPending,
    setTxConfirming,
    setTxConfirmed,
    setTxError,
    resetUser,
  } = useSaleStore()

  const { data: reads, refetch } = useReadContracts({
    contracts: [
      {
        address:      SALE_ADDRESS,
        abi:          SALE_ABI,
        functionName: 'getCurrentRound',
      },
      {
        address:      SALE_ADDRESS,
        abi:          SALE_ABI,
        functionName: 'getUserPurchase',
        args:         address ? [address] : undefined,
      },
      {
        address:      USDC_ADDRESS,
        abi:          USDC_ABI,
        functionName: 'balanceOf',
        args:         address ? [address] : undefined,
      },
      {
        address:      USDC_ADDRESS,
        abi:          USDC_ABI,
        functionName: 'allowance',
        args:         address ? [address, SALE_ADDRESS] : undefined,
      },
    ],
    query: { enabled: Boolean(isConnected && address) },
  })

  const rawRound     = reads?.[0]?.result as any
  const rawPurchase  = reads?.[1]?.result as any
  const rawUsdcBal   = reads?.[2]?.result as bigint | undefined
  const rawAllowance = reads?.[3]?.result as bigint | undefined

  const round: RoundInfo | null = rawRound    ? parseRound(rawRound)       : null
  const purchase: UserPurchase | null = rawPurchase ? parsePurchase(rawPurchase) : null
  const usdcBalance   = rawUsdcBal   ? formatUnits(rawUsdcBal,   6) : '0'
  const usdcAllowance = rawAllowance ? formatUnits(rawAllowance,  6) : '0'

  useEffect(() => {
    setRound(round)
  }, [round, setRound])

  useEffect(() => {
    setPurchase(purchase)
  }, [purchase, setPurchase])

  useEffect(() => {
    setBalances(usdcBalance, usdcAllowance, '0') // etrfBalance: leer si se necesita en UI
  }, [usdcBalance, usdcAllowance, setBalances])

  // Reset del store al desconectar wallet
  useEffect(() => {
    if (!isConnected) resetUser()
  }, [isConnected, resetUser])

  const approve     = useWriteContract()
  const buy         = useWriteContract()
  const claim       = useWriteContract()
  const txHash = buy.data ?? approve.data ?? claim.data
  const isPending    = approve.isPending    || buy.isPending    || claim.isPending
  const error        = approve.error        || buy.error        || claim.error
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash: txHash })

  useEffect(() => {
    if (isPending && txHash)   setTxConfirming(txHash)
    else if (isPending)        setTxPending()
  }, [isPending, txHash, setTxPending, setTxConfirming])

  useEffect(() => {
    if (isConfirmed && txHash) setTxConfirmed(txHash)
  }, [isConfirmed, txHash, setTxConfirmed])

  useEffect(() => {
    if (error) setTxError(error.message)
  }, [error, setTxError])

  const calcTokensOut = useCallback(
    (usdcAmount: string) => calcTokensOutPure(usdcAmount, round?.price ?? 0n),
    [round?.price],
  )

  const needsApproval = useCallback(
    (usdcAmount: string) => needsApprovalPure(usdcAmount, rawAllowance ?? 0n),
    [rawAllowance],
  )

  // ── Acciones públicas ──
  const approveUSDC = useCallback(async (usdcAmount: string): Promise<Hash> => {
    const hash = await approve.mutateAsync({
      address:      USDC_ADDRESS,
      abi:          USDC_ABI,
      functionName: 'approve',
      args:         [SALE_ADDRESS, parseUnits(usdcAmount, 6)],
    })
    await queryClient.invalidateQueries()
    return hash
  }, [approve.mutateAsync, queryClient])

  const buyTokens = useCallback(async (usdcAmount: string): Promise<Hash> => {
    const hash = await buy.mutateAsync({
      address:      SALE_ADDRESS,
      abi:          SALE_ABI,
      functionName: 'buy',
      args:         [parseUnits(usdcAmount, 6)],
    })
    await queryClient.invalidateQueries()
    return hash
  }, [buy.mutateAsync, queryClient])

  const claimTokens = useCallback(async (): Promise<Hash> => {
    const hash = await claim.mutateAsync({
      address:      SALE_ADDRESS,
      abi:          SALE_ABI,
      functionName: 'claim',
      args:         [],
    })
    await queryClient.invalidateQueries()
    return hash
  }, [claim.mutateAsync, queryClient])

  return {
    round,
    purchase,
    usdcBalance,
    usdcAllowance,
    userAddress:   address,
    calcTokensOut,
    needsApproval,
    refetch,
    txHash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
    approveUSDC,
    buyTokens,
    claimTokens,
  }
}