
import { useCallback, useEffect }          from 'react'
import { useQuery, useQueryClient }        from '@tanstack/react-query'
import { getDefaultSaleChainId }           from '@/sale/saleAddresses'
import {
  useAccount,
  useSwitchChain,
  useReadContracts,
}                                          from 'wagmi'
import { type Address, type Hash, parseUnits, formatUnits } from 'viem'
import {
  fetchCurrentRoundFromBackend,
  fetchUserPurchaseFromBackend,
  verifyPurchaseOnBackend,
  convertRoundResponse,
  convertPurchaseResponse,
  getSaleAddress,
  getUSDCAddress,
  isSaleSupported,
  SALE_ABI,
  USDC_ABI,
  formatUSDC,
  formatETRF,
  calcTokensOut as calcTokensOutPure,
  needsApproval as needsApprovalPure,
}                                          from './saleService'
import { useSaleStore }                    from '@/sale/saleStore'
import { useSaleWriter }                   from './useSaleWriter'
import type { SaleOp }                     from './useSaleWriter'
import type { RoundInfo, UserPurchase }    from './types'
import { useAuthStore }                    from '@/stores/authStore'

export { formatUSDC, formatETRF }
export type { SaleOp }

// ─── Public interface ─────────────────────────────────────────────────────────

export interface UseSaleReturn {
  // ── Data ──
  round:           RoundInfo | null
  purchase:        UserPurchase | null
  usdcBalance:     string
  usdcAllowance:   string
  userAddress:     Address | undefined
  currentChainId:  number | undefined

  // ── Loading / error ──
  isRoundLoading:  boolean
  isUserLoading:   boolean
  roundError:      Error | null
  userError:       Error | null

  // ── Chain ──
  isWrongChain:      boolean
  isSaleAvailable:   boolean
  switchToSaleChain: () => void
  isSwitchingChain:  boolean

  // ── Helpers ──
  calcTokensOut: (usdcAmount: string) => string
  needsApproval: (usdcAmount: string) => boolean
  refetch:       () => void

  // ── Tx state ──
  txHash:       Hash | undefined
  activeOp:     SaleOp | null     // which operation is in flight
  isPending:    boolean
  isConfirming: boolean
  isConfirmed:  boolean
  error:        Error | null

