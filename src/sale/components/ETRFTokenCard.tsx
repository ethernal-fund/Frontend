import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Coins, Zap, PercentIcon, ArrowRight, ShoppingCart,
  CheckCircle, Clock, TrendingUp, ChevronDown, ChevronUp,
} from 'lucide-react'

export interface ETRFTokenStatus {
  balance: number
  usedForPremium: number
  usedForFeeReduction: number
  premiumActive: boolean
  feeReductionActive: boolean
  /** Current fee reduction percentage (e.g. 25 = 25%) */
  feeReductionPct: number
  /** Token price in the current round, in USDC */
  currentPrice: number
  /** Whether sale round is live */
  saleActive: boolean
  premiumThreshold: number
  feeReductionThreshold: number
  totalAcquired: number
  vested: number
  claimed: number
}

interface Props {
  status: ETRFTokenStatus
  onBuyClick: () => void
}

function fmt(n: number, dec = 0) {
  return n.toLocaleString('en-US', { maximumFractionDigits: dec })
}

function BenefitPill({
  icon: Icon,
  label,
  active,
  detail,
}: {
  icon: React.ElementType
  label: string
  active: boolean
  detail?: string
}) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-lg"
      style={
        active
          ? { background: 'rgba(137,113,72,0.12)', border: '0.5px solid rgba(196,169,106,0.35)' }
          : { background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.07)' }
      }
    >
      <div
        className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
        style={{ background: active ? 'rgba(137,113,72,0.25)' : 'rgba(255,255,255,0.05)' }}
      >
        <Icon size={12} style={{ color: active ? '#c4a96a' : '#444' }} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] tracking-widest uppercase font-medium" style={{ color: active ? '#c4a96a' : '#555' }}>
          {label}
        </p>
        {detail && (
          <p className="text-[10px] mt-0.5" style={{ color: active ? '#897148' : '#3a3a3a' }}>
            {detail}
          </p>
        )}
      </div>
      <div className="ml-auto">
        {active ? (
          <CheckCircle size={11} style={{ color: '#c4a96a' }} />
        ) : (
          <Clock size={11} style={{ color: '#333' }} />
        )}
      </div>
    </div>
  )
}

