import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ROUTES } from './routes';

function useAuthState(): { isConnected: boolean; isAdmin: boolean; isLoading: boolean } {
  return { isConnected: false, isAdmin: false, isLoading: false };
}

interface ProtectedRouteProps {
  children:     ReactNode;
  requireAuth?: boolean;   // redirect to / if wallet not connected
  requireAdmin?: boolean;  // redirect to /dashboard if not admin
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth  = false,
  requireAdmin = false,
}) => {
  const { isConnected, isAdmin, isLoading } = useAuthState();
  const location = useLocation();

  if (isLoading) return null;

  if (requireAuth && !isConnected) {
    const redirectParam = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`${ROUTES.HOME}?redirect=${redirectParam}`} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;