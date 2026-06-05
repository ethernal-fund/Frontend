import { useState }            from 'react';
import { formatUnits }         from 'viem';
import { useConnection }       from 'wagmi';
import { useTranslation }      from 'react-i18next';
import { useSale }             from '@/sale/useSale';
import { formatUSDC }          from '@/sale/saleService';
import { RoundProgress }       from '@/sale/components/RoundProgress';
import { WalletGate }          from '@/sale/components/WalletGate';
import { BuyForm }             from '@/sale/components/BuyForm';
import { VestingTracker }      from '@/sale/components/VestingTracker';
import { TokenomicsCard }      from '@/sale/components/TokenomicsCard';
import { TokenomicsModal }     from '@/sale/components/TokenomicsModal';
import type { RoundInfo }      from '@/sale/types';

// ─────────────────────────────────────────────────────────────────────────────
// SalePage — public page, no wallet required to view
//
// Visibility rules:
//   Left column  → always visible (RoundProgress, TokenomicsCard, links)
//   Right column:
//     • disconnected        → PublicRoundSummary + WalletGate
//     • wrong chain         → WrongChain banner
//     • connected + loading → FormSkeleton
//     • connected + ready   → VestingTracker? + BuyForm / closed notice
// ─────────────────────────────────────────────────────────────────────────────

