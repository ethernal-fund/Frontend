import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getDefaultSaleChainId } from '@/sale/saleAddresses'
import {
  useAccount,
  useSwitchChain,
  useReadContracts,
} from 'wagmi'
import { type Address, type Hash, parseUnits, formatUnits, zeroAddress } from 'viem'
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
} from './saleService'
import { useSaleStore } from '@/sale/saleStore'
import { useSaleWriter } from './useSaleWriter'
import type { SaleOp } from './useSaleWriter'
import type { RoundInfo, UserPurchase } from './types'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/stores/uiStore'

export { formatUSDC, formatETRF }
export type { SaleOp }

const ROUND_QUERY_OPTIONS = {
  staleTime: 30_000,
  gcTime: 5 * 60_000,
  refetchInterval: 60_000,
  retry: 3,
  retryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, 10_000),
} as const

const PURCHASE_QUERY_OPTIONS = {
  staleTime: 10_000,
  gcTime: 60_000,
  retry: 1,
} as const

const LOADING_TIMEOUT_MS = 15_000
const TX_CONFIRMATION_TIMEOUT_MS = 120_000

export interface UseSaleReturn {
  // Data
  round:           RoundInfo | null
  purchase:        UserPurchase | null
  usdcBalance:     string
  usdcAllowance:   string
  userAddress:     Address | undefined
  currentChainId:  number | undefined

  // Loading / error
  isRoundLoading:  boolean
  isUserLoading:   boolean
  roundError:      Error | null
  userError:       Error | null
  isRoundTimeout:  boolean

  // Chain
  isWrongChain:      boolean
  isSaleAvailable:   boolean
  switchToSaleChain: () => void
  isSwitchingChain:  boolean

  // Helpers
  calcTokensOut: (usdcAmount: string) => string
  needsApproval: (usdcAmount: string) => boolean
  refetch:       () => void

  // Tx state
  txHash:       Hash | undefined
  activeOp:     SaleOp | null
  isPending:    boolean
  isConfirming: boolean
  isConfirmed:  boolean
  error:        Error | null

  // Actions
  resetTxState: () => void
  approveUSDC:  (usdcAmount: string) => Promise<Hash>
  buyTokens:    (usdcAmount: string) => Promise<Hash>
  claimTokens:  () => Promise<Hash>
}

function getSafeChainId(chainId: number | undefined): number {
  return chainId && chainId !== 0 ? chainId : 0
}

