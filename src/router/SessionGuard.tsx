import { useEffect, useRef }        from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore }             from '@/stores/authStore'
import { useWalletStore }           from '@/stores/walletStore'
import { ROUTES }                   from '@/router/routes'

const ROOT_HOSTNAMES = ['ethernal.fund', 'www.ethernal.fund']

const PRESERVE_ON_ENTRY: string[] = [
  ROUTES.DASHBOARD,
  ROUTES.COURSES,
  ROUTES.LEARNING,
  ROUTES.CALCULATOR,
  ROUTES.CONTACT,
  ROUTES.SURVEY,
  ROUTES.OUR_HISTORY,
  ROUTES.SALE,
  ROUTES.PRIVACY,
  ROUTES.TERMS,
  ROUTES.DISCLAIMER,
  ROUTES.ADMIN_DASHBOARD,
  ROUTES.ADMIN_TREASURY,
  ROUTES.ADMIN_PROTOCOL,
  ROUTES.ADMIN_CONTACT,
]

const ENTRY_HANDLED_KEY            = '_ethernal_entry'
const WALLET_DISCONNECT_DEBOUNCE_MS = 3_000

export function SessionGuard() {
  const navigate = useNavigate()
  const location = useLocation()

  const isAuth         = useAuthStore((s) => s.isAuthenticated)
  const tokenAddress   = useAuthStore((s) => s.walletAddress)  
  const logout         = useAuthStore((s) => s.logout)
  const isConnected    = useWalletStore((s) => s.isConnected)
  const address        = useWalletStore((s) => s.address)
  const isReconnecting = useWalletStore((s) => s.isReconnecting)

  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Entry redirect (solo primera carga)
  useEffect(() => {
    if (sessionStorage.getItem(ENTRY_HANDLED_KEY)) return
    sessionStorage.setItem(ENTRY_HANDLED_KEY, '1')

    const isRootEntry    = ROOT_HOSTNAMES.includes(window.location.hostname)
    const isDeepRoute    = location.pathname !== ROUTES.HOME
    const shouldPreserve = PRESERVE_ON_ENTRY.some(
      (r) => location.pathname === r || location.pathname.startsWith(r + '/')
    )
    const hasRedirectParam = new URLSearchParams(location.search).has('redirect')

    if (isRootEntry && isDeepRoute && !shouldPreserve && !hasRedirectParam) {
      navigate(ROUTES.HOME, { replace: true })
    }
  }, []) 

  // Logout por desconexión de wallet 
  useEffect(() => {
    // Mientras wagmi está reconectando, nunca tocamos el estado de auth.
    // isReconnecting es true tanto en el arranque como durante flashes breves.
    if (isReconnecting) {
      if (logoutTimerRef.current) {
        clearTimeout(logoutTimerRef.current)
        logoutTimerRef.current = null
      }
      return
    }

    const walletGone = !isConnected || !address

    // ── Caso 1: wallet desconectada mientras había sesión activa ──
    if (walletGone && isAuth) {
      // Solo programamos el logout si no hay ya uno pendiente
      if (!logoutTimerRef.current) {
        logoutTimerRef.current = setTimeout(() => {
          logoutTimerRef.current = null

          // Triple-check al momento de ejecutar:
          // la wallet puede haber reconectado durante el debounce
          const wallet = useWalletStore.getState()
          const auth   = useAuthStore.getState()

          if (!auth.isAuthenticated) return                 // ya se limpió por otro camino
          if (wallet.isReconnecting)  return                // aún reconectando, abortar
          if (wallet.isConnected && wallet.address) return  // reconectó, abortar

          logout()
        }, WALLET_DISCONNECT_DEBOUNCE_MS)
      }
      return
    }

    // ── Caso 2: wallet conectada, verificar que el address coincide ──
    if (!walletGone && isAuth && tokenAddress) {
      const sameAddress = address?.toLowerCase() === tokenAddress.toLowerCase()

      if (!sameAddress) {
        // Cambio de cuenta: invalidar sesión inmediatamente, sin debounce.
        // El usuario tendrá que firmar con la nueva cuenta.
        if (logoutTimerRef.current) {
          clearTimeout(logoutTimerRef.current)
          logoutTimerRef.current = null
        }
        logout()
        return
      }
    }

    // ── Caso 3: wallet conectada y todo OK → cancelar logout pendiente ──
    if (!walletGone && logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current)
      logoutTimerRef.current = null
    }

  }, [isConnected, address, isReconnecting, isAuth, tokenAddress, logout])

  // Cleanup al desmontar
  useEffect(() => () => {
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current)
  }, [])
  return null
}