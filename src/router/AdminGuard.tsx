/**
 * Route guard for admin-only pages.
 *
 * Access is granted only if the connected wallet is a registered owner
 * of the Gnosis Safe set as admin in PersonalFundFactory — not if it
 * merely matches a single hardcoded address.
 */

import { Navigate, Outlet }     from 'react-router-dom';
import { useChainId }           from 'wagmi';
import { useWalletStore }       from '@/stores/walletStore';
import { getContractAddresses } from '@/config/addresses';
import { useSafeOwner }         from '@/hooks/useSafeOwner';
import LoadingScreen            from '@/components/common/LoadingScreen';
import { ROUTES }               from '@/router/routes';

export function AdminGuard() {
  const address   = useWalletStore((s) => s.address);
  const chainId   = useChainId();
  const contracts = getContractAddresses(chainId);

  const { isSafeOwner, isLoading } = useSafeOwner();

  // No wallet connected → send to landing
  if (!address) return <Navigate to={ROUTES.HOME} replace />;

  // Chain not supported / contracts not deployed → send to landing
  if (!contracts?.personalFundFactory) return <Navigate to={ROUTES.HOME} replace />;

  // Waiting for on-chain reads
  if (isLoading) return <LoadingScreen />;

  // Connected wallet is not a Safe owner → send to user dashboard
  if (!isSafeOwner) return <Navigate to={ROUTES.DASHBOARD} replace />;

  return <Outlet />;
}