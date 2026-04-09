import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface WalletState {
  address:   `0x${string}` | null;
  chainId:   number | null;
  connected: boolean;

  // Actions — called by wagmi hooks in providers, not manually
  setWallet: (address: `0x${string}` | null, chainId: number | null) => void;
  disconnect: () => void;
}

export const useWalletStore = create<WalletState>()(
  devtools(
    (set) => ({
      address:   null,
      chainId:   null,
      connected: false,

      setWallet: (address, chainId) =>
        set({ address, chainId, connected: address !== null }, false, 'wallet/set'),

      disconnect: () =>
        set({ address: null, chainId: null, connected: false }, false, 'wallet/disconnect'),
    }),
    { name: 'WalletStore' },
  ),
);
