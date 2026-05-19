import { useChainId, useReadContract } from 'wagmi';
import { useWalletStore }              from '@/stores/walletStore';
import { getContractAddresses }        from '@/config/addresses';
import { FACTORY_ABI }                 from '@/config/abis';
import { SAFE_ABI }                    from '@/config/safe';

export interface SafeOwnerResult {
  safeAddress: `0x${string}` | undefined;
  isSafeOwner: boolean;
  isLoading:   boolean;
  threshold:   number | undefined;
  ownerCount:  number | undefined;
}

export function useSafeOwner(): SafeOwnerResult {
  const address   = useWalletStore((s) => s.address);
  const chainId   = useChainId();
  const contracts = getContractAddresses(chainId);

  // Step 1: factory.admin() → Safe address
  // This is the single source of truth — no hardcoded Safe address in config.
  const {
    data:      safeAddressData,
    isLoading: isLoadingAdmin,
  } = useReadContract({
    address:      contracts?.personalFundFactory,
    abi:          FACTORY_ABI,
    functionName: 'admin',
    query:        { enabled: !!address && !!contracts?.personalFundFactory },
  });

  const safeAddress = safeAddressData as `0x${string}` | undefined;
  const safeEnabled = !!safeAddress && !!address;

  // Step 2: safe.isOwner(connectedWallet)
  // If safeAddress is an EOA (pre-migration), this call will revert and
  // isError will be true → isSafeOwner correctly returns false.
  const {
    data:      isOwnerData,
    isLoading: isLoadingOwner,
    isError:   isOwnerError,
  } = useReadContract({
    address:      safeAddress,
    abi:          SAFE_ABI,
    functionName: 'isOwner',
    args:         [address as `0x${string}`],
    query:        { enabled: safeEnabled },
  });

  // Step 3: safe.getThreshold() — UI display only
  const { data: thresholdData } = useReadContract({
    address:      safeAddress,
    abi:          SAFE_ABI,
    functionName: 'getThreshold',
    query:        { enabled: safeEnabled },
  });

  // Step 4: safe.getOwners() → ownerCount — UI display only
  // Returns the full array of owner addresses; we only expose the length.
  const { data: ownersData } = useReadContract({
    address:      safeAddress,
    abi:          SAFE_ABI,
    functionName: 'getOwners',
    query:        { enabled: safeEnabled },
  });

  return {
    safeAddress,
    isSafeOwner: !isOwnerError && !!isOwnerData,
    isLoading:   isLoadingAdmin || isLoadingOwner,
    threshold:   thresholdData !== undefined ? Number(thresholdData) : undefined,
    ownerCount:  ownersData    !== undefined ? (ownersData as `0x${string}`[]).length : undefined,
  };
}