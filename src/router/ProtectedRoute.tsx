import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useWalletStore } from '@/stores/walletStore';
import LoadingScreen from '@/components/common/LoadingScreen';
import { ROUTES } from './routes';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isReconnecting  = useWalletStore((s) => s.isReconnecting);
  const isConnected     = useWalletStore((s) => s.isConnected);
  const location        = useLocation();
  const isAuthLoading = 
    isReconnecting || 
    (isConnected && !isAuthenticated);   // ← Clave: wallet conectada pero aún no autenticada (SIWE en curso)

  if (isAuthLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    const from = location.pathname + location.search;
    const redirectParam = from !== ROUTES.HOME
      ? `?redirect=${encodeURIComponent(from)}`
      : '';
    return <Navigate to={`${ROUTES.HOME}${redirectParam}`} replace />;
  }
  if (!isConnected) {
    return <LoadingScreen />;
  }
  return <>{children}</>;
}