export function ETRFTokenCard({ status, onBuyClick }: Props) {
  const [expanded, setExpanded] = useState(false)
  const navigate = useNavigate()

  const remaining     = status.balance - status.usedForPremium - status.usedForFeeReduction
  const usedTotal     = status.usedForPremium + status.usedForFeeReduction
  const usedPct       = status.balance > 0 ? (usedTotal / status.balance) * 100 : 0
  const vestedPct     = status.totalAcquired > 0 ? (status.vested / status.totalAcquired) * 100 : 0
  const noBenefits    = !status.premiumActive && !status.feeReductionActive

  // Tokens still needed to unlock next benefit
  const tokensForPremium      = Math.max(0, status.premiumThreshold - status.balance)
  const tokensForFeeReduction = Math.max(0, status.feeReductionThreshold - status.balance)
  const showNextStep          = noBenefits || (!status.premiumActive && status.feeReductionActive)

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.025)', border: '0.5px solid rgba(255,255,255,0.07)' }}
    >
      {/* ── Header ── */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(137,113,72,0.15)', border: '0.5px solid rgba(137,113,72,0.3)' }}
            >
              <Coins size={15} style={{ color: '#c4a96a' }} />
            </div>
            <div>
              <span className="text-[10px] tracking-[0.25em] uppercase font-medium" style={{ color: '#555' }}>
                ETRF Token
              </span>
              {status.saleActive && (
                <span
                  className="ml-2 text-[9px] tracking-widest uppercase px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(137,113,72,0.15)', color: '#c4a96a', border: '0.5px solid rgba(196,169,106,0.3)' }}
                >
                  Venta activa
                </span>
              )}
            </div>
          </div>

          {/* Balance principal */}
          <div className="text-right">
            <p
              className="text-2xl font-light tabular-nums"
              style={{ color: '#f7f8f6', fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              {fmt(status.balance, 2)}
            </p>
            <p className="text-[10px] tracking-widest uppercase" style={{ color: '#444' }}>
              ETRF balance
            </p>
          </div>
        </div>

        {/* ── Benefits row ── */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <BenefitPill
            icon={Zap}
            label="Premium"
            active={status.premiumActive}
            detail={
              status.premiumActive
                ? 'Activo'
                : `Necesitás ${fmt(tokensForPremium)} ETRF más`
            }
          />
          <BenefitPill
            icon={PercentIcon}
            label={`Fee −${status.feeReductionActive ? status.feeReductionPct : 0}%`}
            active={status.feeReductionActive}
            detail={
              status.feeReductionActive
                ? `−${status.feeReductionPct}% en comisiones`
                : `Necesitás ${fmt(tokensForFeeReduction)} ETRF más`
            }
          />
        </div>

        {/* ── Usage bar ── */}
        {status.balance > 0 && (
          <div className="mb-1">
            <div className="flex justify-between items-baseline mb-1.5">
              <span className="text-[10px] tracking-widest uppercase" style={{ color: '#444' }}>Tokens utilizados</span>
              <span className="text-[10px] font-mono" style={{ color: '#555' }}>
                {fmt(usedTotal)} / {fmt(status.balance)} ETRF
              </span>
            </div>
            <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${usedPct}%`,
                  background: 'linear-gradient(90deg, #7a6340, #c4a96a)',
                }}
              />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[9px]" style={{ color: '#3a3a3a' }}>
                Premium: {fmt(status.usedForPremium)}
              </span>
              <span className="text-[9px]" style={{ color: '#3a3a3a' }}>
                Fee red.: {fmt(status.usedForFeeReduction)}
              </span>
              <span className="text-[9px]" style={{ color: '#555' }}>
                Libre: {fmt(remaining)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Expandable: vesting + acquisition detail ── */}
      {status.totalAcquired > 0 && (
        <>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="w-full flex items-center justify-between px-6 py-2.5 transition-opacity hover:opacity-70"
            style={{ borderTop: '0.5px solid rgba(255,255,255,0.05)', color: '#444' }}
          >
            <span className="text-[10px] tracking-widest uppercase">Detalle de adquisición</span>
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          {expanded && (
            <div className="px-6 pb-4 space-y-3">
              {/* Vesting mini-bar */}
              <div>
                <div className="flex justify-between mb-1.5">
                  <span className="text-[10px] tracking-widest uppercase" style={{ color: '#444' }}>Vesting</span>
                  <span className="text-[10px] font-mono" style={{ color: '#555' }}>
                    {vestedPct.toFixed(1)}% vestido
                  </span>
                </div>
                <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  {/* vested (faded gold) */}
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${vestedPct}%`, background: 'rgba(137,113,72,0.5)' }}
                  />
                </div>
              </div>

              {/* Stats grid */}
              <div
                className="grid grid-cols-3 gap-px rounded-lg overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.04)' }}
              >
                {[
                  { label: 'Adquiridos',   value: fmt(status.totalAcquired) },
                  { label: 'Vestido',       value: fmt(status.vested) },
                  { label: 'Reclamado',     value: fmt(status.claimed) },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="px-3 py-3 text-center"
                    style={{ background: 'rgba(12,11,10,0.6)' }}
                  >
                    <p className="text-[9px] tracking-widest uppercase mb-1" style={{ color: '#444' }}>{label}</p>
                    <p className="text-xs font-mono font-medium" style={{ color: '#888' }}>{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── CTA footer ── */}
      <div
        className="px-6 py-4"
        style={{ borderTop: '0.5px solid rgba(255,255,255,0.05)' }}
      >
        {/* Next step hint */}
        {showNextStep && (
          <div
            className="flex items-start gap-2.5 rounded-lg px-3 py-2.5 mb-3"
            style={{ background: 'rgba(137,113,72,0.06)', border: '0.5px solid rgba(137,113,72,0.15)' }}
          >
            <TrendingUp size={12} className="shrink-0 mt-0.5" style={{ color: '#897148' }} />
            <div>
              <p className="text-[10px] font-medium tracking-wide" style={{ color: '#897148' }}>
                {!status.premiumActive && tokensForPremium > 0
                  ? `Comprá ${fmt(tokensForPremium)} ETRF para activar Premium`
                  : `Comprá ${fmt(tokensForFeeReduction)} ETRF para reducir tus comisiones`}
              </p>
              <p className="text-[9px] mt-0.5" style={{ color: '#555' }}>
                Precio actual: ${status.currentPrice.toFixed(4)} USDC / ETRF
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={onBuyClick}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200"
            style={{
              background: status.saleActive ? '#897148' : 'rgba(137,113,72,0.2)',
              color: status.saleActive ? '#f7f8f6' : '#666',
              border: '0.5px solid rgba(137,113,72,0.4)',
              opacity: status.saleActive ? 1 : 0.6,
              cursor: status.saleActive ? 'pointer' : 'default',
            }}
          >
            <ShoppingCart size={13} />
            {status.saleActive ? 'Comprar ETRF' : 'Venta no activa'}
          </button>

          <button
            onClick={() => navigate('/sale')}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium transition-opacity hover:opacity-70"
            style={{ background: 'rgba(255,255,255,0.04)', color: '#555', border: '0.5px solid rgba(255,255,255,0.08)' }}
          >
            Ver todo
            <ArrowRight size={11} />
          </button>
        </div>
      </div>
    </div>
  )
}