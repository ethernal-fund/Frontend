import { useEffect, useRef }        from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useConnectionEffect }      from 'wagmi'
import { useAuthStore }             from '@/stores/authStore'
import { useSiweAuth }              from '@/hooks/useSiweAuth'
import { useToast }                 from '@/stores/uiStore'
import { ROUTES }                   from '@/router/routes'

const ROOT_HOSTNAMES = ['ethernal.fund', 'www.ethernal.fund'] as const
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
]

const ENTRY_HANDLED_KEY = '_ethernal_entry_handled'
const SIWE_COOLDOWN_MS = 5_000

export function SessionGuard() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const isAuth    = useAuthStore((s) => s.isAuthenticated)
  const logout    = useAuthStore((s) => s.logout)
  const { login } = useSiweAuth()
  const toast     = useToast()
  const siweInFlight    = useRef(false)
  const siweLastAttempt = useRef(0)

  useEffect(() => {
    if (sessionStorage.getItem(ENTRY_HANDLED_KEY)) return
    sessionStorage.setItem(ENTRY_HANDLED_KEY, '1')

    const isRootEntry = ROOT_HOSTNAMES.includes(
      window.location.hostname as typeof ROOT_HOSTNAMES[number],
    )
    const isDeepRoute    = location.pathname !== ROUTES.HOME
    const shouldPreserve = PRESERVE_ON_ENTRY.some(
      (r) => location.pathname === r || location.pathname.startsWith(r + '/'),
    )
    const hasRedirectParam = new URLSearchParams(location.search).has('redirect')

    if (isRootEntry && isDeepRoute && !shouldPreserve && !hasRedirectParam) {
      navigate(ROUTES.HOME, { replace: true })
    }
  }, []) // intentionally empty — must run once on mount only
  useConnectionEffect({
    onConnect({ address, isReconnected }: { address: `0x${string}`; isReconnected: boolean }) {
      if (isReconnected && isAuth)  return
      if (siweInFlight.current)     return
      if (!address)                 return
      if (Date.now() - siweLastAttempt.current < SIWE_COOLDOWN_MS) return

      siweInFlight.current    = true
      siweLastAttempt.current = Date.now()

      login()
        .catch((err: unknown) => {
          const message =
            err instanceof Error ? err.message : 'Authentication failed. Please try again.'
          console.error('[SessionGuard] SIWE login failed:', err)
          toast.error(message)
        })
        .finally(() => {
          siweInFlight.current = false
        })
    },

    onDisconnect() {
      if (isAuth) logout()
    },
  })
  return null
}