  // ── Actions ──
  resetTxState: () => void
  approveUSDC:  (usdcAmount: string) => Promise<Hash>
  buyTokens:    (usdcAmount: string) => Promise<Hash>
  claimTokens:  () => Promise<Hash>
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSale(): UseSaleReturn {
  // useAccount is the canonical wagmi hook — exposes address, isConnected, chainId
  const { address, isConnected, chainId: connectedChainId } = useAccount()
  const switchChain  = useSwitchChain()
  const queryClient  = useQueryClient()

  const jwt = useAuthStore(s => s.sessions.sale?.accessToken ?? null)

  // ── Chain availability ───────────────────────────────────────────────────────
  const isSaleAvailable = isConnected && !!connectedChainId && isSaleSupported(connectedChainId)
  const isWrongChain    = isConnected && !!connectedChainId && !isSaleSupported(connectedChainId)

  // ── Round (public, no JWT required) ─────────────────────────────────────────
  const {
    data:     backendRound,
    isLoading: isRoundLoading,
    error:     roundError,
    refetch:   refetchRound,
  } = useQuery({
    queryKey: ['sale', 'round'],
    queryFn:  () => fetchCurrentRoundFromBackend(),
    staleTime:       30_000,
    refetchInterval: 60_000,
  })

  const round: RoundInfo | null = backendRound
    ? convertRoundResponse(backendRound)
    : null

  // ── User purchase (requires JWT + correct chain) ─────────────────────────────
  const {
    data:     backendPurchase,
    isLoading: isUserLoading,
    error:     userError,
    refetch:   refetchUserPurchase,
  } = useQuery({
    queryKey: ['sale', 'my-purchase', jwt],
    queryFn:  () => fetchUserPurchaseFromBackend(jwt!),
    enabled:  !!jwt && isSaleAvailable,
    staleTime: 10_000,
  })

  const purchase: UserPurchase | null = backendPurchase
    ? convertPurchaseResponse(backendPurchase)
    : null

  // ── On-chain USDC reads ──────────────────────────────────────────────────────
  const usdcContractBase = {
    address: getUSDCAddress(connectedChainId ?? 0) as Address,
    abi:     USDC_ABI,
  } as const

  const saleAddress = getSaleAddress(connectedChainId ?? 0)

  const { data: usdcData, queryKey: usdcQueryKey } = useReadContracts({
    contracts: [
      { ...usdcContractBase, functionName: 'balanceOf', args: [address ?? '0x0'] },
      { ...usdcContractBase, functionName: 'allowance', args: [address ?? '0x0', saleAddress] },
    ],
    query: {
      enabled:   !!address && isSaleAvailable,
      staleTime: 15_000,
    },
  })

  const usdcBalance   = usdcData?.[0]?.result != null
    ? formatUnits(usdcData[0].result as bigint, 6)
    : '0'

  const usdcAllowance = usdcData?.[1]?.result != null
    ? formatUnits(usdcData[1].result as bigint, 6)
    : '0'

  // ── Sync to saleStore ────────────────────────────────────────────────────────
  // The store acts as a snapshot for components outside the hook tree
  // (e.g. ETRFTokenCard in a different subtree). Keep writes minimal.
  useEffect(() => { useSaleStore.getState().setRound(round)       }, [round])
  useEffect(() => { useSaleStore.getState().setPurchase(purchase) }, [purchase])
  useEffect(() => {
    useSaleStore.getState().setBalances(usdcBalance, usdcAllowance, '0')
  }, [usdcBalance, usdcAllowance])

  // ── Single writer — replaces triple useWriteContract ────────────────────────
  const saleWriter = useSaleWriter()

  // ── Contract actions ─────────────────────────────────────────────────────────

  const approveUSDC = useCallback(async (usdcAmount: string): Promise<Hash> => {
    if (!connectedChainId || !isSaleSupported(connectedChainId)) {
      throw new Error('Sale not available on this chain')
    }

    const hash = await saleWriter.write('approve', {
      chainId:      connectedChainId,
      address:      getUSDCAddress(connectedChainId),
      abi:          USDC_ABI,
      functionName: 'approve',
      args:         [getSaleAddress(connectedChainId), parseUnits(usdcAmount, 6)],
    })

    await queryClient.invalidateQueries({ queryKey: usdcQueryKey })

    return hash
  }, [saleWriter, connectedChainId, queryClient, usdcQueryKey])

  const buyTokens = useCallback(async (usdcAmount: string): Promise<Hash> => {
    if (!connectedChainId || !isSaleSupported(connectedChainId)) {
      throw new Error('Sale not available on this chain')
    }

    const hash = await saleWriter.write('buy', {
      chainId:      connectedChainId,
      address:      getSaleAddress(connectedChainId),
      abi:          SALE_ABI,
      functionName: 'buy',
      args:         [parseUnits(usdcAmount, 6)],
    })

    // Fire-and-forget backend notification.
    // The indexer covers this if the call fails.
    if (jwt) {
      verifyPurchaseOnBackend(hash, jwt).catch(() => {})
    }

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: usdcQueryKey }),
      queryClient.invalidateQueries({ queryKey: ['sale', 'my-purchase', jwt] }),
    ])
    await refetchUserPurchase()

    return hash
  }, [saleWriter, connectedChainId, jwt, queryClient, usdcQueryKey, refetchUserPurchase])

  const claimTokens = useCallback(async (): Promise<Hash> => {
    if (!connectedChainId || !isSaleSupported(connectedChainId)) {
      throw new Error('Sale not available on this chain')
    }

    const hash = await saleWriter.write('claim', {
      chainId:      connectedChainId,
      address:      getSaleAddress(connectedChainId),
      abi:          SALE_ABI,
      functionName: 'claim',
      args:         [],
    })

    await queryClient.invalidateQueries({ queryKey: ['sale', 'my-purchase', jwt] })
    await refetchUserPurchase()

    return hash
  }, [saleWriter, connectedChainId, jwt, queryClient, refetchUserPurchase])

  // ── Derived helpers ──────────────────────────────────────────────────────────

  const calcTokensOut = useCallback(
    (usdcAmount: string) => calcTokensOutPure(usdcAmount, round?.price ?? 0n),
    [round?.price],
  )

  const needsApproval = useCallback(
    (usdcAmount: string) => needsApprovalPure(usdcAmount, parseUnits(usdcAllowance, 6)),
    [usdcAllowance],
  )

  const switchToSaleChain = useCallback(() => {
    switchChain.mutate({ chainId: getDefaultSaleChainId() })
  }, [switchChain])

  const refetch = useCallback(() => {
    refetchRound()
    refetchUserPurchase()
  }, [refetchRound, refetchUserPurchase])

  // ── Return ───────────────────────────────────────────────────────────────────

  return {
    round,
    purchase,
    usdcBalance,
    usdcAllowance,
    userAddress:    address,
    currentChainId: connectedChainId,

    isRoundLoading,
    isUserLoading,
    roundError,
    userError,

    isWrongChain,
    isSaleAvailable,
    switchToSaleChain,
    isSwitchingChain: switchChain.isPending,

    calcTokensOut,
    needsApproval,
    refetch,

    txHash:       saleWriter.txHash,
    activeOp:     saleWriter.activeOp,
    isPending:    saleWriter.isPending,
    isConfirming: saleWriter.isConfirming,
    isConfirmed:  saleWriter.isConfirmed,
    error:        saleWriter.error,

    resetTxState: saleWriter.reset,

    approveUSDC,
    buyTokens,
    claimTokens,
  }
}