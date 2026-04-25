import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore }   from '@/stores/authStore'
import { useWalletStore } from '@/stores/walletStore'
import LoadingScreen      from '@/components/common/LoadingScreen'
import { ROUTES }         from './routes'

interface ProtectedRouteProps {
  children: ReactNode
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isReconnecting  = useWalletStore((s) => s.isReconnecting)
  const isConnected     = useWalletStore((s) => s.isConnected)
  const location        = useLocation()

  if (isReconnecting || isAuthenticated === undefined || isAuthenticated === null) {
    return <LoadingScreen />
  }
  if (!isAuthenticated) {
    const from = location.pathname + location.search
    const redirectParam = from !== ROUTES.HOME
      ? `?redirect=${encodeURIComponent(from)}`
      : ''
    return <Navigate to={`${ROUTES.HOME}${redirectParam}`} replace />
  }
  if (!isConnected) {
    return <LoadingScreen />
  }
  return <>{children}</>
}
export default ProtectedRoute