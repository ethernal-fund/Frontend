import { useReadContract, useReadContracts, useChainId } from 'wagmi';
import { useMemo }              from 'react';
import { getContractAddress, isValidAddress } from '@/config/addresses';
import { REGISTRY_ABI }        from '@/config/abis';
import type { ProtocolTuple }  from '@/config/abis';
import type { Protocol }       from '@/types';

const ZERO = '0x0000000000000000000000000000000000000000' as const;

export function useProtocols() {
  const chainId = useChainId();

  // Resolve the registry address for the current chain at render time.
  const registryAddress = getContractAddress(chainId, 'protocolRegistry');
  const registryReady   = isValidAddress(registryAddress);

  const {
    data: rawAddresses,
    isLoading: loadingAddresses,
    error,
    refetch,
  } = useReadContract({
    address:      registryAddress as `0x${string}`,
    abi:          REGISTRY_ABI,
    functionName: 'getActiveProtocolsList',
    query:        { enabled: registryReady },
  });

  const addresses = useMemo(
    () =>
      (rawAddresses as readonly `0x${string}`[] | undefined)
        ?.filter((a) => a !== ZERO) ?? [],
    [rawAddresses],
  );

  const calls = useMemo(
    () =>
      addresses.map((addr) => ({
        address:      registryAddress as `0x${string}`,
        abi:          REGISTRY_ABI,
        functionName: 'getProtocol' as const,
        args:         [addr] as const,
      })),
    [addresses, registryAddress],
  );

  const { data: protocolResults, isLoading: loadingDetails } = useReadContracts({
    contracts: calls,
    query:     { enabled: registryReady && addresses.length > 0 },
  });

  const protocols = useMemo<Protocol[]>(() => {
    if (!addresses.length || !protocolResults) return [];

    return addresses.flatMap((addr, i) => {
      const result = protocolResults[i];
      if (result?.status !== 'success') return [];

      const p = result.result as unknown as ProtocolTuple;
      if (!p?.isActive) return [];

      return [{
        address:  addr,
        name:     p.name,
        apyBps:   Number(p.apy),
        active:   p.isActive,
        tvl:      p.totalDeposited,
        verified: p.verified,
        risk:     p.riskLevel,
        category: p.category,
      }];
    });
  }, [addresses, protocolResults]);

  return {
    protocols,
    isLoading:    loadingAddresses || loadingDetails,
    registryReady,
    error,
    refetch,
  };
}