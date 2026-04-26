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
  ROUTES.PRIVACY,
  ROUTES.TERMS,
  ROUTES.DISCLAIMER,
  ROUTES.ADMIN_DASHBOARD,
  ROUTES.ADMIN_TREASURY,
  ROUTES.ADMIN_PROTOCOL,
  ROUTES.ADMIN_CONTACT,
]

const ENTRY_HANDLED_KEY = '_ethernal_entry'
const WALLET_DISCONNECT_DEBOUNCE_MS = 1500

export function SessionGuard() {
  const navigate = useNavigate()
  const location = useLocation()

  const isAuth   = useAuthStore((s) => s.isAuthenticated)
  const logout   = useAuthStore((s) => s.logout)

  const isConnected    = useWalletStore((s) => s.isConnected)
  const address        = useWalletStore((s) => s.address)
  const isReconnecting = useWalletStore((s) => s.isReconnecting)

  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (sessionStorage.getItem(ENTRY_HANDLED_KEY)) return
    sessionStorage.setItem(ENTRY_HANDLED_KEY, '1')

    const isRootEntry = ROOT_HOSTNAMES.includes(window.location.hostname)
    const isDeepRoute = location.pathname !== ROUTES.HOME
    const shouldPreserve = PRESERVE_ON_ENTRY.some(
      (r) => location.pathname === r || location.pathname.startsWith(r + '/')
    )
    const hasRedirectParam = new URLSearchParams(location.search).has('redirect')

    if (isRootEntry && isDeepRoute && !shouldPreserve && !hasRedirectParam) {
      navigate(ROUTES.HOME, { replace: true })
    }
  }, []) 

  useEffect(() => {
    if (isReconnecting) {
      if (logoutTimerRef.current) {
        clearTimeout(logoutTimerRef.current)
        logoutTimerRef.current = null
      }
      return
    }

    const walletGone = !isConnected || !address

    if (walletGone && isAuth) {
      logoutTimerRef.current = setTimeout(() => {
        const stillGone =
          !useWalletStore.getState().isConnected ||
          !useWalletStore.getState().address

        if (stillGone && useAuthStore.getState().isAuthenticated) {
          logout()
        }
      }, WALLET_DISCONNECT_DEBOUNCE_MS)

    } else if (!walletGone && logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current)
      logoutTimerRef.current = null
    }

    return () => {
      if (logoutTimerRef.current) {
        clearTimeout(logoutTimerRef.current)
        logoutTimerRef.current = null
      }
    }
  }, [isConnected, address, isReconnecting, isAuth, logout])

  return null
}