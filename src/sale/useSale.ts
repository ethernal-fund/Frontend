import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getDefaultSaleChainId } from '@/sale/saleAddresses'
import { useConnection, useSwitchChain, useReadContracts } from 'wagmi'
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
  buildSiweMessage,
  fetchSiweNonce,
  verifySiwe,
  setSaleAuthToken,
  refreshAccessToken,
} from './saleService'
import { useSaleStore } from '@/sale/saleStore'
import { useSaleWriter } from './useSaleWriter'
import type { SaleOp } from './useSaleWriter'
import type { RoundInfo, UserPurchase } from './types'
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
const TOKEN_REFRESH_BUFFER_MS = 60_000 // Refrescar token 1 min antes de expirar

export interface UseSaleReturn {
  // Data
  round: RoundInfo | null
  purchase: UserPurchase | null
  usdcBalance: string
  usdcAllowance: string
  userAddress: Address | undefined
  currentChainId: number | undefined

  // Auth
  isAuthenticated: boolean
  jwt: string | null
  login: () => Promise<void>
  logout: () => Promise<void>
  refreshToken: () => Promise<boolean>

  // Loading / error
  isRoundLoading: boolean
  isUserLoading: boolean
  isAuthLoading: boolean
  roundError: Error | null
  userError: Error | null
  authError: string | null
  isRoundTimeout: boolean

  // Chain
  isWrongChain: boolean
  isSaleAvailable: boolean
  switchToSaleChain: () => void
  isSwitchingChain: boolean

  // Helpers
  calcTokensOut: (usdcAmount: string) => string
  needsApproval: (usdcAmount: string) => boolean
  refetch: () => void

  // Tx state
  txHash: Hash | undefined
  activeOp: SaleOp | null
  isPending: boolean
  isConfirming: boolean
  isConfirmed: boolean
  error: Error | null

  // Actions
  resetTxState: () => void
  approveUSDC: (usdcAmount: string) => Promise<Hash>
  buyTokens: (usdcAmount: string) => Promise<Hash>
  claimTokens: () => Promise<Hash>
}

function getSafeChainId(chainId: number | undefined): number | undefined {
  if (!chainId || chainId === 0) return undefined
  return chainId
}

