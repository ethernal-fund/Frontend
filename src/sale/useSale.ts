/**
 * useSale
 *
 * Hook principal de la feature Token Sale.
 * Combina autenticación SIWE, datos de ronda/compra del backend,
 * balances on-chain (USDC) y escritura de contratos (approve/buy/claim).
 *
 * Stack: wagmi v3 · TanStack Query v5 · viem · axios
 *
 * Cambios respecto a la versión anterior:
 *  - useConnection en lugar de useAccount (wagmi v3)
 *  - useSignMessage en lugar de window.ethereum.personal_sign
 *    → compatible con MetaMask, WalletConnect, Safe, Coinbase Wallet, etc.
 *  - refreshTokenRef (useRef) para evitar stale closure en el setInterval
 *    de rotación automática del access token
 *  - localStorage inicializado en useEffect (no en el initializer de useState)
 *    para evitar problemas en entornos SSR / tests
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  useConnection,
  useSignMessage,
  useSwitchChain,
  useReadContracts,
} from 'wagmi'
import {
  type Address,
  type Hash,
  parseUnits,
  formatUnits,
  zeroAddress,
} from 'viem'

import { getDefaultSaleChainId } from '@/sale/saleAddresses'
import {
  buildSiweMessage,
  calcTokensOut as calcTokensOutPure,
  convertPurchaseResponse,
  convertRoundResponse,
  fetchCurrentRoundFromBackend,
  fetchSiweNonce,
  fetchUserPurchaseFromBackend,
  formatETRF,
  formatUSDC,
  getSaleAddress,
  getUSDCAddress,
  isSaleSupported,
  logout as apiLogout,
  needsApproval as needsApprovalPure,
  refreshAccessToken,
  SALE_ABI,
  setSaleAuthToken,
  USDC_ABI,
  verifyPurchaseOnBackend,
  verifySiwe,
} from './saleService'
import { useSaleStore }  from '@/sale/saleStore'
import { useSaleWriter } from './useSaleWriter'
import type { SaleOp }   from './useSaleWriter'
import type { RoundInfo, UserPurchase } from './types'
import { useToast }      from '@/stores/uiStore'

// ─── Re-exports ───────────────────────────────────────────────────────────────
export { formatUSDC, formatETRF }
export type { SaleOp }

// ─── Constantes ───────────────────────────────────────────────────────────────

const ROUND_QUERY_OPTIONS = {
  staleTime:       30_000,
  gcTime:          5 * 60_000,
  refetchInterval: 60_000,
  retry:           3,
  retryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, 10_000),
} as const

const PURCHASE_QUERY_OPTIONS = {
  staleTime: 10_000,
  gcTime:    60_000,
  retry:     1,
} as const

const LOADING_TIMEOUT_MS        = 15_000
const TX_CONFIRMATION_TIMEOUT_MS = 120_000
/** Margen antes de que expire el access token para iniciar el refresh (ms). */
const TOKEN_REFRESH_BUFFER_MS   = 60_000

const LS_JWT_KEY     = 'sale_jwt'
const LS_EXPIRY_KEY  = 'sale_jwt_expiry'
const LS_REFRESH_KEY = 'sale_refresh_token'

// ─── Tipos públicos ───────────────────────────────────────────────────────────

export interface UseSaleReturn {
  // ── On-chain / backend data ──
  round:          RoundInfo | null
  purchase:       UserPurchase | null
  usdcBalance:    string
  usdcAllowance:  string
  userAddress:    Address | undefined
  currentChainId: number | undefined

  // ── Auth ──
  isAuthenticated: boolean
  jwt:             string | null
  login:           () => Promise<void>
  logout:          () => Promise<void>
  refreshToken:    () => Promise<boolean>

