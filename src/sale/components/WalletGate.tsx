import { useAppKit } from '@reown/appkit/react'
import { useTranslation } from 'react-i18next'

/**
 * WalletGate — shown on SalePage when the user is not connected.
 * Clicking "Connect" opens the AppKit modal; the user stays on /sale
 * and the page automatically transitions to the buy form once connected.
 */
export function WalletGate() {
  const { open } = useAppKit()
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">

      {/* Ícono */}
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-8"
        style={{ background: 'rgba(137,113,72,0.1)', border: '0.5px solid rgba(137,113,72,0.25)' }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M20 7H4C2.9 7 2 7.9 2 9V19C2 20.1 2.9 21 4 21H20C21.1 21 22 20.1 22 19V9C22 7.9 21.1 7 20 7Z"
            stroke="#897148" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"
          />
          <path d="M16 3L12 7L8 3" stroke="#897148" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="17" cy="14" r="1.5" fill="#897148"/>
        </svg>
      </div>

      {/* Copy */}
      <h3
        className="text-2xl font-light mb-3"
        style={{ color: '#f7f8f6', fontFamily: "'Cormorant Garamond', Georgia, serif" }}
      >
        {t('sale.walletGate.title')}
      </h3>
      <p className="text-sm leading-relaxed mb-8 max-w-xs" style={{ color: '#666' }}>
        {t('sale.walletGate.subtitle')}
      </p>

      {/* Wallets soportadas */}
      <div className="flex items-center gap-2 mb-10">
        {['MetaMask', 'Coinbase', 'WalletConnect'].map((w) => (
          <span
            key={w}
            className="text-[10px] tracking-widest uppercase px-2.5 py-1.5 rounded"
            style={{
              background: 'rgba(255,255,255,0.04)',
              color: '#555',
              border: '0.5px solid rgba(255,255,255,0.08)',
            }}
          >
            {w}
          </span>
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={() => open()}
        className="group relative px-10 py-3.5 text-sm tracking-[0.15em] uppercase font-medium transition-all duration-300"
        style={{
          background: '#897148',
          color: '#f7f8f6',
          borderRadius: '2px',
          letterSpacing: '0.15em',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = '#a08555'
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = '#897148'
        }}
      >
        {t('sale.walletGate.connect')}
      </button>

      {/* Disclaimer */}
      <p className="text-[11px] mt-6 max-w-xs leading-relaxed" style={{ color: '#444' }}>
        {t('sale.walletGate.disclaimer')}{' '}
        <a href="/terms" className="underline underline-offset-2" style={{ color: '#666' }}>
          {t('sale.walletGate.terms')}
        </a>.
      </p>

    </div>
  )
}