export function useSale(): UseSaleReturn {
  const { address, isConnected, chainId: connectedChainId } = useConnection()
  const switchChain = useSwitchChain()
  const queryClient = useQueryClient()
  const toast = useToast()

  // Estado local para autenticación
  const [jwt, setJwt] = useState<string | null>(() => {
    // Intentar recuperar token del localStorage al iniciar
    const saved = localStorage.getItem('sale_jwt')
    const savedExpiry = localStorage.getItem('sale_jwt_expiry')
    if (saved && savedExpiry && Date.now() < parseInt(savedExpiry, 10)) {
      setSaleAuthToken(saved)
      return saved
    }
    return null
  })
  const [refreshToken, setRefreshToken] = useState<string | null>(() => {
    return localStorage.getItem('sale_refresh_token')
  })
  const [isAuthLoading, setIsAuthLoading]   = useState(false)
  const [authError, setAuthError]           = useState<string | null>(null)
  const [isRoundTimeout, setIsRoundTimeout] = useState(false)

  const loadingTimeoutRef       = useRef<number | undefined>(undefined)
  const confirmationTimeoutRef  = useRef<number | undefined>(undefined)
  const tokenRefreshIntervalRef = useRef<number | undefined>(undefined)
  const safeChainId             = getSafeChainId(connectedChainId)
  const isSaleAvailable         = isConnected && !!connectedChainId && isSaleSupported(connectedChainId)
  const isWrongChain            = isConnected && !!connectedChainId && !isSaleSupported(connectedChainId)

  const login = useCallback(async () => {
    if (!address) {
      toast.error('Please connect your wallet first')
      return
    }

    setIsAuthLoading(true)
    setAuthError(null)

    try {
      // 1. Obtener nonce del backend
      const { nonce, message: backendMessage } = await fetchSiweNonce(address, 'sale')

      // 2. Construir mensaje SIWE (usando la misma función que el backend)
      // NOTA: El backend ya nos devuelve el mensaje completo en fetchSiweNonce,
      // pero para asegurar consistencia, construimos el nuestro también.
      // El mensaje del backend se puede usar directamente, pero construimos
      // el nuestro para verificar consistencia en dev.
      const siweMessage = buildSiweMessage(address, nonce, 'sale')

      // Opcional: Verificar que el mensaje del backend coincida (solo en dev)
      if (import.meta.env.DEV && backendMessage !== siweMessage) {
        console.warn('[useSale] SIWE message mismatch between frontend and backend!')
        console.warn('Frontend:', siweMessage)
        console.warn('Backend:', backendMessage)
      }

      // 3. Solicitar firma al usuario
      const provider = (window as any).ethereum
      if (!provider) {
        throw new Error('No Ethereum provider found. Please install MetaMask or similar.')
      }

      const accounts = await provider.request({ method: 'eth_requestAccounts' })
      const signerAddress = accounts[0].toLowerCase()

      if (signerAddress !== address.toLowerCase()) {
        throw new Error('Connected wallet address mismatch')
      }

      const signature = await provider.request({
        method: 'personal_sign',
        params: [siweMessage, signerAddress],
      })

      // 4. Verificar firma en el backend
      const authResponse = await verifySiwe(siweMessage, signature)

      // 5. Guardar tokens
      setJwt(authResponse.access_token)
      setRefreshToken(authResponse.refresh_token)
      setSaleAuthToken(authResponse.access_token)

      // Persistir en localStorage
      const expiresAt = Date.now() + authResponse.expires_in * 1000
      localStorage.setItem('sale_jwt', authResponse.access_token)
      localStorage.setItem('sale_jwt_expiry', expiresAt.toString())
      localStorage.setItem('sale_refresh_token', authResponse.refresh_token)

      toast.success(`Welcome${authResponse.is_new_user ? '!' : ' back!'}`)

      // 6. Configurar refresh automático
      if (tokenRefreshIntervalRef.current) {
        clearInterval(tokenRefreshIntervalRef.current)
      }
      const refreshInterval = (authResponse.expires_in * 1000) - TOKEN_REFRESH_BUFFER_MS
      if (refreshInterval > 0) {
        tokenRefreshIntervalRef.current = window.setInterval(() => {
          refreshAccessTokenInternal()
        }, refreshInterval)
      }

      // 7. Refrescar datos del usuario
      await queryClient.invalidateQueries({ queryKey: ['sale', 'my-purchase'] })

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed'
      setAuthError(errorMessage)
      toast.error(errorMessage)
      throw err
    } finally {
      setIsAuthLoading(false)
    }
  }, [address, toast, queryClient])

  const refreshAccessTokenInternal = useCallback(async (): Promise<boolean> => {
    if (!refreshToken) return false

    try {
      const response = await refreshAccessToken(refreshToken)
      setJwt(response.access_token)
      setRefreshToken(response.refresh_token)
      setSaleAuthToken(response.access_token)

      const expiresAt = Date.now() + response.expires_in * 1000
      localStorage.setItem('sale_jwt', response.access_token)
      localStorage.setItem('sale_jwt_expiry', expiresAt.toString())
      localStorage.setItem('sale_refresh_token', response.refresh_token)

      return true
    } catch (err) {
      console.error('[useSale] Token refresh failed:', err)
      // Si falla el refresh, forzar logout
      await logoutInternal()
      return false
    }
  }, [refreshToken])

  const logoutInternal = useCallback(async () => {
    try {
      if (refreshToken) {
        // Intentar revocar en el backend (fire-and-forget)
        fetch(`${import.meta.env.VITE_API_URL}/api/v1/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        }).catch(() => {})
      }
    } finally {
      // Limpiar estado local
      setJwt(null)
      setRefreshToken(null)
      setSaleAuthToken(null)
      localStorage.removeItem('sale_jwt')
      localStorage.removeItem('sale_jwt_expiry')
      localStorage.removeItem('sale_refresh_token')

      if (tokenRefreshIntervalRef.current) {
        clearInterval(tokenRefreshIntervalRef.current)
        tokenRefreshIntervalRef.current = undefined
      }

      // Limpiar store
      useSaleStore.getState().resetUser()
    }
  }, [refreshToken])

  const logout = useCallback(async () => {
    await logoutInternal()
    toast.info('Logged out successfully')
  }, [logoutInternal, toast])

  // Limpiar intervalo al desmontar
  useEffect(() => {
    return () => {
      if (tokenRefreshIntervalRef.current) {
        clearInterval(tokenRefreshIntervalRef.current)
      }
    }
  }, [])

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

  // Round loading timeout
  useEffect(() => {
    if (isRoundLoading) {
      loadingTimeoutRef.current = window.setTimeout(() => {
        if (isRoundLoading) {
          setIsRoundTimeout(true)
          toast.warning(
            'The sale round is taking longer than expected to load. Check your connection.',
            8000,
          )
        }
      }, LOADING_TIMEOUT_MS)
    } else {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current)
        loadingTimeoutRef.current = undefined
      }
    }
    return () => {
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current)
    }
  }, [isRoundLoading, toast])

  const round: RoundInfo | null = backendRound ? convertRoundResponse(backendRound) : null

  const {
    data: backendPurchase,
    isLoading: isUserLoading,
    error: userError,
    refetch: refetchUserPurchase,
  } = useQuery({
    queryKey: ['sale', 'my-purchase', jwt, safeChainId],
    queryFn: async () => {
      if (!jwt) throw new Error('No authentication token')
      return fetchUserPurchaseFromBackend()
    },
    enabled: !!jwt && !!connectedChainId && isSaleSupported(connectedChainId),
    ...PURCHASE_QUERY_OPTIONS,
  })

  const purchase: UserPurchase | null = backendPurchase ? convertPurchaseResponse(backendPurchase) : null
  useEffect(() => {
    if (!jwt) {
      useSaleStore.getState().setPurchase(null)
    }
  }, [jwt])

  const usdcAddress = safeChainId ? getUSDCAddress(safeChainId) : zeroAddress
  const saleAddress = safeChainId ? getSaleAddress(safeChainId) : zeroAddress

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

  // Sincronizar con store
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
  useEffect(() => {
    if (saleWriter.isConfirming && saleWriter.txHash) {
      confirmationTimeoutRef.current = window.setTimeout(() => {
        if (saleWriter.isConfirming) {
          toast.warning(
            'Transaction confirmation is taking longer than expected. Check the explorer for status.',
            10000,
          )
        }
      }, TX_CONFIRMATION_TIMEOUT_MS)
    } else {
      if (confirmationTimeoutRef.current) {
        clearTimeout(confirmationTimeoutRef.current)
        confirmationTimeoutRef.current = undefined
      }
    }
    return () => {
      if (confirmationTimeoutRef.current) clearTimeout(confirmationTimeoutRef.current)
    }
  }, [saleWriter.isConfirming, saleWriter.txHash, toast])

  const approveUSDC = useCallback(
    async (usdcAmount: string): Promise<Hash> => {
      if (!connectedChainId || !isSaleSupported(connectedChainId)) {
        throw new Error('Sale not available on this chain')
      }

      const amountWei = parseUnits(usdcAmount, 6)
      const usdcAddr  = getUSDCAddress(connectedChainId)
      const saleAddr  = getSaleAddress(connectedChainId)

      const hash = await saleWriter.write('approve', {
        chainId: connectedChainId,
        address: usdcAddr,
        abi: USDC_ABI,
        functionName: 'approve',
        args: [saleAddr, amountWei],
      })
      await queryClient.invalidateQueries({ queryKey: usdcQueryKey })
      return hash
    },
    [saleWriter, connectedChainId, queryClient, usdcQueryKey],
  )

  const buyTokens = useCallback(
    async (usdcAmount: string): Promise<Hash> => {
      if (!connectedChainId || !isSaleSupported(connectedChainId)) {
        throw new Error('Sale not available on this chain')
      }

      const amountWei = parseUnits(usdcAmount, 6)
      const saleAddr  = getSaleAddress(connectedChainId)
      const hash      = await saleWriter.write('buy', {
        chainId: connectedChainId,
        address: saleAddr,
        abi: SALE_ABI,
        functionName: 'buy',
        args: [amountWei],
      })

      // Notificar al backend (fire-and-forget)
      if (jwt) {
        verifyPurchaseOnBackend(hash).catch((err) => {
          console.warn('[useSale] Failed to notify backend of purchase:', err)
        })
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: usdcQueryKey }),
        queryClient.invalidateQueries({ queryKey: ['sale', 'my-purchase', jwt] }),
        refetchUsdc(),
        refetchUserPurchase(),
      ])
      return hash
    },
    [saleWriter, connectedChainId, jwt, queryClient, usdcQueryKey, refetchUserPurchase, refetchUsdc],
  )

  const claimTokens = useCallback(async (): Promise<Hash> => {
    if (!connectedChainId || !isSaleSupported(connectedChainId)) {
      throw new Error('Sale not available on this chain')
    }

    const saleAddr = getSaleAddress(connectedChainId)
    const hash = await saleWriter.write('claim', {
      chainId: connectedChainId,
      address: saleAddr,
      abi: SALE_ABI,
      functionName: 'claim',
      args: [],
    })

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
          toast.error(
            error.message.includes('User rejected')
              ? 'You rejected the network switch. Please try again.'
              : 'Failed to switch network. Please do it manually in your wallet.',
            5000,
          )
        },
      },
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

    // Auth
    isAuthenticated: !!jwt,
    jwt,
    login,
    logout,
    refreshToken: refreshAccessTokenInternal,

    // Loading / error
    isRoundLoading,
    isUserLoading,
    isAuthLoading,
    roundError,
    userError,
    authError,
    isRoundTimeout,

    // Chain
    isWrongChain,
    isSaleAvailable,
    switchToSaleChain,
    isSwitchingChain: switchChain.isPending,

    // Helpers
    calcTokensOut,
    needsApproval,
    refetch,

    // Tx state
    txHash: saleWriter.txHash,
    activeOp: saleWriter.activeOp,
    isPending: saleWriter.isPending,
    isConfirming: saleWriter.isConfirming,
    isConfirmed: saleWriter.isConfirmed,
    error: saleWriter.error,

    // Actions
    resetTxState,
    approveUSDC,
    buyTokens,
    claimTokens,
  }
}