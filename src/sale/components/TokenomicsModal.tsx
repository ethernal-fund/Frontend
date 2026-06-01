import { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface TokenomicsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SLICE_KEYS = [
  { key: 'publicSale', pct: 30, color: '#D4A017' },
  { key: 'team',       pct: 20, color: '#c4a96a' },
  { key: 'ecosystem',  pct: 20, color: '#2A9D8F' },
  { key: 'treasury',   pct: 15, color: '#457B9D' },
  { key: 'community',  pct: 10, color: '#6D597A' },
  { key: 'reserve',    pct:  5, color: '#8D99AE' },
] as const;

const CX = 120;
const CY = 120;
const R  = 90;
const RI = 54;
const GAP_DEG = 2;

function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function slicePath(
  cx: number, cy: number,
  r: number, ri: number,
  startDeg: number, endDeg: number,
): string {
  const halfGap = GAP_DEG / 2;
  const s = startDeg + halfGap;
  const e = endDeg   - halfGap;
  const large = e - s > 180 ? 1 : 0;

  const o1 = polarToXY(cx, cy, r,  s);
  const o2 = polarToXY(cx, cy, r,  e);
  const i1 = polarToXY(cx, cy, ri, e);
  const i2 = polarToXY(cx, cy, ri, s);

  return [
    `M ${o1.x} ${o1.y}`,
    `A ${r} ${r} 0 ${large} 1 ${o2.x} ${o2.y}`,
    `L ${i1.x} ${i1.y}`,
    `A ${ri} ${ri} 0 ${large} 0 ${i2.x} ${i2.y}`,
    'Z',
  ].join(' ');
}

function DonutChart() {
  const { t } = useTranslation();

  let cursor = 0;
  const paths = SLICE_KEYS.map((s) => {
    const start = cursor;
    const end   = cursor + (s.pct / 100) * 360;
    cursor = end;
    return { ...s, start, end };
  });

  return (
    <svg
      viewBox="0 0 240 240"
      width="100%"
      style={{ maxWidth: 220, display: 'block', margin: '0 auto' }}
      aria-label="ETRF token distribution"
    >
      <defs>
        <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <circle cx={CX} cy={CY} r={RI} fill="#0d1221" />

      {paths.map((s) => (
        <path
          key={s.key}
          d={slicePath(CX, CY, R, RI, s.start, s.end)}
          fill={s.color}
          opacity={0.9}
          filter="url(#glow)"
        />
      ))}

      <text
        x={CX} y={CY - 8}
        textAnchor="middle"
        fill="#f7f8f6"
        fontSize="22"
        fontFamily="'Cormorant Garamond', Georgia, serif"
        fontWeight="300"
      >
        1B
      </text>
      <text
        x={CX} y={CY + 12}
        textAnchor="middle"
        fill="#555"
        fontSize="8"
        letterSpacing="2"
        fontFamily="system-ui, sans-serif"
      >
        {t('sale.tokenomics.supplyLabel', { defaultValue: 'ETRF SUPPLY' })}
      </text>
    </svg>
  );
}

export function TokenomicsModal({ isOpen, onClose }: TokenomicsModalProps) {
  const { t } = useTranslation();

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

  const slices = SLICE_KEYS.map((s) => ({
    ...s,
    label: t(`sale.tokenomics.slices.${s.key}`),
  }));

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(5,8,18,0.85)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '860px',
          maxHeight: '94vh',
          background: '#0d1221',
          borderRadius: '24px',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 -20px 80px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideUp .35s cubic-bezier(.32,1.2,.64,1) both',
        }}
      >
        {/* Handle + close */}
        <div style={{
          padding: '16px 24px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{
            width: 40, height: 4, borderRadius: 2,
            background: 'rgba(255,255,255,.15)',
            margin: '0 auto',
          }} />
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,.08)',
              border: '1px solid rgba(255,255,255,.1)',
              borderRadius: '50%',
              width: 36, height: 36,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              color: '#8899aa',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,.15)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,.08)')}
            aria-label={t('common.close')}
          >
            <X size={16} />
          </button>
        </div>

        {/* Contenido */}
        <div style={{ overflowY: 'auto', padding: '20px 28px 40px', flex: 1 }}>

          {/* Título */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <h2 style={{
              fontSize: '28px', fontWeight: 300, color: '#f7f8f6',
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              marginBottom: '6px',
            }}>
              {t('sale.tokenomics.title')}
            </h2>
            <p style={{ color: '#555', fontSize: '12px', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
              {t('sale.tokenomics.subtitle')}
            </p>
          </div>

          {/* Layout: chart + leyenda */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            gap: '32px',
            alignItems: 'center',
          }}
            className="flex-col-on-mobile"
          >
            {/* Donut */}
            <div style={{ minWidth: 180, maxWidth: 220 }}>
              <DonutChart />
            </div>

            {/* Leyenda */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {slices.map((s) => (
                <div key={s.key} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '0.5px solid rgba(255,255,255,0.06)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: s.color,
                      flexShrink: 0,
                      boxShadow: `0 0 6px ${s.color}55`,
                    }} />
                    <span style={{ fontSize: '13px', color: '#ccd6e0' }}>{s.label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{
                      fontSize: '13px', fontWeight: 500,
                      color: s.color,
                      fontFamily: 'monospace',
                    }}>
                      {s.pct}%
                    </span>
                    <span style={{ fontSize: '12px', color: '#444', fontFamily: 'monospace' }}>
                      {(s.pct * 10_000_000).toLocaleString('en-US')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer stats */}
          <div style={{
            marginTop: '28px',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 1,
            borderRadius: '10px',
            overflow: 'hidden',
            background: 'rgba(255,255,255,0.04)',
          }}>
            {[
              { 
                labelKey: 'sale.tokenomics.stats.totalSupply', 
                value: t('sale.tokenomics.stats.totalSupplyValue', { defaultValue: '1,000,000,000 ETRF' }) 
              },
              { 
                labelKey: 'sale.tokenomics.stats.seedRound',   
                value: t('sale.tokenomics.stats.seedRoundValue', { defaultValue: '100M tokens' }) 
              },
              { 
                labelKey: 'sale.tokenomics.stats.seedPrice',   
                value: t('sale.tokenomics.stats.seedPriceValue', { defaultValue: '$0.01 USDC' }) 
              },
            ].map(({ labelKey, value }) => (
              <div key={labelKey} style={{
                padding: '14px 16px',
                background: '#0d1221',
                textAlign: 'center',
              }}>
                <div style={{
                  fontSize: '10px', letterSpacing: '0.2em',
                  textTransform: 'uppercase', color: '#555',
                  marginBottom: '6px',
                }}>
                  {t(labelKey)}
                </div>
                <div style={{
                  fontSize: '13px', color: '#c4a96a',
                  fontFamily: 'monospace', fontWeight: 500,
                }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(60px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @media (max-width: 520px) {
          .flex-col-on-mobile {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}