export default function SalePage() {
  const { isConnected } = useConnection();
  const { t }           = useTranslation();
  const sale            = useSale();
  const hasPurchased    = sale.purchase?.hasPurchased ?? false;
  const isWrongChain    = sale.isWrongChain;
  const isRoundLoading  = sale.isRoundLoading;
  const isActionLoading = isConnected && !isWrongChain && sale.isRoundLoading;

  const [tokenomicsOpen, setTokenomicsOpen] = useState(false);

  return (
    <div
      className="min-h-screen"
      style={{ background: '#0c0b0a', fontFamily: "'DM Sans', system-ui, sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400&family=DM+Sans:wght@300;400;500&family=DM+Mono&display=swap');
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>

      {/* Grain overlay */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")`,
          opacity: 0.4,
          zIndex: 0,
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-16">

        {/* ── Header ── */}
        <header className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: '#897148' }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <ellipse cx="4.5" cy="7" rx="3" ry="2" fill="none" stroke="#f7f8f6" strokeWidth="1.2"/>
                <ellipse cx="9.5" cy="7" rx="3" ry="2" fill="none" stroke="#f7f8f6" strokeWidth="1.2"/>
                <circle cx="7" cy="7" r="0.8" fill="#f7f8f6"/>
              </svg>
            </div>
            <span className="text-xs tracking-[0.3em] uppercase" style={{ color: '#555' }}>
              {t('sale.page.brand')}
            </span>
          </div>
          <h1
            className="text-4xl md:text-5xl font-light leading-tight mb-4"
            style={{ color: '#f7f8f6', fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            {t('sale.page.title')}
          </h1>
          <p className="text-sm leading-relaxed max-w-md" style={{ color: '#555' }}>
            {t('sale.page.subtitle')}
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

          {/* ══════════════════════════════════════════
              Left column — always visible, no wallet needed
          ══════════════════════════════════════════ */}
          <div
            className="rounded-lg p-8 lg:sticky lg:top-8 space-y-8"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '0.5px solid rgba(255,255,255,0.07)',
            }}
          >
            {isRoundLoading
              ? <RoundSkeleton />
              : sale.round
                ? <RoundProgress round={sale.round} />
                : <NoRoundBanner />
            }

            <TokenomicsCard onClick={() => setTokenomicsOpen(true)} />

            {/* External links */}
            <div
              className="pt-6 space-y-3"
              style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)' }}
            >
              {[
                { label: t('sale.page.links.whitepaper'), href: 'https://ethernal.fund/whitepaper' },
                { label: t('sale.page.links.audit'),      href: 'https://ethernal.fund/audit'      },
                { label: t('sale.page.links.docs'),       href: 'https://ethernal.fund/docs'       },
              ].map(({ label, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between group"
                >
                  <span className="text-xs tracking-widest uppercase" style={{ color: '#555' }}>
                    {label}
                  </span>
                  <svg
                    width="10" height="10" viewBox="0 0 10 10" fill="none"
                    style={{ color: '#444' }}
                    className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  >
                    <path d="M2 8L8 2M8 2H3M8 2V7" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* ══════════════════════════════════════════
              Right column — wallet-aware
          ══════════════════════════════════════════ */}
          <div
            className="rounded-lg p-8"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '0.5px solid rgba(255,255,255,0.07)',
            }}
          >

            {/* 1 · Disconnected: public info + connect CTA */}
            {!isConnected && (
              <>
                {sale.round && <PublicRoundSummary round={sale.round} />}
                <WalletGate />
              </>
            )}

            {/* 2 · Connected but wrong network */}
            {isConnected && isWrongChain && (
              <WrongChain
                onSwitch={sale.switchToSaleChain}
                isSwitching={sale.isSwitchingChain}
              />
            )}

            {/* 3 · Connected, correct chain, waiting for on-chain data */}
            {isConnected && !isWrongChain && isActionLoading && <FormSkeleton />}

            {/* 4 · Connected, correct chain, data ready */}
            {isConnected && !isWrongChain && !isActionLoading && sale.round && (
              <>
                {/* Vesting tracker — only when user has an existing purchase */}
                {hasPurchased && sale.purchase && (
                  <div className="mb-8">
                    <div
                      className="text-[10px] tracking-widest uppercase mb-4"
                      style={{ color: '#555' }}
                    >
                      {t('sale.vesting.myTokens')}
                    </div>
                    <VestingTracker
                      purchase={sale.purchase}
                      cliffMonths={sale.round.cliffMonths}
                      vestingMonths={sale.round.vestingMonths}
                      onClaim={sale.claimTokens}
                      isPending={sale.isPending}
                      isConfirming={sale.isConfirming}
                      isConfirmed={sale.isConfirmed}
                    />
                  </div>
                )}

                {/* Buy form — only while the round is active */}
                {sale.round.status === 'active' && (
                  <BuyForm
                    round={sale.round}
                    usdcBalance={sale.usdcBalance}
                    usdcAllowance={sale.usdcAllowance}
                    calcTokensOut={sale.calcTokensOut}
                    needsApproval={sale.needsApproval}
                    onApprove={sale.approveUSDC}
                    onBuy={sale.buyTokens}
                    onResetTx={sale.resetTxState}
                    isPending={sale.isPending}
                    isConfirming={sale.isConfirming}
                    isConfirmed={sale.isConfirmed}
                    error={sale.error}
                  />
                )}

                {/* Round closed and this wallet never participated */}
                {sale.round.status !== 'active' && !hasPurchased && (
                  <div className="text-center py-12">
                    <p className="text-sm" style={{ color: '#555' }}>
                      {t('sale.round.roundClosed')}
                    </p>
                  </div>
                )}
              </>
            )}

          </div>
        </div>

        {/* ── Footer disclaimer ── */}
        <footer
          className="mt-16 pt-8"
          style={{ borderTop: '0.5px solid rgba(255,255,255,0.05)' }}
        >
          <p className="text-[11px] leading-relaxed max-w-2xl" style={{ color: '#333' }}>
            {t('sale.page.disclaimer')}
          </p>
        </footer>
      </div>

      <TokenomicsModal isOpen={tokenomicsOpen} onClose={() => setTokenomicsOpen(false)} />
    </div>
  );
}

interface PublicRoundSummaryProps {
  round: RoundInfo;
}

function PublicRoundSummary({ round }: PublicRoundSummaryProps) {
  const { t } = useTranslation();

  const raisedNum  = Number(formatUnits(round.raised,  6));
  const hardCapNum = Number(formatUnits(round.hardCap, 6));
  const pct        = hardCapNum > 0 ? Math.min((raisedNum / hardCapNum) * 100, 100) : 0;

  return (
    <div
      className="mb-8 pb-8"
      style={{ borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}
    >
      {/* Round name + status badge */}
      <div className="flex items-center gap-3 mb-4">
        <span
          className="text-[10px] font-medium tracking-[0.2em] uppercase px-2.5 py-1 rounded-full"
          style={{
            background: round.status === 'active' ? 'rgba(137,113,72,0.15)' : 'rgba(255,255,255,0.06)',
            color:      round.status === 'active' ? '#c4a96a'               : '#666',
            border:     `0.5px solid ${round.status === 'active' ? 'rgba(137,113,72,0.4)' : 'rgba(255,255,255,0.1)'}`,
          }}
        >
          {round.status === 'active' ? t('sale.round.live') : t('sale.round.ended')}
        </span>
        <span
          className="text-sm font-light"
          style={{ color: '#f7f8f6', fontFamily: "'Cormorant Garamond', Georgia, serif" }}
        >
          {round.name}
        </span>
      </div>

      {/* Price + raised */}
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <div className="text-[10px] tracking-widest uppercase mb-1" style={{ color: '#555' }}>
            {t('sale.round.price')}
          </div>
          <div
            className="text-2xl font-light"
            style={{ color: '#c4a96a', fontFamily: 'var(--font-mono, monospace)' }}
          >
            ${Number(formatUnits(round.price, 6)).toFixed(4)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] tracking-widest uppercase mb-1" style={{ color: '#555' }}>
            {t('sale.round.raised')}
          </div>
          <div
            className="text-sm"
            style={{ color: '#f7f8f6', fontFamily: 'var(--font-mono, monospace)' }}
          >
            {formatUSDC(round.raised)}{' '}
            <span style={{ color: '#444' }}>/ {formatUSDC(round.hardCap)}</span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div
        className="h-1 rounded-full overflow-hidden mb-5"
        style={{ background: 'rgba(255,255,255,0.06)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #7a6340, #c4a96a)' }}
        />
      </div>

      {/* Vesting terms row */}
      <div className="flex gap-6">
        <div>
          <div className="text-[10px] tracking-widest uppercase mb-0.5" style={{ color: '#555' }}>
            {t('sale.buy.cliff')}
          </div>
          <div className="text-xs" style={{ color: '#888' }}>
            {t('sale.buy.cliffMonths', { months: round.cliffMonths })}
          </div>
        </div>
        <div>
          <div className="text-[10px] tracking-widest uppercase mb-0.5" style={{ color: '#555' }}>
            {t('sale.buy.vesting')}
          </div>
          <div className="text-xs" style={{ color: '#888' }}>
            {t('sale.buy.vestingLinear', { months: round.vestingMonths })}
          </div>
        </div>
        <div>
          <div className="text-[10px] tracking-widest uppercase mb-0.5" style={{ color: '#555' }}>
            {t('sale.round.walletCap')}
          </div>
          <div className="text-xs" style={{ color: '#888' }}>
            {formatUSDC(round.walletCap)}
          </div>
        </div>
      </div>
    </div>
  );
}

interface WrongChainProps {
  onSwitch:    () => void;
  isSwitching: boolean;
}

function WrongChain({ onSwitch, isSwitching }: WrongChainProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-8"
        style={{ background: 'rgba(224,82,82,0.08)', border: '0.5px solid rgba(224,82,82,0.25)' }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            stroke="#e05252" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"
          />
          <line x1="12" y1="9"  x2="12"    y2="13"   stroke="#e05252" strokeWidth="1"   strokeLinecap="round"/>
          <line x1="12" y1="17" x2="12.01" y2="17"   stroke="#e05252" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>

      <h3
        className="text-2xl font-light mb-3"
        style={{ color: '#f7f8f6', fontFamily: "'Cormorant Garamond', Georgia, serif" }}
      >
        {t('sale.wrongChain.title')}
      </h3>
      <p className="text-sm leading-relaxed mb-8 max-w-xs" style={{ color: '#666' }}>
        {t('sale.wrongChain.subtitle')}
      </p>

      <button
        onClick={onSwitch}
        disabled={isSwitching}
        className="px-10 py-3.5 text-sm tracking-[0.15em] uppercase font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background:   isSwitching ? 'rgba(137,113,72,0.3)' : '#897148',
          color:        '#f7f8f6',
          borderRadius: '2px',
        }}
      >
        {isSwitching ? (
          <span className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
            {t('sale.wrongChain.switching')}
          </span>
        ) : (
          t('sale.wrongChain.switch')
        )}
      </button>
    </div>
  );
}

function RoundSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-4 rounded w-1/3"  style={{ background: 'rgba(255,255,255,0.06)' }} />
      <div className="h-8 rounded w-2/3"  style={{ background: 'rgba(255,255,255,0.04)' }} />
      <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
      <div className="grid grid-cols-3 gap-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-12 rounded" style={{ background: 'rgba(255,255,255,0.03)' }} />
        ))}
      </div>
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-14 rounded" style={{ background: 'rgba(255,255,255,0.04)' }} />
      <div className="h-24 rounded" style={{ background: 'rgba(255,255,255,0.03)' }} />
      <div className="h-12 rounded" style={{ background: 'rgba(137,113,72,0.1)'  }} />
    </div>
  );
}
function NoRoundBanner() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center mb-5"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '0.5px solid rgba(255,255,255,0.08)',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="8.5" stroke="#444" strokeWidth="1" />
          <path d="M10 6v5M10 13.5v.5" stroke="#444" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </div>
      <p
        className="text-lg font-light mb-2"
        style={{ color: '#f7f8f6', fontFamily: "'Cormorant Garamond', Georgia, serif" }}
      >
        {t('sale.noRound.title', { defaultValue: 'No active round' })}
      </p>
      <p className="text-xs max-w-xs leading-relaxed" style={{ color: '#444' }}>
        {t('sale.noRound.subtitle', { defaultValue: 'There is no sale round open at this time. Check back soon.' })}
      </p>
    </div>
  );
}