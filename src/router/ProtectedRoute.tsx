import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore }   from '@/stores/authStore';
import { useWalletStore } from '@/stores/walletStore';
import LoadingScreen      from '@/components/common/LoadingScreen';
import { ROUTES }         from './routes';

interface ProtectedRouteProps {
  children: ReactNode;
}
const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isReconnecting  = useWalletStore((s) => s.isReconnecting);
  const location        = useLocation();

  if (isReconnecting) return <LoadingScreen />;
  if (!isAuthenticated) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`${ROUTES.HOME}?redirect=${redirect}`} replace />;
  }
  return <>{children}</>;
};
export default ProtectedRoute;