  // ── Loading / error ──
  isRoundLoading:  boolean
  isUserLoading:   boolean
  isAuthLoading:   boolean
  roundError:      Error | null
  userError:       Error | null
  authError:       string | null
  isRoundTimeout:  boolean

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
  activeOp:     SaleOp | null
  isPending:    boolean
  isConfirming: boolean
  isConfirmed:  boolean
  error:        Error | null

  // ── Tx actions ──
  resetTxState: () => void
  approveUSDC:  (usdcAmount: string) => Promise<Hash>
  buyTokens:    (usdcAmount: string) => Promise<Hash>
  claimTokens:  () => Promise<Hash>
}

// ─── Helpers internos ─────────────────────────────────────────────────────────

function readSavedJwt(): string | null {
  try {
    const token  = localStorage.getItem(LS_JWT_KEY)
    const expiry = localStorage.getItem(LS_EXPIRY_KEY)
    if (token && expiry && Date.now() < parseInt(expiry, 10)) return token
  } catch {
    // localStorage no disponible (SSR, tests sin jsdom configurado)
  }
  return null
}

function readSavedRefreshToken(): string | null {
  try {
    return localStorage.getItem(LS_REFRESH_KEY)
  } catch {
    return null
  }
}

function persistTokens(
  accessToken:  string,
  refreshToken: string,
  expiresIn:    number,
): void {
  try {
    const expiresAt = Date.now() + expiresIn * 1000
    localStorage.setItem(LS_JWT_KEY,     accessToken)
    localStorage.setItem(LS_EXPIRY_KEY,  expiresAt.toString())
    localStorage.setItem(LS_REFRESH_KEY, refreshToken)
  } catch {
    // Silencio intencional — el flujo continúa sin persistencia
  }
}

