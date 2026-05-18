/**
 * Checks whether the currently connected wallet is an owner of the
 * Gnosis Safe that holds admin rights over PersonalFundFactory.
 *
 * Sequential on-chain read flow:
 *   1. factory.admin()          → safeAddress  (the Safe contract)
 *   2. safe.isOwner(wallet)     → isSafeOwner  (access gate)
 *   3. safe.getThreshold()      → threshold    (for UI display only)
 *
 * Both AdminGuard and Navbar import this hook — single source of truth,
 * no duplicated contract reads.
 */

import { useChainId, useReadContract } from 'wagmi';
import { useWalletStore }              from '@/stores/walletStore';
import { getContractAddresses }        from '@/config/addresses';
import { FACTORY_ABI }                 from '@/config/abis';
import { SAFE_ABI }                    from '@/config/safe';

export interface SafeOwnerResult {
  /** The Gnosis Safe address stored as admin in PersonalFundFactory */
  safeAddress: `0x${string}` | undefined;
  /** True if the connected wallet is a registered owner of the Safe */
  isSafeOwner: boolean;
  /** True while either on-chain read is still in flight */
  isLoading:   boolean;
  /** Safe threshold — the N in "M-of-N required signatures" */
  threshold:   number | undefined;
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

  return {
    safeAddress,
    isSafeOwner: !isOwnerError && !!isOwnerData,
    isLoading:   isLoadingAdmin || isLoadingOwner,
    threshold:   thresholdData !== undefined ? Number(thresholdData) : undefined,
  };
}