export function useSale(): UseSaleReturn {
  const { address, isConnected, chainId: connectedChainId } = useAccount()
  const switchChain = useSwitchChain()
  const queryClient = useQueryClient()
  const toast       = useToast()  

  const jwt = useAuthStore((s) => s.sessions.sale?.accessToken ?? null)
  const [isRoundTimeout, setIsRoundTimeout] = useState(false)
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)  // ← CORREGIDO: inicializar como null
  const confirmationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)  // ← CORREGIDO

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current)
      if (confirmationTimeoutRef.current) clearTimeout(confirmationTimeoutRef.current)
    }
  }, [])

  const safeChainId     = getSafeChainId(connectedChainId)
  const isSaleAvailable = isConnected && !!connectedChainId && isSaleSupported(connectedChainId)
  const isWrongChain    = isConnected && !!connectedChainId && !isSaleSupported(connectedChainId)

  // Reset purchase and round when chain becomes unsupported
  useEffect(() => {
    if (connectedChainId && !isSaleSupported(connectedChainId)) {
      useSaleStore.getState().setPurchase(null)
      useSaleStore.getState().setRound(null)
    }
  }, [connectedChainId])

  const {
    data: backendRound,
    isLoading: isRoundLoading,
    error: roundError,
    refetch: refetchRound,
  } = useQuery({
    queryKey: ['sale', 'round', safeChainId],
    queryFn: async () => {
      setIsRoundTimeout(false)
      return fetchCurrentRoundFromBackend()
    },
    ...ROUND_QUERY_OPTIONS,
  })

  // Round loading timeout detection
  useEffect(() => {
    if (isRoundLoading) {
      loadingTimeoutRef.current = setTimeout(() => {
        if (isRoundLoading) {
          setIsRoundTimeout(true)
          toast.warning(  // ← CORREGIDO: usar toast.warning
            'The sale round is taking longer than expected to load. Check your connection.',
            8000
          )
        }
      }, LOADING_TIMEOUT_MS)
    } else {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current)
        loadingTimeoutRef.current = null
      }
    }
    return () => {
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current)
    }
  }, [isRoundLoading, toast])

  const round: RoundInfo | null = backendRound
    ? convertRoundResponse(backendRound)
    : null

  const {
    data: backendPurchase,
    isLoading: isUserLoading,
    error: userError,
    refetch: refetchUserPurchase,
  } = useQuery({
    queryKey: ['sale', 'my-purchase', jwt, safeChainId],
    queryFn: () => {
      if (!jwt) throw new Error('No authentication token')
      return fetchUserPurchaseFromBackend(jwt)
    },
    enabled: !!jwt && !!connectedChainId && isSaleSupported(connectedChainId),
    ...PURCHASE_QUERY_OPTIONS,
  })

  const purchase: UserPurchase | null = backendPurchase
    ? convertPurchaseResponse(backendPurchase)
    : null

  // Reset purchase when JWT becomes invalid
  useEffect(() => {
    if (!jwt) {
      useSaleStore.getState().setPurchase(null)
    }
  }, [jwt])

  const usdcAddress = getUSDCAddress(safeChainId)
  const saleAddress = getSaleAddress(safeChainId)

  const {
    data: usdcData,
    queryKey: usdcQueryKey,
    refetch: refetchUsdc,
  } = useReadContracts({
    contracts: [
      {
        address: usdcAddress,
        abi: USDC_ABI,
        functionName: 'balanceOf',
        args: [address ?? zeroAddress],
      },
      {
        address: usdcAddress,
        abi: USDC_ABI,
        functionName: 'allowance',
        args: [address ?? zeroAddress, saleAddress],
      },
    ],
    query: {
      enabled: !!address && !!connectedChainId && isSaleSupported(connectedChainId),
      staleTime: 15_000,
      gcTime: 60_000,
      retry: 2,
    },
  })

  const usdcBalance = usdcData?.[0]?.result != null
    ? formatUnits(usdcData[0].result as bigint, 6)
    : '0'

  const usdcAllowance = usdcData?.[1]?.result != null
    ? formatUnits(usdcData[1].result as bigint, 6)
    : '0'

  useEffect(() => {
    useSaleStore.getState().setRound(round)
  }, [round])

  useEffect(() => {
    useSaleStore.getState().setPurchase(purchase)
  }, [purchase])

  useEffect(() => {
    useSaleStore.getState().setBalances(usdcBalance, usdcAllowance, '0')
  }, [usdcBalance, usdcAllowance])

  const saleWriter = useSaleWriter()

  // Monitor transaction confirmation timeout
  useEffect(() => {
    if (saleWriter.isConfirming && saleWriter.txHash) {
      confirmationTimeoutRef.current = setTimeout(() => {
        if (saleWriter.isConfirming) {
          toast.warning(  // ← CORREGIDO: usar toast.warning
            'Transaction confirmation is taking longer than expected. Check the explorer for status.',
            10000
          )
        }
      }, TX_CONFIRMATION_TIMEOUT_MS)
    } else {
      if (confirmationTimeoutRef.current) {
        clearTimeout(confirmationTimeoutRef.current)
        confirmationTimeoutRef.current = null
      }
    }
    return () => {
      if (confirmationTimeoutRef.current) clearTimeout(confirmationTimeoutRef.current)
    }
  }, [saleWriter.isConfirming, saleWriter.txHash, toast])

  const approveUSDC = useCallback(async (usdcAmount: string): Promise<Hash> => {
    if (!connectedChainId || !isSaleSupported(connectedChainId)) {
      throw new Error('Sale not available on this chain')
    }

    const amountWei = parseUnits(usdcAmount, 6)
    const usdcAddr  = getUSDCAddress(connectedChainId)
    const saleAddr  = getSaleAddress(connectedChainId)

    const hash      = await saleWriter.write('approve', {
      chainId: connectedChainId,
      address: usdcAddr,
      abi: USDC_ABI,
      functionName: 'approve',
      args: [saleAddr, amountWei],
    })

    // Invalidate queries after approval
    await queryClient.invalidateQueries({ queryKey: usdcQueryKey })

    return hash
  }, [saleWriter, connectedChainId, queryClient, usdcQueryKey])

  const buyTokens = useCallback(async (usdcAmount: string): Promise<Hash> => {
    if (!connectedChainId || !isSaleSupported(connectedChainId)) {
      throw new Error('Sale not available on this chain')
    }

    const amountWei = parseUnits(usdcAmount, 6)
    const saleAddr = getSaleAddress(connectedChainId)

    const hash = await saleWriter.write('buy', {
      chainId: connectedChainId,
      address: saleAddr,
      abi: SALE_ABI,
      functionName: 'buy',
      args: [amountWei],
    })

    // Fire-and-forget backend notification (non-blocking)
    if (jwt) {
      verifyPurchaseOnBackend(hash, jwt).catch((err) => {
        console.warn('[useSale] Failed to notify backend of purchase:', err)
      })
    }

    // Invalidate all relevant queries
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: usdcQueryKey }),
      queryClient.invalidateQueries({ queryKey: ['sale', 'my-purchase', jwt] }),
      refetchUsdc(),
    ])

    // Refetch user purchase data
    await refetchUserPurchase()

    return hash
  }, [saleWriter, connectedChainId, jwt, queryClient, usdcQueryKey, refetchUserPurchase, refetchUsdc])

  const claimTokens = useCallback(async (): Promise<Hash> => {
    if (!connectedChainId || !isSaleSupported(connectedChainId)) {
      throw new Error('Sale not available on this chain')
    }

    const saleAddr = getSaleAddress(connectedChainId)
    const hash     = await saleWriter.write('claim', {
      chainId: connectedChainId,
      address: saleAddr,
      abi: SALE_ABI,
      functionName: 'claim',
      args: [],
    })

    // Invalidate purchase data after claim
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['sale', 'my-purchase', jwt] }),
      refetchUserPurchase(),
    ])

    return hash
  }, [saleWriter, connectedChainId, jwt, queryClient, refetchUserPurchase])

  const calcTokensOut = useCallback(
    (usdcAmount: string) => calcTokensOutPure(usdcAmount, round?.price ?? 0n),
    [round?.price],
  )

  const needsApproval = useCallback(
    (usdcAmount: string) => {
      const allowanceWei = parseUnits(usdcAllowance, 6)
      return needsApprovalPure(usdcAmount, allowanceWei)
    },
    [usdcAllowance],
  )

  const switchToSaleChain = useCallback(() => {
    switchChain.mutate(
      { chainId: getDefaultSaleChainId() },
      {
        onError: (error) => {
          toast.error(  // ← CORREGIDO: usar toast.error
            error.message.includes('User rejected')
              ? 'You rejected the network switch. Please try again.'
              : 'Failed to switch network. Please do it manually in your wallet.',
            5000
          )
        },
      }
    )
  }, [switchChain, toast])

  const refetch = useCallback(() => {
    refetchRound()
    refetchUserPurchase()
    refetchUsdc()
  }, [refetchRound, refetchUserPurchase, refetchUsdc])

  const resetTxState = useCallback(() => {
    saleWriter.reset()
  }, [saleWriter])

  return {
    round,
    purchase,
    usdcBalance,
    usdcAllowance,
    userAddress: address,
    currentChainId: connectedChainId,

    isRoundLoading,
    isUserLoading,
    roundError,
    userError,
    isRoundTimeout,

    isWrongChain,
    isSaleAvailable,
    switchToSaleChain,
    isSwitchingChain: switchChain.isPending,

    calcTokensOut,
    needsApproval,
    refetch,

    txHash: saleWriter.txHash,
    activeOp: saleWriter.activeOp,
    isPending: saleWriter.isPending,
    isConfirming: saleWriter.isConfirming,
    isConfirmed: saleWriter.isConfirmed,
    error: saleWriter.error,

    resetTxState,

    approveUSDC,
    buyTokens,
    claimTokens,
  }
}