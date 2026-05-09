import { useState } from 'react';
import { useConnection } from 'wagmi';
import { useTranslation } from 'react-i18next';
import { useSale } from '@/hooks/useSale';
import { RoundProgress } from '@/components/sale/RoundProgress';
import { WalletGate } from '@/components/sale/WalletGate';
import { BuyForm } from '@/components/sale/BuyForm';
import { VestingTracker } from '@/components/sale/VestingTracker';
import { TokenomicsCard } from '@/components/sale/TokenomicsCard';
import { TokenomicsModal } from '@/components/sale/TokenomicsModal';

export default function SalePage() {
  const { isConnected } = useConnection();
  const { t } = useTranslation();
  const sale = useSale();
  const hasPurchased = sale.purchase?.hasPurchased ?? false;
  const isLoading = isConnected && !sale.round;

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

        {/* Header */}
        <header className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: '#897148' }}>
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
          <h1 className="text-4xl md:text-5xl font-light leading-tight mb-4" style={{ color: '#f7f8f6', fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
            {t('sale.page.title')}
          </h1>
          <p className="text-sm leading-relaxed max-w-md" style={{ color: '#555' }}>
            {t('sale.page.subtitle')}
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Columna izquierda */}
          <div
            className="rounded-lg p-8 lg:sticky lg:top-8 space-y-8"
            style={{ background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.07)' }}
          >
            {sale.round ? <RoundProgress round={sale.round} /> : <RoundSkeleton />}

            <TokenomicsCard onClick={() => setTokenomicsOpen(true)} />

            {/* Links */}
            <div className="pt-6 space-y-3" style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
              {[
                { label: t('sale.page.links.whitepaper'), href: 'https://ethernal.fund/whitepaper' },
                { label: t('sale.page.links.audit'),      href: 'https://ethernal.fund/audit' },
                { label: t('sale.page.links.docs'),       href: 'https://ethernal.fund/docs' },
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
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ color: '#444' }} className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                    <path d="M2 8L8 2M8 2H3M8 2V7" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Columna derecha */}
          <div className="rounded-lg p-8" style={{ background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.07)' }}>
            {!isConnected && <WalletGate />}

            {isConnected && isLoading && <FormSkeleton />}

            {isConnected && !isLoading && sale.round && (
              <>
                {hasPurchased && sale.purchase && (
                  <div className="mb-8">
                    <div className="text-[10px] tracking-widest uppercase mb-4" style={{ color: '#555' }}>
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

                {sale.round.status === 'active' && (
                  <BuyForm
                    round={sale.round}
                    usdcBalance={sale.usdcBalance}
                    usdcAllowance={sale.usdcAllowance}
                    calcTokensOut={sale.calcTokensOut}
                    needsApproval={sale.needsApproval}
                    onApprove={sale.approveUSDC}
                    onBuy={sale.buyTokens}
                    isPending={sale.isPending}
                    isConfirming={sale.isConfirming}
                    isConfirmed={sale.isConfirmed}
                    error={sale.error}
                  />
                )}

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

        <footer className="mt-16 pt-8" style={{ borderTop: '0.5px solid rgba(255,255,255,0.05)' }}>
          <p className="text-[11px] leading-relaxed max-w-2xl" style={{ color: '#333' }}>
            {t('sale.page.disclaimer')}
          </p>
        </footer>
      </div>

      <TokenomicsModal isOpen={tokenomicsOpen} onClose={() => setTokenomicsOpen(false)} />
    </div>
  );
}

function RoundSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-4 rounded w-1/3" style={{ background: 'rgba(255,255,255,0.06)' }} />
      <div className="h-8 rounded w-2/3" style={{ background: 'rgba(255,255,255,0.04)' }} />
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
      <div className="h-12 rounded" style={{ background: 'rgba(137,113,72,0.1)' }} />
    </div>
  );
}