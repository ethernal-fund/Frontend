import { useChainId, useReadContract } from 'wagmi';
import { Navigate, Outlet }            from 'react-router-dom';
import { useWalletStore }              from '@/stores/walletStore';
import { getContractAddresses }        from '@/config/addresses';
import { FACTORY_ABI }                 from '@/config/abis';
import LoadingScreen                   from '@/components/common/LoadingScreen';
import { ROUTES }                      from '@/router/routes';

export function AdminGuard() {
  const address   = useWalletStore((s) => s.address);
  const chainId   = useChainId();
  const contracts = getContractAddresses(chainId);
  const { data: adminAddr, isLoading } = useReadContract({
    address:      contracts?.personalFundFactory,
    abi:          FACTORY_ABI,
    functionName: 'admin',
    query:        { enabled: !!address && !!contracts?.personalFundFactory },
  });

  // Sin wallet → landing
  if (!address) return <Navigate to={ROUTES.HOME} replace />;

  // Red no soportada o contratos no desplegados
  if (!contracts?.personalFundFactory) return <Navigate to={ROUTES.HOME} replace />;

  // Esperando respuesta on-chain
  if (isLoading) return <LoadingScreen />;

  // Wallet conectada pero no es admin → dashboard de usuario
  const isAdmin = !!adminAddr &&
    adminAddr.toLowerCase() === address.toLowerCase();

  if (!isAdmin) return <Navigate to={ROUTES.DASHBOARD} replace />;

  return <Outlet />;
}