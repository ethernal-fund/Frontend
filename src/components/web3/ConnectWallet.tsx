import { useState, useRef, useEffect } from 'react';
import { useAppKit } from '@reown/appkit/react';
import { useConnection, useDisconnect, useChainId } from 'wagmi';

const EXPLORERS: Record<number, string> = {
  1:        'https://etherscan.io',
  137:      'https://polygonscan.com',
  42161:    'https://arbiscan.io',
  421614:   'https://sepolia.arbiscan.io',
  80002:    'https://amoy.polygonscan.com',
  84532:    'https://sepolia.basescan.org',
  11155111: 'https://sepolia.etherscan.io',
  11155420: 'https://sepolia-optimism.etherscan.io',
};

const formatAddress = (addr: string) =>
  `${addr.slice(0, 6)}...${addr.slice(-4)}`;

const getExplorerUrl = (address: string, chainId: number) =>
  `${EXPLORERS[chainId] ?? 'https://etherscan.io'}/address/${address}`;

const WalletIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const CopyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

const LogOutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const ChevronDownIcon = ({ className = '' }: { className?: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    className={className}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

type CopyState = 'idle' | 'copied';

export function ConnectWallet() {
  const { open }               = useAppKit();
  const { address, isConnected } = useConnection();
  const { disconnect }         = useDisconnect();
  const chainId                = useChainId();
  const [isOpen,     setIsOpen    ] = useState(false);
  const [copyState,  setCopyState ] = useState<CopyState>('idle');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const copyAddress = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 1500);
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
    setIsOpen(false);
  };

  const viewOnExplorer = () => {
    if (!address) return;
    window.open(getExplorerUrl(address, chainId), '_blank', 'noopener,noreferrer');
    setIsOpen(false);
  };

  const handleDisconnect = () => {
    disconnect();
    setIsOpen(false);
  };

  const handleOpenAccount = () => {
    setIsOpen(false);
    open({ view: 'Account' });
  };

  if (!isConnected) {
    return (
      <button
        onClick={() => open()}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700
                   transition-colors flex items-center gap-2 font-medium"
      >
        <WalletIcon />
        Connect Wallet
      </button>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300
                   dark:border-gray-700 rounded-lg hover:bg-gray-50
                   dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
      >
        <WalletIcon />
        <span className="font-mono text-sm">{formatAddress(address!)}</span>
        <ChevronDownIcon className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800
                     border border-gray-200 dark:border-gray-700 rounded-lg
                     shadow-lg overflow-hidden z-50"
        >
          {/* Full account via AppKit */}
          <button
            role="menuitem"
            onClick={handleOpenAccount}
            className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700
                       transition-colors flex items-center gap-3 text-sm"
          >
            <WalletIcon />
            <span>View Account</span>
          </button>

          {/* Copy address */}
          <button
            role="menuitem"
            onClick={copyAddress}
            className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700
                       transition-colors flex items-center gap-3 text-sm"
          >
            <CopyIcon />
            <span>{copyState === 'copied' ? '✓ Copied!' : 'Copy Address'}</span>
          </button>

          {/* View on explorer */}
          <button
            role="menuitem"
            onClick={viewOnExplorer}
            className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700
                       transition-colors flex items-center gap-3 text-sm"
          >
            <ExternalLinkIcon />
            <span>View on Explorer</span>
          </button>

          {/* Disconnect */}
          <button
            role="menuitem"
            onClick={handleDisconnect}
            className="w-full px-4 py-3 text-left hover:bg-red-50 dark:hover:bg-red-900/20
                       transition-colors flex items-center gap-3 text-sm
                       text-red-600 dark:text-red-400
                       border-t border-gray-200 dark:border-gray-700"
          >
            <LogOutIcon />
            <span>Disconnect</span>
          </button>
        </div>
      )}
    </div>
  );
}

export function ConnectWalletSimple() {
  const { open }       = useAppKit();
  const { isConnected } = useConnection();

  return (
    <button
      onClick={() => open()}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg
                 hover:bg-blue-700 transition-colors font-medium"
    >
      {isConnected ? 'Account' : 'Connect Wallet'}
    </button>
  );
}

export default ConnectWallet;