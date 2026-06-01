import { useState, useEffect, useRef, startTransition, useCallback } from 'react';
import { Link, useLocation }                                         from 'react-router-dom';
import {
  useConnection,
  useDisconnect,
  useBalance,
  useChainId,
  useSwitchChain,
} from 'wagmi';
import { formatUnits }       from 'viem';
import { useAppKit,
  useDisconnect as useAppKitDisconnect } from '@reown/appkit/react';
import { useTranslation }    from 'react-i18next';
import { useQueryClient }    from '@tanstack/react-query';
import { useAuthStore }      from '@/stores/authStore';
import { useWizardStore }    from '@/stores/wizardStore';
import { useSaleStore }      from '@/sale/saleStore';

import {
  Wallet,
  ChevronDown,
  AlertTriangle,
  ExternalLink,
  CheckCircle,
  Menu,
  X,
  ShieldCheck,
} from 'lucide-react';
import {
  appConfig,
  isValidChain,
  getChainErrorMessage,
  getFaucetUrl,
} from '@/config';
import { ROUTES }                           from '@/router/routes';
import { useSafeOwner }                     from '@/hooks/useSafeOwner';
import { getSafeAppUrl, getSafeTxQueueUrl } from '@/config/safe';
import { LanguageSwitcher }                 from '@/components/common/LanguageSwitcher';
import logo                                 from '@/assets/logo.svg';

function useLogout() {
  const { mutate: disconnectWagmi }          = useDisconnect();
  const { disconnect: disconnectAppKit }     = useAppKitDisconnect();
  const logout                               = useAuthStore((s) => s.logout);
  const resetWizard                          = useWizardStore((s) => s.reset);
  const resetSale                            = useSaleStore((s) => s.resetUser);
  const queryClient                          = useQueryClient();

  return useCallback(() => {
    logout();
    resetWizard();
    resetSale();
    queryClient.clear();
    disconnectWagmi();
    try { disconnectAppKit(); } catch { /* no active WC session */ }
  }, [logout, resetWizard, resetSale, queryClient, disconnectWagmi, disconnectAppKit]);
}

