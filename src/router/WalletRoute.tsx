/**
 * WalletRoute
 *
 * Guard más liviano que ProtectedRoute:
 * - Solo requiere wallet conectada (isConnected + address)
 * - NO requiere autenticación SIWE
 * - Espera mientras wagmi reconecta la sesión anterior
 *
 * Usado por: DashboardPage (el usuario puede ver su fondo
 * o el estado "sin fondo" con solo conectar la wallet)
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useWalletStore }        from '@/stores/walletStore';
import LoadingScreen             from '@/components/common/LoadingScreen';
import { ROUTES }                from './routes';

export function WalletRoute({ children }: { children: React.ReactNode }) {
  const isConnected    = useWalletStore((s) => s.isConnected);
  const address        = useWalletStore((s) => s.address);
  const isReconnecting = useWalletStore((s) => s.isReconnecting);
  const location       = useLocation();

  // Esperar a que wagmi termine de reconectar antes de decidir
  if (isReconnecting) {
    return <LoadingScreen />;
  }

  if (!isConnected || !address) {
    const from = location.pathname + location.search;
    const redirectParam = from !== ROUTES.HOME
      ? `?redirect=${encodeURIComponent(from)}`
      : '';
    return <Navigate to={`${ROUTES.HOME}${redirectParam}`} replace />;
  }

  return <>{children}</>;
}