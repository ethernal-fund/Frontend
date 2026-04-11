import { useState, useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ETHERNAL_FEE = 0.03;
const CORPORATE_FEES = {
  management:  0.015,
  entry:       0.03,
  performance: 0.20,
  admin:       0.005,
  exit:        0.01,
};
const AAVE_APY = 0.055;
const CORP_APY = 0.07;

interface SimResult {
  balance:        number;
  totalFeesPaid:  number;
  totalDeposited: number;
  history:        { year: number; balance: number; totalFeesPaid: number; totalDeposited: number }[];
}

function simulate(monthly: number, years: number, isEthernal: boolean): SimResult {
  const months = years * 12;
  let balance = 0, totalDeposited = 0, totalFeesPaid = 0;
  const history: SimResult['history'] = [];

  const monthlyRate = isEthernal
    ? AAVE_APY / 12
    : (CORP_APY - CORPORATE_FEES.management - CORPORATE_FEES.admin) / 12;

  for (let m = 1; m <= months; m++) {
    const entryFee   = monthly * (isEthernal ? ETHERNAL_FEE : CORPORATE_FEES.entry);
    const netDeposit = monthly - entryFee;
    totalDeposited  += monthly;
    totalFeesPaid   += entryFee;
    balance          = (balance + netDeposit) * (1 + monthlyRate);

    if (!isEthernal) {
      const mgmtFee = balance * (CORPORATE_FEES.management / 12);
      balance -= mgmtFee;
      totalFeesPaid += mgmtFee;
    }
    if (m % 12 === 0 || m === months)
      history.push({ year: Math.ceil(m / 12), balance, totalFeesPaid, totalDeposited });
  }

  if (!isEthernal) {
    const exitFee = balance * CORPORATE_FEES.exit;
    balance -= exitFee;
    totalFeesPaid += exitFee;
  }

  return { balance, totalFeesPaid, totalDeposited, history };
}

const fmt    = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const start    = display;
    const diff     = value - start;
    const t0       = performance.now();
    const duration = 700;
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(start + diff * e));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);

  return <span>{display.toLocaleString('es-AR')}</span>;
}

function MiniChart({ ethH, corpH }: { ethH: SimResult['history']; corpH: SimResult['history'] }) {
  const CHART_H = 100;
  const maxVal  = Math.max(...ethH.map(h => h.balance), ...corpH.map(h => h.balance));
  return (
    <div style={{ position: 'relative', height: `${CHART_H}px`, display: 'flex', alignItems: 'flex-end', gap: '5px' }}>
      {ethH.map((e, i) => {
        const c = corpH[i];
        if (!c) return null;
        const ethPx  = Math.max(4, (e.balance / maxVal) * CHART_H);
        const corpPx = Math.max(4, (c.balance / maxVal) * CHART_H);
        return (
          <div key={i} style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: '2px', height: '100%' }}>
            <div style={{ flex: 1, height: `${ethPx}px`, background: 'linear-gradient(to top,#00c896,#00e5b0)', borderRadius: '3px 3px 0 0', transition: 'height .5s cubic-bezier(.34,1.56,.64,1)' }} />
            <div style={{ flex: 1, height: `${corpPx}px`, background: 'linear-gradient(to top,#ff4d6d,#ff8099)', borderRadius: '3px 3px 0 0', transition: 'height .5s cubic-bezier(.34,1.56,.64,1)' }} />
          </div>
        );
      })}
    </div>
  );
}

