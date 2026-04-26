import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore }          from '@/stores/authStore';
import { useWalletStore }        from '@/stores/walletStore';
import LoadingScreen             from '@/components/common/LoadingScreen';
import { ROUTES }                from './routes';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated  = useAuthStore((s) => s.isAuthenticated);
  const isAuthenticating = useAuthStore((s) => s.isAuthenticating);
  const isReconnecting   = useWalletStore((s) => s.isReconnecting);
  const location         = useLocation();
  const isLoading = isReconnecting || isAuthenticating;

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    const from = location.pathname + location.search;
    const redirectParam = from !== ROUTES.HOME
      ? `?redirect=${encodeURIComponent(from)}`
      : '';
    return <Navigate to={`${ROUTES.HOME}${redirectParam}`} replace />;
  }

  return <>{children}</>;
}