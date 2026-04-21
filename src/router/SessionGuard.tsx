import { useEffect, useRef }        from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useConnection }            from 'wagmi'
import { useAuthStore }             from '@/stores/authStore'
import { ROUTES }                   from '@/router/routes'

const ROOT_HOSTNAMES = ['ethernal.fund', 'www.ethernal.fund']

export function SessionGuard() {
  const navigate = useNavigate()
  const location = useLocation()
  const isAuth   = useAuthStore((s) => s.isAuthenticated)
  const logout   = useAuthStore((s) => s.logout)

  const { status, address } = useConnection()
  const entryHandled = useRef(false)
  useEffect(() => {
    if (entryHandled.current) return
    entryHandled.current = true

    const isRootEntry = ROOT_HOSTNAMES.includes(window.location.hostname)
    const isDeepRoute = location.pathname !== ROUTES.HOME

    if (isRootEntry && isDeepRoute) {
      navigate(ROUTES.HOME, { replace: true })
    }
  }, []) // intentionally empty — one-shot on mount

  useEffect(() => {
    const walletGone =
      status === 'disconnected' ||
      (status === 'connected' && !address) // edge case: connected but no address

    if (walletGone && isAuth) {
      logout()

    }
  }, [status, address, isAuth, logout])
  return null
}