const Navbar: React.FC = () => {
  const location                        = useLocation();
  const { t }                           = useTranslation();
  const { address, isConnected, chain } = useConnection();
  const logout                          = useLogout();
  const { data: balance }               = useBalance({ address });
  const chainId                         = useChainId();
  const { mutate: switchChain }         = useSwitchChain();
  const { open }                        = useAppKit();

  const [isDropdownOpen,   setIsDropdownOpen]   = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const headerRef                               = useRef<HTMLElement>(null);
  const [headerHeight, setHeaderHeight]         = useState(0);

  const { isSafeOwner, safeAddress, threshold, ownerCount } = useSafeOwner();

  // Close mobile menu on route change 
  useEffect(() => {
    startTransition(() => setIsMobileMenuOpen(false));
  }, [location.pathname]);

  // Lock body scroll while mobile menu is open 
  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isMobileMenuOpen]);

  // Track real header height for mobile overlay offset 
  useEffect(() => {
    if (!headerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setHeaderHeight(entry.contentRect.height);
    });
    observer.observe(headerRef.current);
    return () => observer.disconnect();
  }, []);

  const isCorrectNetwork = isValidChain(chainId);
  const chainConfig      = appConfig.chain;
  const faucetUrl        = getFaucetUrl();

  const formatAddress = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const formatBalance = (bal: typeof balance) => {
    if (!bal) return '0';
    const formatted = parseFloat(formatUnits(bal.value, bal.decimals));
    return formatted.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
  };

  const isActive = (path: string) =>
    location.pathname === path
      ? 'text-forest-green font-bold'
      : 'text-gray-700 hover:text-forest-green';

  // Safe owners see Admin link (not Dashboard — they don't use the user panel)
  const navLinks = [
    { path: ROUTES.HOME,       label: t('nav.home')       },
    { path: ROUTES.CALCULATOR, label: t('nav.calculator') },
    { path: ROUTES.CONTACT,    label: t('nav.contact')    },
    { path: ROUTES.SALE,       label: 'Token Sale', isHighlighted: true },
    ...(isConnected && !isSafeOwner
      ? [{ path: ROUTES.DASHBOARD,       label: t('nav.dashboard') }]
      : []),
    ...(isSafeOwner
      ? [{ path: ROUTES.ADMIN_DASHBOARD, label: 'Admin', isAdmin: true }]
      : []),
  ];

  return (
    <header
      ref={headerRef}
      className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50"
    >
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">

        {/* ── Logo ── */}
        <Link to={ROUTES.HOME} className="flex items-center gap-3 group">
          <div className="w-17 h-17 rounded-lg overflow-hidden transition-transform group-hover:scale-110">
            <img src={logo} alt="Ethernal Logo" className="w-full h-full object-contain" />
          </div>
          <span className="text-xl font-bold text-gray-900 hidden sm:block group-hover:text-forest-green transition">
            ETHernal Fund
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8" aria-label="Main navigation">
          {navLinks.map((link) => {
            if (link.isHighlighted) {
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-all hover:scale-105"
                  style={{
                    background: 'linear-gradient(135deg, #897148, #b8965e)',
                    color:      '#f7f8f6',
                    boxShadow:  '0 0 12px rgba(137,113,72,0.35)',
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-200 animate-pulse" />
                  {link.label}
                </Link>
              );
            }

            if (link.isAdmin) {
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-all hover:scale-105 hover:opacity-90"
                  style={{
                    background: 'linear-gradient(135deg, #1a3a2a, #2d5c42)',
                    color:      '#e6f4ec',
                    boxShadow:  '0 0 12px rgba(26,58,42,0.35)',
                  }}
                  aria-label="Admin panel"
                >
                  <ShieldCheck size={14} className="shrink-0" />
                  {link.label}
                </Link>
              );
            }

            return (
              <Link key={link.path} to={link.path} className={isActive(link.path)}>
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Side */}
        <div className="flex items-center gap-3">

          {/* Language Switcher — Desktop */}
          <div className="hidden md:block">
            <LanguageSwitcher />
          </div>

          {/* Wallet — Desktop */}
          <div className="hidden md:block relative">
            {isConnected ? (
              <>
                <button
                  onClick={() => setIsDropdownOpen((v) => !v)}
                  className="flex items-center gap-2 px-4 py-2 bg-linear-to-r from-forest-green to-dark-blue text-white rounded-lg hover:opacity-90 transition"
                  aria-label={t('wallet.connectedWallet')}
                  aria-expanded={isDropdownOpen}
                  aria-haspopup="true"
                >
                  {isSafeOwner && (
                    <ShieldCheck size={15} className="shrink-0 opacity-80" aria-hidden="true" />
                  )}
                  <Wallet size={18} />
                  <span className="text-sm font-medium">{formatAddress(address!)}</span>
                  <ChevronDown
                    size={16}
                    className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {isDropdownOpen && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsDropdownOpen(false)}
                      aria-hidden="true"
                    />

                    {/* Dropdown */}
                    <div
                      className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden"
                      role="dialog"
                      aria-label={t('wallet.connectedWallet')}
                    >
                      {/* Wallet address header */}
                      <div className="p-4 bg-linear-to-r from-forest-green/10 to-dark-blue/10 border-b border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">
                              {t('wallet.connectedWallet')}
                            </h3>
                            {isSafeOwner && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-forest-green text-white text-xs font-semibold rounded-full">
                                <ShieldCheck size={10} />
                                Safe Owner
                              </span>
                            )}
                          </div>
                          <span
                            className="w-2 h-2 bg-green-500 rounded-full animate-pulse"
                            aria-label={t('wallet.correctNetwork')}
                          />
                        </div>
                        <div className="text-xs text-gray-600 font-mono break-all">
                          {address}
                        </div>
                      </div>

                      <div className="p-4 space-y-3">

                        {/* Balance */}
                        <div>
                          <div className="text-xs text-gray-500 mb-1">{t('wallet.balance')}</div>
                          <div className="text-lg font-bold text-gray-900">
                            {balance
                              ? `${formatBalance(balance)} ${balance.symbol}`
                              : t('common.loading')}
                          </div>
                        </div>

                        {/* Network */}
                        <div>
                          <div className="text-xs text-gray-500 mb-1">{t('wallet.network')}</div>
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-gray-900">
                                {chain?.name ?? t('wallet.unknownNetwork')}
                              </div>
                              <div className="text-xs text-gray-500">Chain ID: {chainId}</div>
                            </div>
                            {!isCorrectNetwork && (
                              <button
                                onClick={() => switchChain({ chainId: chainConfig.id })}
                                className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-lg border border-yellow-300 hover:bg-yellow-200 transition"
                              >
                                {t('wallet.switchTo')} {chainConfig.name}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Network status banner */}
                        {isCorrectNetwork ? (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
                            <CheckCircle className="text-green-600 shrink-0" size={16} />
                            <div className="text-xs text-green-800">
                              <strong>{t('wallet.correctNetwork')}</strong>{' '}
                              {t('wallet.connectedTo')} {chainConfig.name}.
                            </div>
                          </div>
                        ) : (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
                            <AlertTriangle className="text-yellow-600 shrink-0" size={16} />
                            <div className="text-xs text-yellow-800">
                              <strong>{t('wallet.wrongNetwork')}</strong>{' '}
                              {getChainErrorMessage(chainId)}
                            </div>
                          </div>
                        )}

                        {/* Safe Multisig card — visible to Safe owners only */}
                        {isSafeOwner && safeAddress && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <ShieldCheck size={13} className="text-forest-green shrink-0" />
                                <span className="text-xs font-semibold text-forest-green">
                                  Safe Multisig
                                </span>
                              </div>
                              {threshold !== undefined && (
                                <span className="text-xs text-green-700 font-mono bg-green-100 px-1.5 py-0.5 rounded">
                                  {threshold}-of-{ownerCount ?? '?'} sigs
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-green-800 font-mono">
                              {formatAddress(safeAddress)}
                            </div>
                            <div className="flex items-center gap-3 pt-0.5">
                              <a
                                href={getSafeAppUrl(safeAddress, chainId)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-forest-green hover:text-dark-blue flex items-center gap-1 transition-colors"
                              >
                                Safe App <ExternalLink size={11} />
                              </a>
                              <span className="text-green-300">·</span>
                              <a
                                href={getSafeTxQueueUrl(safeAddress, chainId)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-forest-green hover:text-dark-blue flex items-center gap-1 transition-colors"
                              >
                                Tx Queue <ExternalLink size={11} />
                              </a>
                            </div>
                          </div>
                        )}

                        {/* Admin Panel shortcut */}
                        {isSafeOwner && (
                          <Link
                            to={ROUTES.ADMIN_DASHBOARD}
                            onClick={() => setIsDropdownOpen(false)}
                            className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-lg text-sm font-semibold transition hover:opacity-90"
                            style={{
                              background: 'linear-gradient(135deg, #1a3a2a, #2d5c42)',
                              color:      '#e6f4ec',
                            }}
                          >
                            <ShieldCheck size={15} />
                            Admin Panel
                          </Link>
                        )}

                        {/* View full account */}
                        <button
                          onClick={() => {
                            setIsDropdownOpen(false);
                            void open({ view: 'Account' });
                          }}
                          className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
                        >
                          {t('wallet.viewFullAccount')}
                        </button>

                        {/* Disconnect */}
                        <button
                          onClick={() => {
                            logout();
                            setIsDropdownOpen(false);
                          }}
                          className="w-full px-4 py-2 bg-red-50 text-red-600 rounded-lg border border-red-200 hover:bg-red-100 transition text-sm font-medium"
                        >
                          {t('wallet.disconnect')}
                        </button>
                      </div>

                      {/* Faucet link — testnet only */}
                      {chainConfig.isTestnet && faucetUrl && (
                        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                          <a
                            href={faucetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-forest-green hover:text-dark-blue flex items-center gap-1"
                          >
                            {t('wallet.needTestEth')}
                            <ExternalLink size={12} />
                          </a>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            ) : (
              <button
                onClick={() => { void open(); }}
                className="btn btn-primary flex items-center gap-2"
              >
                <Wallet size={18} />
                <span>{t('nav.connectWallet')}</span>
              </button>
            )}
          </div>

          {/* Mobile Buttons */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => { void open(isConnected ? { view: 'Account' } : undefined); }}
              className="p-2 bg-linear-to-r from-forest-green to-dark-blue text-white rounded-lg hover:opacity-90 transition"
              aria-label={isConnected ? t('wallet.connectedWallet') : t('nav.connectWallet')}
            >
              <Wallet size={20} />
            </button>

            <button
              onClick={() => setIsMobileMenuOpen((v) => !v)}
              className="p-2 text-gray-700 hover:text-forest-green transition"
              aria-label={isMobileMenuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Panel — offset by real header height */}
          <div
            id="mobile-menu"
            className="fixed left-0 right-0 bottom-0 bg-white z-50 md:hidden overflow-y-auto"
            style={{ top: headerHeight }}
          >
            <nav className="flex flex-col p-6 space-y-4" aria-label="Mobile navigation">

              {/* Nav links */}
              {navLinks.map((link) => {
                if (link.isHighlighted) {
                  return (
                    <Link
                      key={link.path}
                      to={link.path}
                      className="flex items-center gap-2 text-lg py-3 px-4 rounded-lg font-semibold"
                      style={{
                        background: 'linear-gradient(135deg, #897148, #b8965e)',
                        color:      '#f7f8f6',
                      }}
                    >
                      <span className="w-2 h-2 rounded-full bg-amber-200 animate-pulse" />
                      {link.label}
                    </Link>
                  );
                }

                if (link.isAdmin) {
                  return (
                    <Link
                      key={link.path}
                      to={link.path}
                      className="flex items-center gap-2 text-lg py-3 px-4 rounded-lg font-semibold"
                      style={{
                        background: 'linear-gradient(135deg, #1a3a2a, #2d5c42)',
                        color:      '#e6f4ec',
                      }}
                    >
                      <ShieldCheck size={18} className="shrink-0" />
                      {link.label}
                    </Link>
                  );
                }

                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`text-lg py-3 px-4 rounded-lg transition ${
                      location.pathname === link.path
                        ? 'bg-forest-green text-white font-bold'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}

              {/* Language + Wallet info */}
              <div className="pt-4 border-t border-gray-200 space-y-4">
                <div>
                  <div className="text-xs text-gray-500 mb-2">{t('wallet.language')}</div>
                  <LanguageSwitcher />
                </div>

                {isConnected && (
                  <div className="space-y-3">
                    {/* Wallet info card */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-xs text-gray-500">{t('wallet.yourWallet')}</div>
                        {isSafeOwner && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-forest-green text-white text-xs font-semibold rounded-full">
                            <ShieldCheck size={10} />
                            Safe Owner
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-mono text-gray-900 break-all">{address}</div>
                      <div className="text-lg font-bold text-gray-900 mt-2">
                        {balance
                          ? `${formatBalance(balance)} ${balance.symbol}`
                          : t('common.loading')}
                      </div>
                    </div>

                    {/* Safe Multisig card — mobile */}
                    {isSafeOwner && safeAddress && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <ShieldCheck size={13} className="text-forest-green" />
                            <span className="text-xs font-semibold text-forest-green">
                              Safe Multisig
                            </span>
                          </div>
                          {threshold !== undefined && (
                            <span className="text-xs text-green-700 font-mono bg-green-100 px-1.5 py-0.5 rounded">
                              {threshold}-of-{ownerCount ?? '?'} sigs
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-green-800 font-mono">
                          {formatAddress(safeAddress)}
                        </div>
                        <div className="flex items-center gap-3">
                          <a
                            href={getSafeAppUrl(safeAddress, chainId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-forest-green flex items-center gap-1"
                          >
                            Safe App <ExternalLink size={11} />
                          </a>
                          <span className="text-green-300">·</span>
                          <a
                            href={getSafeTxQueueUrl(safeAddress, chainId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-forest-green flex items-center gap-1"
                          >
                            Tx Queue <ExternalLink size={11} />
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Switch network */}
                    {!isCorrectNetwork && (
                      <button
                        onClick={() => {
                          switchChain({ chainId: chainConfig.id });
                          setIsMobileMenuOpen(false);
                        }}
                        className="w-full px-4 py-3 bg-yellow-100 text-yellow-800 rounded-lg border border-yellow-300 hover:bg-yellow-200 transition font-medium"
                      >
                        {t('wallet.switchTo')} {chainConfig.name}
                      </button>
                    )}

                    {/* Disconnect */}
                    <button
                      onClick={() => {
                        logout();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full px-4 py-3 bg-red-50 text-red-600 rounded-lg border border-red-200 hover:bg-red-100 transition font-medium"
                    >
                      {t('wallet.disconnect')}
                    </button>
                  </div>
                )}
              </div>
            </nav>
          </div>
        </>
      )}
    </header>
  );
};

export default Navbar;