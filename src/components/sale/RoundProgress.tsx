import { formatUnits } from 'viem'
import { useTranslation } from 'react-i18next'
import type { RoundInfo } from '@/sale/types'
import { formatUSDC } from '@/services/saleService'

interface Props {
  round: RoundInfo
}

export function RoundProgress({ round }: Props) {
  const { t } = useTranslation('sale')

  const raisedNum  = Number(formatUnits(round.raised, 6))
  const hardCapNum = Number(formatUnits(round.hardCap, 6))
  const pct        = hardCapNum > 0 ? Math.min((raisedNum / hardCapNum) * 100, 100) : 0

  return (
    <div className="space-y-5">

      {/* Header de ronda */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span
              className="text-[10px] font-medium tracking-[0.2em] uppercase px-2.5 py-1 rounded-full"
              style={{
                background: round.status === 'active' ? 'rgba(137,113,72,0.15)' : 'rgba(255,255,255,0.06)',
                color:      round.status === 'active' ? '#c4a96a' : '#666',
                border:     `0.5px solid ${round.status === 'active' ? 'rgba(137,113,72,0.4)' : 'rgba(255,255,255,0.1)'}`,
              }}
            >
              {round.status === 'active' ? t('round.live') : t('round.ended')}
            </span>
            <span
              className="text-[10px] font-medium tracking-[0.2em] uppercase px-2.5 py-1 rounded-full"
              style={{
                background: 'rgba(255,255,255,0.04)',
                color: '#888',
                border: '0.5px solid rgba(255,255,255,0.08)',
              }}
            >
              {t('round.cliffVesting', { cliff: round.cliffMonths, vesting: round.vestingMonths })}
            </span>
          </div>
          <h2 className="text-xl font-light tracking-wide" style={{ color: '#f7f8f6', fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
            {round.name}
          </h2>
        </div>
        <div className="text-right">
          <div className="text-xs tracking-widest uppercase mb-1" style={{ color: '#666' }}>{t('round.price')}</div>
          <div className="text-2xl font-light" style={{ color: '#c4a96a', fontFamily: 'var(--font-mono, monospace)' }}>
            ${Number(formatUnits(round.price, 6)).toFixed(4)}
          </div>
          <div className="text-xs" style={{ color: '#555' }}>{t('round.perToken')}</div>
        </div>
      </div>

      {/* Barra de progreso */}
      <div>
        <div
          className="h-1.5 rounded-full overflow-hidden mb-3"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-1000 ease-out"
            style={{
              width: `${pct}%`,
              background: 'linear-gradient(90deg, #7a6340, #c4a96a)',
            }}
          />
        </div>

        <div className="flex justify-between items-center">
          <div>
            <div className="text-xs tracking-widest uppercase mb-0.5" style={{ color: '#555' }}>{t('round.raised')}</div>
            <div className="text-sm font-medium" style={{ color: '#f7f8f6', fontFamily: 'var(--font-mono, monospace)' }}>
              {formatUSDC(round.raised)}
            </div>
          </div>
          <div className="text-center">
            <div
              className="text-3xl font-light tabular-nums"
              style={{ color: pct > 75 ? '#c4a96a' : '#555', fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              {pct.toFixed(1)}%
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs tracking-widest uppercase mb-0.5" style={{ color: '#555' }}>{t('round.hardCap')}</div>
            <div className="text-sm font-medium" style={{ color: '#f7f8f6', fontFamily: 'var(--font-mono, monospace)' }}>
              {formatUSDC(round.hardCap)}
            </div>
          </div>
        </div>
      </div>

      {/* Stats secundarios */}
      <div
        className="grid grid-cols-3 gap-px rounded-lg overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.05)' }}
      >
        {[
          { labelKey: 'round.nextRoundPrice', value: '+50%' },
          { labelKey: 'round.walletCap',      value: formatUSDC(round.walletCap) },
          { labelKey: 'round.tokensRemaining', value: pct < 100 ? `${(100 - pct).toFixed(1)}%` : '0%' },
        ].map(({ labelKey, value }) => (
          <div
            key={labelKey}
            className="px-4 py-3 text-center"
            style={{ background: 'rgba(12,11,10,0.6)' }}
          >
            <div className="text-[10px] tracking-widest uppercase mb-1.5" style={{ color: '#555' }}>
              {t(labelKey)}
            </div>
            <div className="text-sm font-medium" style={{ color: '#c4a96a', fontFamily: 'var(--font-mono, monospace)' }}>
              {value}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}