function clearPersistedTokens(): void {
  try {
    localStorage.removeItem(LS_JWT_KEY)
    localStorage.removeItem(LS_EXPIRY_KEY)
    localStorage.removeItem(LS_REFRESH_KEY)
  } catch {
    // Silencio intencional
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSale(): UseSaleReturn {
  // wagmi v3: useConnection reemplaza useAccount
  const {
    address,
    isConnected,
    chainId: connectedChainId,
  } = useConnection()

  const switchChain  = useSwitchChain()
  const queryClient  = useQueryClient()
  const toast        = useToast()

  // wagmi v3: hook de firma — compatible con todos los conectores registrados
  // (MetaMask injected, WalletConnect, Safe, Coinbase Wallet, etc.)
  const signMessage = useSignMessage()

  // ── Auth state ──────────────────────────────────────────────────────────────
  // Inicializar con null; se hidrata desde localStorage en el primer useEffect.
  // Esto evita errores en entornos SSR y en tests con jsdom sin localStorage.
  const [jwt,              setJwt]              = useState<string | null>(null)
  const [storedRefreshToken, setStoredRefreshToken] = useState<string | null>(null)
  const [isAuthLoading,    setIsAuthLoading]    = useState(false)
  const [authError,        setAuthError]        = useState<string | null>(null)

  // Ref para el refresh token: evita stale closure en el setInterval de rotación.
  // El estado (storedRefreshToken) se usa solo para sincronizar el ref.
  const refreshTokenRef = useRef<string | null>(null)

  // Mantener el ref siempre actualizado con el estado más reciente
  useEffect(() => {
    refreshTokenRef.current = storedRefreshToken
  }, [storedRefreshToken])

  // ── Timeout refs ────────────────────────────────────────────────────────────
  const [isRoundTimeout,      setIsRoundTimeout]      = useState(false)
  const loadingTimeoutRef     = useRef<number | undefined>(undefined)
  const confirmationTimeoutRef = useRef<number | undefined>(undefined)
  const tokenRefreshIntervalRef = useRef<number | undefined>(undefined)

  // ── Hidratación inicial desde localStorage (solo en cliente) ────────────────
  useEffect(() => {
    const savedJwt     = readSavedJwt()
    const savedRefresh = readSavedRefreshToken()
    if (savedJwt) {
      setJwt(savedJwt)
      setSaleAuthToken(savedJwt)
    }
    if (savedRefresh) {
      setStoredRefreshToken(savedRefresh)
    }
  }, []) // solo en mount

  // ── Limpieza al desmontar ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current)      clearTimeout(loadingTimeoutRef.current)
      if (confirmationTimeoutRef.current) clearTimeout(confirmationTimeoutRef.current)
      if (tokenRefreshIntervalRef.current) clearInterval(tokenRefreshIntervalRef.current)
    }
  }, [])

  // ── Chain derivados ─────────────────────────────────────────────────────────
  const isSaleAvailable = isConnected && !!connectedChainId && isSaleSupported(connectedChainId)
  const isWrongChain    = isConnected && !!connectedChainId && !isSaleSupported(connectedChainId)

  // ── Logout interno (reutilizable desde login y refresh) ─────────────────────
  const logoutInternal = useCallback(async () => {
    // Fire-and-forget: revocar en el backend sin bloquear el flujo local
    const currentRefresh = refreshTokenRef.current
    if (currentRefresh) {
      apiLogout(currentRefresh).catch(() => {})
    }

    setJwt(null)
    setStoredRefreshToken(null)
    setSaleAuthToken(null)
    clearPersistedTokens()

    if (tokenRefreshIntervalRef.current) {
      clearInterval(tokenRefreshIntervalRef.current)
      tokenRefreshIntervalRef.current = undefined
    }

    useSaleStore.getState().resetUser()
    await queryClient.invalidateQueries({ queryKey: ['sale', 'my-purchase'] })
  }, [queryClient])

  // ── Refresh automático del access token ─────────────────────────────────────
  // Lee siempre refreshTokenRef.current para evitar el stale closure
  // que tendría un useCallback con [storedRefreshToken] en deps.
  const refreshAccessTokenInternal = useCallback(async (): Promise<boolean> => {
    const currentRefresh = refreshTokenRef.current
    if (!currentRefresh) return false

    try {
      const response = await refreshAccessToken(currentRefresh)

      setJwt(response.access_token)
      setStoredRefreshToken(response.refresh_token)
      setSaleAuthToken(response.access_token)
      persistTokens(response.access_token, response.refresh_token, response.expires_in)

      return true
    } catch (err) {
      console.error('[useSale] Token refresh failed:', err)
      await logoutInternal()
      return false
    }
  }, [logoutInternal]) // logoutInternal es estable (useCallback con [queryClient])

  // ── Login con SIWE ──────────────────────────────────────────────────────────
  const login = useCallback(async () => {
    if (!address) {
      toast.error('Please connect your wallet first')
      return
    }

    setIsAuthLoading(true)
    setAuthError(null)

    try {
      // 1. Nonce del backend
      const { nonce, message: backendMessage } = await fetchSiweNonce(address, 'sale')

      // 2. Construir mensaje SIWE en el frontend
      //    Se usa el mensaje del backend como fuente de verdad para la firma;
      //    el frontend construye el suyo solo para validación en desarrollo.
      if (import.meta.env.DEV) {
        const frontendMessage = buildSiweMessage(address, nonce, 'sale')
        if (backendMessage !== frontendMessage) {
          console.warn('[useSale] SIWE message mismatch — frontend vs backend:')
          console.warn('Frontend:', frontendMessage)
          console.warn('Backend: ', backendMessage)
        }
      }

      // 3. Firma vía wagmi v3 useSignMessage
      //    Funciona con MetaMask (injected), WalletConnect, Safe, Coinbase, etc.
      //    mutateAsync lanza si el usuario rechaza → capturado en el catch
      const signature = await signMessage.mutateAsync({ message: backendMessage })

      // 4. Verificar firma en el backend → obtener tokens
      const authResponse = await verifySiwe(backendMessage, signature)

      // 5. Persistir y actualizar estado
      setJwt(authResponse.access_token)
      setStoredRefreshToken(authResponse.refresh_token)
      setSaleAuthToken(authResponse.access_token)
      persistTokens(
        authResponse.access_token,
        authResponse.refresh_token,
        authResponse.expires_in,
      )

      toast.success(authResponse.is_new_user ? 'Welcome!' : 'Welcome back!')

      // 6. Programar rotación automática del token
      if (tokenRefreshIntervalRef.current) {
        clearInterval(tokenRefreshIntervalRef.current)
      }
      const refreshIn = authResponse.expires_in * 1000 - TOKEN_REFRESH_BUFFER_MS
      if (refreshIn > 0) {
        tokenRefreshIntervalRef.current = window.setInterval(
          // Nota: refreshAccessTokenInternal siempre lee refreshTokenRef.current,
          // por lo que no hay stale closure aquí aunque el token rote.
          () => { refreshAccessTokenInternal() },
          refreshIn,
        )
      }

      // 7. Refrescar datos del usuario
      await queryClient.invalidateQueries({ queryKey: ['sale', 'my-purchase'] })

    } catch (err) {
      // Rechazo de firma por el usuario — no mostrar como error
      if (err instanceof Error && err.message.toLowerCase().includes('user rejected')) {
        setAuthError('Signature rejected')
        return
      }
      const message = err instanceof Error ? err.message : 'Authentication failed'
      setAuthError(message)
      toast.error(message)
      throw err
    } finally {
      setIsAuthLoading(false)
    }
  }, [address, signMessage, toast, queryClient, refreshAccessTokenInternal])

  // ── Logout público ───────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    await logoutInternal()
    toast.info('Logged out successfully')
  }, [logoutInternal, toast])

  // ── Query: ronda activa ──────────────────────────────────────────────────────
  const {
    data:    backendRound,
    isLoading: isRoundLoading,
    error:   roundError,
    refetch: refetchRound,
  } = useQuery({
    queryKey: ['sale', 'round', connectedChainId ?? 0],
    queryFn: async () => {
      setIsRoundTimeout(false)
      return fetchCurrentRoundFromBackend()
    },
    ...ROUND_QUERY_OPTIONS,
  })

  // Timeout de carga de ronda
  useEffect(() => {
    if (isRoundLoading) {
      loadingTimeoutRef.current = window.setTimeout(() => {
        setIsRoundTimeout(true)
        toast.warning(
          'The sale round is taking longer than expected to load. Check your connection.',
          8000,
        )
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

  const round: RoundInfo | null = backendRound
    ? convertRoundResponse(backendRound)
    : null

  // ── Query: compra del usuario ────────────────────────────────────────────────
  const {
    data:    backendPurchase,
    isLoading: isUserLoading,
    error:   userError,
    refetch: refetchUserPurchase,
  } = useQuery({
    queryKey: ['sale', 'my-purchase', jwt, connectedChainId ?? 0],
    queryFn:  fetchUserPurchaseFromBackend,
    enabled:  !!jwt && !!connectedChainId && isSaleSupported(connectedChainId),
    ...PURCHASE_QUERY_OPTIONS,
  })

  const purchase: UserPurchase | null = backendPurchase
    ? convertPurchaseResponse(backendPurchase)
    : null

  // ── Limpiar purchase del store si el JWT se invalida ─────────────────────────
  useEffect(() => {
    if (!jwt) useSaleStore.getState().setPurchase(null)
  }, [jwt])

  // ── On-chain: balances USDC + allowance ──────────────────────────────────────
  const usdcAddress = connectedChainId ? getUSDCAddress(connectedChainId) : zeroAddress
  const saleAddress = connectedChainId ? getSaleAddress(connectedChainId) : zeroAddress

  const {
    data:     usdcData,
    queryKey: usdcQueryKey,
    refetch:  refetchUsdc,
  } = useReadContracts({
    contracts: [
      {
        address:      usdcAddress,
        abi:          USDC_ABI,
        functionName: 'balanceOf',
        args:         [address ?? zeroAddress],
      },
      {
        address:      usdcAddress,
        abi:          USDC_ABI,
        functionName: 'allowance',
        args:         [address ?? zeroAddress, saleAddress],
      },
    ],
    query: {
      enabled:   !!address && !!connectedChainId && isSaleSupported(connectedChainId),
      staleTime: 15_000,
      gcTime:    60_000,
      retry:     2,
    },
  })

  const usdcBalance   = usdcData?.[0]?.result != null
    ? formatUnits(usdcData[0].result as bigint, 6) : '0'
  const usdcAllowance = usdcData?.[1]?.result != null
    ? formatUnits(usdcData[1].result as bigint, 6) : '0'

  // ── Sincronizar store ────────────────────────────────────────────────────────
  useEffect(() => { useSaleStore.getState().setRound(round)    }, [round])
  useEffect(() => { useSaleStore.getState().setPurchase(purchase) }, [purchase])
  useEffect(() => {
    useSaleStore.getState().setBalances(usdcBalance, usdcAllowance, '0')
  }, [usdcBalance, usdcAllowance])

  // ── Limpiar estado al cambiar a chain no soportada ───────────────────────────
  useEffect(() => {
    if (connectedChainId && !isSaleSupported(connectedChainId)) {
      useSaleStore.getState().setPurchase(null)
      useSaleStore.getState().setRound(null)
    }
  }, [connectedChainId])

  // ── Escritura de contratos ───────────────────────────────────────────────────
  const saleWriter = useSaleWriter()

  // Timeout de confirmación de tx
  useEffect(() => {
    if (saleWriter.isConfirming && saleWriter.txHash) {
      confirmationTimeoutRef.current = window.setTimeout(() => {
        toast.warning(
          'Transaction confirmation is taking longer than expected. Check the explorer for status.',
          10_000,
        )
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
    // Notificar al backend (fire-and-forget, no bloquea la UI)
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
  }, [saleWriter, connectedChainId, jwt, queryClient, usdcQueryKey, refetchUsdc, refetchUserPurchase])

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
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['sale', 'my-purchase', jwt] }),
      refetchUserPurchase(),
    ])
    return hash
  }, [saleWriter, connectedChainId, jwt, queryClient, refetchUserPurchase])

  // ── Helpers de UI ────────────────────────────────────────────────────────────
  const calcTokensOut = useCallback(
    (usdcAmount: string) => calcTokensOutPure(usdcAmount, round?.price ?? 0n),
    [round?.price],
  )

  const needsApproval = useCallback(
    (usdcAmount: string) => needsApprovalPure(usdcAmount, parseUnits(usdcAllowance, 6)),
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
              : 'Failed to switch network. Please switch manually in your wallet.',
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

  const resetTxState = useCallback(() => saleWriter.reset(), [saleWriter])

  // ── Return ───────────────────────────────────────────────────────────────────
  return {
    round,
    purchase,
    usdcBalance,
    usdcAllowance,
    userAddress:    address,
    currentChainId: connectedChainId,

    isAuthenticated: !!jwt,
    jwt,
    login,
    logout,
    refreshToken: refreshAccessTokenInternal,

    isRoundLoading,
    isUserLoading,
    isAuthLoading,
    roundError:  roundError as Error | null,
    userError:   userError  as Error | null,
    authError,
    isRoundTimeout,

    isWrongChain,
    isSaleAvailable,
    switchToSaleChain,
    isSwitchingChain: switchChain.isPending,

    calcTokensOut,
    needsApproval,
    refetch,

    txHash:      saleWriter.txHash,
    activeOp:    saleWriter.activeOp,
    isPending:   saleWriter.isPending,
    isConfirming: saleWriter.isConfirming,
    isConfirmed:  saleWriter.isConfirmed,
    error:        saleWriter.error,

    resetTxState,
    approveUSDC,
    buyTokens,
    claimTokens,
  }
}