function CompRow({ label, ethVal, corpVal, better }: { label: string; ethVal: string; corpVal: string; better?: 'eth' }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', alignItems: 'center' }}>
      <span style={{ color: '#8899aa', fontSize: '12px' }}>{label}</span>
      <div style={{ background: better === 'eth' ? 'rgba(0,200,150,.12)' : 'rgba(255,255,255,.04)', border: `1px solid ${better === 'eth' ? 'rgba(0,200,150,.3)' : 'rgba(255,255,255,.06)'}`, borderRadius: '9px', padding: '7px 10px', textAlign: 'center' }}>
        <span style={{ fontFamily: 'DM Mono,monospace', fontSize: '12px', color: better === 'eth' ? '#00e5b0' : '#ccd6e0' }}>{ethVal}</span>
        {better === 'eth' && <span style={{ marginLeft: 5, fontSize: 10, color: '#00c896' }}>✓</span>}
      </div>
      <div style={{ background: 'rgba(255,100,120,.08)', border: '1px solid rgba(255,100,120,.15)', borderRadius: '9px', padding: '7px 10px', textAlign: 'center' }}>
        <span style={{ fontFamily: 'DM Mono,monospace', fontSize: '12px', color: '#ff8099' }}>{corpVal}</span>
      </div>
    </div>
  );
}

