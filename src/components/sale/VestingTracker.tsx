import { formatUnits, type Hash } from 'viem'
import { useTranslation } from 'react-i18next'
import type { UserPurchase } from '@/sale/types'

interface Props {
  purchase:     UserPurchase
  cliffMonths:  number
  vestingMonths:number
  onClaim:      () => Promise<Hash>
  isPending:    boolean
  isConfirming: boolean
  isConfirmed:  boolean
}

export function VestingTracker({
  purchase,
  cliffMonths,
  vestingMonths: _vestingMonths,
  onClaim,
  isPending,
  isConfirming,
  isConfirmed,
}: Props) {
  const { t } = useTranslation('sale')

  const total     = Number(formatUnits(purchase.tokensBought,  18))
  const claimed   = Number(formatUnits(purchase.tokensClaimed, 18))
  const claimable = Number(formatUnits(purchase.claimable,     18))
  const vested    = Number(formatUnits(purchase.tokensVested,  18))
  const locked    = total - vested
  const vestedPct   = total > 0 ? (vested   / total) * 100 : 0
  const claimedPct  = total > 0 ? (claimed  / total) * 100 : 0
  const now          = Date.now() / 1000
  const start        = Number(purchase.startTime)
  const cliffSec     = cliffMonths * 30 * 24 * 3600
  const cliffEnd     = start + cliffSec
  const timeToCliff  = Math.max(0, cliffEnd - now)
  const pastCliff    = now >= cliffEnd
  const daysToCliff  = Math.ceil(timeToCliff / 86400)
  const canClaim = claimable > 0

  return (
    <div className="space-y-5">

      {/* Header */}
      <div>
        <div className="text-[10px] tracking-widest uppercase mb-1" style={{ color: '#555' }}>
          {t('vesting.title')}
        </div>
        <div className="flex items-baseline gap-3">
          <span
            className="text-3xl font-light"
            style={{ color: '#f7f8f6', fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            {total.toLocaleString('en-US', { maximumFractionDigits: 2 })}
          </span>
          <span className="text-sm" style={{ color: '#555' }}>{t('vesting.totalLabel')}</span>
        </div>
      </div>

      {/* Barra de vesting */}
      <div>
        <div
          className="h-2 rounded-full overflow-hidden mb-3 relative"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          {/* Vested (fondo) */}
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000"
            style={{
              width: `${vestedPct}%`,
              background: 'rgba(137,113,72,0.4)',
            }}
          />
          {/* Claimed (encima) */}
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000"
            style={{
              width: `${claimedPct}%`,
              background: 'linear-gradient(90deg, #7a6340, #c4a96a)',
            }}
          />
        </div>

        {/* Leyenda */}
        <div className="flex gap-4">
          {[
            { color: 'linear-gradient(90deg, #7a6340, #c4a96a)', label: t('vesting.legend.claimed') },
            { color: 'rgba(137,113,72,0.4)', label: t('vesting.legend.vestedAvailable') },
            { color: 'rgba(255,255,255,0.08)', label: t('vesting.legend.locked') },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: color }} />
              <span className="text-[10px] tracking-widest uppercase" style={{ color: '#555' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Grid de stats */}
      <div
        className="grid grid-cols-2 gap-px rounded-lg overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.05)' }}
      >
        {[
          { label: t('vesting.stats.vested'),    value: `${vested.toLocaleString('en-US', { maximumFractionDigits: 0 })} ETRF`, highlight: false },
          { label: t('vesting.stats.claimed'),   value: `${claimed.toLocaleString('en-US', { maximumFractionDigits: 0 })} ETRF`, highlight: false },
          { label: t('vesting.stats.locked'),    value: `${locked.toLocaleString('en-US', { maximumFractionDigits: 0 })} ETRF`, highlight: false },
          { label: t('vesting.stats.available'), value: `${claimable.toLocaleString('en-US', { maximumFractionDigits: 0 })} ETRF`, highlight: canClaim },
        ].map(({ label, value, highlight }) => (
          <div
            key={label}
            className="px-5 py-4"
            style={{ background: highlight ? 'rgba(137,113,72,0.08)' : 'rgba(12,11,10,0.6)' }}
          >
            <div className="text-[10px] tracking-widest uppercase mb-1.5" style={{ color: highlight ? '#897148' : '#555' }}>
              {label}
            </div>
            <div
              className="text-base font-light tabular-nums"
              style={{
                color: highlight ? '#c4a96a' : '#f7f8f6',
                fontFamily: 'var(--font-mono, monospace)',
              }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Cliff status */}
      {!pastCliff && (
        <div
          className="flex items-center gap-3 rounded px-4 py-3"
          style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.07)' }}
        >
          <div style={{ color: '#555' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="0.75"/>
              <path d="M7 4V7L9 9" stroke="currentColor" strokeWidth="0.75" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <div className="text-xs" style={{ color: '#555' }}>
              {t('vesting.cliff.inDays', { days: daysToCliff, months: cliffMonths })}
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: '#444' }}>
              {t('vesting.cliff.description')}
            </div>
          </div>
        </div>
      )}

      {/* Botón claim */}
      <button
        onClick={onClaim}
        disabled={!canClaim || isPending || isConfirming}
        className="w-full py-4 text-sm tracking-[0.15em] uppercase font-medium transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
        style={{
          background: canClaim && !isPending ? '#897148' : 'rgba(137,113,72,0.15)',
          color: '#f7f8f6',
          borderRadius: '2px',
          border: '0.5px solid rgba(137,113,72,0.3)',
        }}
      >
        {isPending || isConfirming ? (
          <span className="flex items-center justify-center gap-2">
            <span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
            {t('vesting.confirmWallet')}
          </span>
        ) : canClaim
          ? t('vesting.claim', { amount: claimable.toLocaleString('en-US', { maximumFractionDigits: 2 }) })
          : !pastCliff
          ? t('vesting.availableIn', { days: daysToCliff })
          : t('vesting.noTokens')
        }
      </button>
      {isConfirmed && (
        <p className="text-center text-xs" style={{ color: '#897148' }}>
          {t('vesting.claimed')}
        </p>
      )}

    </div>
  )
}