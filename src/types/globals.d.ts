/// <reference types="vite/client" />

interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;

  isMetaMask?:   boolean;
  isRabby?:      boolean;
  isBraveWallet?: boolean;
  isCoinbaseWallet?: boolean;
  isWalletConnect?: boolean;

  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
  chainId?: string;
  selectedAddress?: string | null;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export {};