function FeeComparisonContent() {
  const { t } = useTranslation();
  const [monthly, setMonthly] = useState(500);
  const [years,   setYears]   = useState(30);
  const [tab,     setTab]     = useState<'result' | 'breakdown' | 'fees'>('result');

  const eth  = simulate(monthly, years, true);
  const corp = simulate(monthly, years, false);

  const advantage  = eth.balance - corp.balance;
  const feesSaved  = corp.totalFeesPaid - eth.totalFeesPaid;
  const ethEff     = (eth.balance / eth.totalDeposited - 1) * 100;
  const corpEff    = (corp.balance / corp.totalDeposited - 1) * 100;
  const mPct       = ((monthly - 100) / (5000 - 100)) * 100;
  const yPct       = ((years - 5) / (40 - 5)) * 100;

  const s = {
    card:    { background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', borderRadius: '18px', padding: '22px', marginBottom: '16px' } as React.CSSProperties,
    slider:  { width: '100%', appearance: 'none' as const, height: '4px', borderRadius: '2px', outline: 'none', cursor: 'pointer' },
    tab:     (a: boolean) => ({ flex: 1, padding: '9px 0', border: a ? '1px solid rgba(0,200,150,.25)' : '1px solid transparent', background: a ? 'rgba(0,200,150,.15)' : 'transparent', color: a ? '#00e5b0' : '#8899aa', borderRadius: '9px', cursor: 'pointer', fontFamily: 'Outfit,sans-serif', fontSize: '13px', fontWeight: a ? 600 : 400, transition: 'all .2s' } as React.CSSProperties),
    insight: { display: 'flex', gap: '12px', alignItems: 'flex-start', background: 'rgba(0,200,150,.07)', border: '1px solid rgba(0,200,150,.2)', borderRadius: '13px', padding: '16px', marginBottom: '10px' } as React.CSSProperties,
  };

  const sliders = [
    { label: t('feeModal.monthlyDeposit'), val: fmt(monthly), min: 100, max: 5000, step: 50,  pct: mPct, onChange: (v: number) => setMonthly(v), lo: '$100',    hi: '$5.000'  },
    { label: t('feeModal.horizon'),        val: t('feeModal.years', { count: years }), min: 5, max: 40, step: 1, pct: yPct, onChange: (v: number) => setYears(v), lo: t('feeModal.yearsMin'), hi: t('feeModal.yearsMax') },
  ];

  return (
    <div style={{ fontFamily: 'Outfit,sans-serif', color: '#e8f0ff' }}>

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <span style={{ fontFamily: 'DM Mono,monospace', fontSize: '10px', letterSpacing: '3px', color: '#00c896', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
          {t('feeModal.headerLabel')}
        </span>
        <h2 style={{ fontFamily: 'DM Serif Display,serif', fontSize: 'clamp(26px,4vw,42px)', lineHeight: 1.05, fontWeight: 400, margin: '0 0 6px', background: 'linear-gradient(135deg,#e8f0ff,#a0b4cc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {t('feeModal.title')}
        </h2>
        <p style={{ color: '#8899aa', fontSize: '14px', margin: 0 }}>
          {t('feeModal.subtitle')}
        </p>
      </div>

      {/* Sliders */}
      <div style={s.card}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px' }}>
          {sliders.map(({ label, val, min, max, step, pct, onChange, lo, hi }) => (
            <div key={label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#8899aa' }}>{label}</span>
                <span style={{ fontFamily: 'DM Mono,monospace', color: '#00e5b0', fontSize: '15px', fontWeight: 500 }}>{val}</span>
              </div>
              <input
                type="range" min={min} max={max} step={step}
                value={label === t('feeModal.horizon') ? years : monthly}
                onChange={e => onChange(+e.target.value)}
                style={{ ...s.slider, background: `linear-gradient(to right,#00c896 0%,#00c896 ${pct}%,rgba(255,255,255,.1) ${pct}%,rgba(255,255,255,.1) 100%)` }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ fontSize: '10px', color: '#445566' }}>{lo}</span>
                <span style={{ fontSize: '10px', color: '#445566' }}>{hi}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hero cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
        <div style={{ borderRadius: '18px', padding: '22px 18px', border: '1px solid rgba(0,200,150,.25)', background: 'radial-gradient(ellipse at top left,rgba(0,200,150,.1) 0%,transparent 60%)' }}>
          <p style={{ fontFamily: 'DM Mono,monospace', fontSize: '10px', letterSpacing: '2px', color: '#8899aa', textTransform: 'uppercase', marginBottom: '8px' }}>🌿 Ethernal Fund</p>
          <p style={{ fontFamily: 'DM Serif Display,serif', fontSize: 'clamp(22px,3vw,34px)', color: '#00e5b0', margin: '0 0 6px', lineHeight: 1.1 }}>
            $<AnimatedNumber value={Math.round(eth.balance)} />
          </p>
          <p style={{ fontFamily: 'DM Mono,monospace', fontSize: '11px', color: '#8899aa' }}>{t('feeModal.ethFeeLabel')}</p>
          <p style={{ fontFamily: 'DM Mono,monospace', fontSize: '11px', color: '#8899aa' }}>{t('feeModal.ethApy', { apy: fmtPct(AAVE_APY) })}</p>
          <span style={{ display: 'inline-block', marginTop: '10px', background: 'linear-gradient(135deg,#00c896,#00a67e)', color: '#001a14', fontFamily: 'DM Mono,monospace', fontSize: '10px', fontWeight: 500, padding: '3px 9px', borderRadius: '20px', letterSpacing: '1px' }}>
            +{fmt(advantage)} {t('feeModal.extra')}
          </span>
        </div>
        <div style={{ borderRadius: '18px', padding: '22px 18px', border: '1px solid rgba(255,77,109,.2)', background: 'radial-gradient(ellipse at top left,rgba(255,77,109,.07) 0%,transparent 60%)' }}>
          <p style={{ fontFamily: 'DM Mono,monospace', fontSize: '10px', letterSpacing: '2px', color: '#8899aa', textTransform: 'uppercase', marginBottom: '8px' }}>🏦 {t('feeModal.corpName')}</p>
          <p style={{ fontFamily: 'DM Serif Display,serif', fontSize: 'clamp(22px,3vw,34px)', color: '#ff8099', margin: '0 0 6px', lineHeight: 1.1 }}>
            $<AnimatedNumber value={Math.round(corp.balance)} />
          </p>
          <p style={{ fontFamily: 'DM Mono,monospace', fontSize: '11px', color: '#8899aa' }}>{t('feeModal.corpFeeLabel')}</p>
          <p style={{ fontFamily: 'DM Mono,monospace', fontSize: '11px', color: '#8899aa' }}>{t('feeModal.corpApy', { apy: fmtPct(CORP_APY) })}</p>
        </div>
      </div>

      {/* Chart */}
      <div style={{ ...s.card, paddingBottom: '14px' }}>
        <div style={{ display: 'flex', gap: '14px', marginBottom: '12px' }}>
          {[['#00c896', 'Ethernal Fund'], ['#ff4d6d', t('feeModal.corpName')]].map(([c, l]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
              <span style={{ fontSize: '11px', color: '#8899aa' }}>{l}</span>
            </div>
          ))}
        </div>
        <MiniChart ethH={eth.history} corpH={corp.history} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
          {[t('feeModal.year1'), t('feeModal.yearMid', { year: Math.floor(years / 2) }), t('feeModal.yearEnd', { year: years })].map(l => (
            <span key={l} style={{ fontFamily: 'DM Mono,monospace', fontSize: '10px', color: '#445566' }}>{l}</span>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,.04)', borderRadius: '12px', padding: '4px', marginBottom: '16px' }}>
        {(['result', 'breakdown', 'fees'] as const).map((id, i) => (
          <button key={id} onClick={() => setTab(id)} style={s.tab(tab === id)}>
            {[t('feeModal.tabResults'), t('feeModal.tabBreakdown'), t('feeModal.tabFees')][i]}
          </button>
        ))}
      </div>

      {/* Tab: Resultados */}
      {tab === 'result' && (
        <div style={s.card}>
          {[
            ['💰', <><strong style={{color:'#e8f0ff'}}>{fmt(monthly)}/mes</strong> durante <strong style={{color:'#e8f0ff'}}>{years} años</strong> → Ethernal te da <strong style={{color:'#00e5b0'}}>{fmt(advantage)} más</strong>. Ahorrás <strong style={{color:'#00e5b0'}}>{fmt(feesSaved)}</strong> en comisiones.</>],
            ['📈', <>Retorno efectivo: <strong style={{color:'#00e5b0'}}>{ethEff.toFixed(1)}%</strong> en Ethernal vs <strong style={{color:'#ff8099'}}>{corpEff.toFixed(1)}%</strong> corporativo. Las comisiones compuestas destruyen valor con el tiempo.</>],
            ['🔐', <>Tu contrato vive on-chain en <strong style={{color:'#e8f0ff'}}>Arbitrum</strong>. Nadie puede mover tus fondos ni cambiar las reglas sin tu firma. Todo verificable en tiempo real.</>],
          ].map(([icon, text], i) => (
            <div key={i} style={s.insight}>
              <span style={{ fontSize: '18px' }}>{icon}</span>
              <span style={{ fontSize: '13px', color: '#b0c8d8', lineHeight: 1.6 }}>{text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Breakdown */}
      {tab === 'breakdown' && (
        <div style={s.card}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,.1)', marginBottom: '4px' }}>
            <span style={{ fontFamily: 'DM Mono,monospace', fontSize: '10px', color: '#8899aa', letterSpacing: '2px', textTransform: 'uppercase' }}>{t('feeModal.colMetric')}</span>
            <span style={{ fontFamily: 'DM Mono,monospace', fontSize: '10px', color: '#00e5b0', letterSpacing: '2px', textTransform: 'uppercase', textAlign: 'center' }}>🌿 Ethernal</span>
            <span style={{ fontFamily: 'DM Mono,monospace', fontSize: '10px', color: '#ff8099', letterSpacing: '2px', textTransform: 'uppercase', textAlign: 'center' }}>🏦 {t('feeModal.colCorp')}</span>
          </div>
          <CompRow label={t('feeModal.row.finalCapital')}     ethVal={fmt(eth.balance)}           corpVal={fmt(corp.balance)}           better="eth" />
          <CompRow label={t('feeModal.row.feesPaid')}         ethVal={fmt(eth.totalFeesPaid)}     corpVal={fmt(corp.totalFeesPaid)}     better="eth" />
          <CompRow label={t('feeModal.row.returnOnCapital')}  ethVal={`${ethEff.toFixed(1)}%`}    corpVal={`${corpEff.toFixed(1)}%`}   better="eth" />
          <CompRow label={t('feeModal.row.entryFee')}         ethVal={t('feeModal.row.ethEntry')} corpVal={t('feeModal.row.corpEntry')} better="eth" />
          <CompRow label={t('feeModal.row.annualFee')}        ethVal="0%"                         corpVal="1.5% + 0.5% admin"          better="eth" />
          <CompRow label={t('feeModal.row.exitFee')}          ethVal={t('feeModal.row.ethExit')}  corpVal={t('feeModal.row.corpExit')} better="eth" />
          <CompRow label={t('feeModal.row.transparency')}     ethVal={t('feeModal.row.ethTransparency')} corpVal={t('feeModal.row.corpTransparency')} better="eth" />
          <CompRow label={t('feeModal.row.custody')}          ethVal={t('feeModal.row.ethCustody')}     corpVal={t('feeModal.row.corpCustody')}     better="eth" />
        </div>
      )}

      {/* Tab: Fees */}
      {tab === 'fees' && (
        <div>
          <h3 style={{ fontFamily: 'DM Serif Display,serif', fontSize: '20px', color: '#00e5b0', margin: '0 0 12px' }}>🌿 {t('feeModal.ethStructureTitle')}</h3>
          {(t('feeModal.ethFees', { returnObjects: true }) as { label: string; value: string; desc: string }[]).map(({ label, value, desc }) => (
            <div key={label} style={{ background: 'rgba(0,200,150,.06)', border: '1px solid rgba(0,200,150,.2)', borderRadius: '13px', padding: '14px 18px', marginBottom: '10px' }}>
              <div style={{ fontSize: '12px', color: '#8899aa', marginBottom: '3px' }}>{label}</div>
              <div style={{ fontFamily: 'DM Mono,monospace', color: '#00e5b0', fontWeight: 500, fontSize: '13px' }}>{value}</div>
              <div style={{ fontSize: '11px', color: '#8899aa', marginTop: '4px' }}>{desc}</div>
            </div>
          ))}
          <h3 style={{ fontFamily: 'DM Serif Display,serif', fontSize: '20px', color: '#ff8099', margin: '16px 0 12px' }}>🏦 {t('feeModal.corpStructureTitle')}</h3>
          {(t('feeModal.corpFees', { returnObjects: true }) as { label: string; value: string; desc: string }[]).map(({ label, value, desc }) => (
            <div key={label} style={{ background: 'rgba(255,100,120,.06)', border: '1px solid rgba(255,100,120,.15)', borderRadius: '13px', padding: '14px 18px', marginBottom: '10px' }}>
              <div style={{ fontSize: '12px', color: '#8899aa', marginBottom: '3px' }}>{label}</div>
              <div style={{ fontFamily: 'DM Mono,monospace', color: '#ff8099', fontWeight: 500, fontSize: '13px' }}>{value}</div>
              <div style={{ fontSize: '11px', color: '#8899aa', marginTop: '4px' }}>{desc}</div>
            </div>
          ))}
        </div>
      )}

      {/* Disclaimer */}
      <p style={{ fontFamily: 'DM Mono,monospace', fontSize: '10px', color: '#334455', letterSpacing: '1px', textAlign: 'center', marginTop: '24px' }}>
        {t('feeModal.disclaimer')}
      </p>
    </div>
  );
}

interface FeeComparisonModalProps {
  isOpen:  boolean;
  onClose: () => void;
}

export function FeeComparisonModal({ isOpen, onClose }: FeeComparisonModalProps) {
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, handleKey]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(5,8,18,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: '820px', maxHeight: '92vh', background: '#0d1221', borderRadius: '24px 24px 0 0', border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none', boxShadow: '0 -20px 80px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', animation: 'slideUp .35s cubic-bezier(.32,1.2,.64,1) both' }}
      >
        <div style={{ padding: '16px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,.15)', margin: '0 auto' }} />
          <button
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#8899aa', transition: 'all .2s' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.15)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,.08)')}
          >
            <X size={16} />
          </button>
        </div>
        <div style={{ overflowY: 'auto', padding: '20px 28px 40px', flex: 1 }}>
          <FeeComparisonContent />
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&family=Outfit:wght@300;400;500;600;700&display=swap');
        @keyframes slideUp {
          from { transform: translateY(60px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px; height: 16px;
          border-radius: 50%;
          background: #00c896;
          cursor: pointer;
          border: 2px solid #0d1221;
          box-shadow: 0 0 0 2px rgba(0,200,150,.3);
        }
      `}</style>
    </div>
  );
}