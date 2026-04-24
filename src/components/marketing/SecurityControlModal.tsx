import { useEffect, useCallback } from 'react';
import { X, Lock, EyeOff, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';

function PillBadge({ label, color }: { label: string; color: 'blue' | 'green' | 'amber' }) {
  const palettes = {
    blue:  { bg: '#B5D4F4', text: '#0C447C' },
    green: { bg: '#C0DD97', text: '#27500A' },
    amber: { bg: '#FAC775', text: '#633806' },
  };
  const p = palettes[color];
  return (
    <span
      style={{
        fontSize: 11,
        padding: '3px 9px',
        borderRadius: 999,
        fontFamily: 'DM Mono, monospace',
        fontWeight: 700,
        background: p.bg,
        color: p.text,
        letterSpacing: '0.04em',
      }}
    >
      {label}
    </span>
  );
}

interface SecurityCardProps {
  icon: React.ReactNode;
  accentColor: string;
  accentBg: string;
  badgeColor: 'blue' | 'green' | 'amber';
  label: string;
  title: string;
  description: string;
  pills: string[];
}

function SecurityCard({ icon, accentColor, accentBg, badgeColor, label, title, description, pills }: SecurityCardProps) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 18,
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        position: 'relative',
        overflow: 'hidden',
        flex: 1,
        minWidth: 0,
      }}
    >
      {/* top accent bar */}
      <div
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: 3,
          background: accentColor,
        }}
      />

      {/* icon + label row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 36, height: 36, borderRadius: 8,
            background: accentBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <span
          style={{
            fontSize: 10,
            fontFamily: 'DM Mono, monospace',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            fontWeight: 700,
            color: accentColor,
          }}
        >
          {label}
        </span>
      </div>

      <p style={{ fontSize: 15, fontWeight: 700, margin: 0, color: '#e8f0ff', lineHeight: 1.3, letterSpacing: '-0.01em' }}>
        {title}
      </p>
      <p style={{ fontSize: 13, color: '#8899aa', lineHeight: 1.6, margin: 0, flex: 1 }}>
        {description}
      </p>

      {/* pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
        {pills.map(pill => (
          <PillBadge key={pill} label={pill} color={badgeColor} />
        ))}
      </div>
    </div>
  );
}

function SecurityControlContent() {
  const { t } = useTranslation();
  const cards: SecurityCardProps[] = [
    {
      icon: <Lock size={18} color="#185FA5" strokeWidth={1.6} />,
      accentColor: '#185FA5',
      accentBg: 'rgba(55,138,221,0.15)',
      badgeColor: 'blue',
      label: t('security.card.privacy.label', 'Privacidad'),
      title: t('security.card.privacy.title', 'Login Zero-Knowledge'),
      description: t(
        'security.card.privacy.description',
        'Sin usuarios ni contraseñas. Sin datos personales. Acceso únicamente mediante cuenta wallet — sin superficie de ataque para hackers ni datos que puedan ser vendidos.',
      ),
      pills: [
        t('security.pill.noPassword', 'Sin contraseñas'),
        t('security.pill.noPersonalData', 'Sin datos personales'),
        t('security.pill.antiHack', 'Anti-hackeo'),
      ],
    },
    {
      icon: <EyeOff size={18} color="#3B6D11" strokeWidth={1.6} />,
      accentColor: '#3B6D11',
      accentBg: 'rgba(99,153,34,0.15)',
      badgeColor: 'green',
      label: t('security.card.sovereignty.label', 'Soberanía'),
      title: t('security.card.sovereignty.title', 'Fondos No Rastreables'),
      description: t(
        'security.card.sovereignty.description',
        'Cuentas wallet anónimas: no son rastreables ni embargables. Sin políticos corruptos que puedan apropiarse de tus ahorros — tu dinero es tuyo y sólo tuyo.',
      ),
      pills: [
        t('security.pill.anonymous', 'Anónimo'),
        t('security.pill.nonSeizable', 'No embargable'),
        t('security.pill.noIntermediaries', 'Sin intermediarios'),
      ],
    },
    {
      icon: <Wallet size={18} color="#854F0B" strokeWidth={1.6} />,
      accentColor: '#854F0B',
      accentBg: 'rgba(186,117,23,0.15)',
      badgeColor: 'amber',
      label: t('security.card.succession.label', 'Sucesión'),
      title: t('security.card.succession.title', 'Smart Contract Automático'),
      description: t(
        'security.card.succession.description',
        'Sin trámites sucesorios ni identificación de beneficiarios. Al alcanzar la edad de retiro, el Smart Contract libera los fondos automáticamente a la wallet — hard wallet o app.',
      ),
      pills: [
        t('security.pill.noFormalities', 'Sin trámites'),
        t('security.pill.autoRetirement', 'Retiro automático'),
        t('security.pill.smartContract', 'Smart Contract'),
      ],
    },
  ];

  const stats = [
    { label: t('security.stat.exposed', 'Datos expuestos'),        value: t('security.stat.zero', 'Cero'),    color: '#185FA5' },
    { label: t('security.stat.identity', 'Identidad requerida'),   value: t('security.stat.none', 'Ninguna'), color: '#3B6D11' },
    { label: t('security.stat.formalities', 'Trámites sucesorios'), value: t('security.stat.none', 'Ninguno'), color: '#854F0B' },
  ];

  return (
    <div style={{ fontFamily: 'Outfit, sans-serif', color: '#ccd6e0' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>
        <div
          style={{
            width: 42, height: 42, borderRadius: 10,
            background: '#0C1A2E',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            border: '1px solid rgba(55,138,221,0.3)',
          }}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M11 2L3 6V11C3 15.4 6.4 19.5 11 20C15.6 19.5 19 15.4 19 11V6L11 2Z" fill="#378ADD" fillOpacity="0.9" />
            <path d="M8 11L10 13L14 9" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <p
            style={{
              fontSize: 10,
              fontFamily: 'DM Mono, monospace',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#8899aa',
              margin: '0 0 3px',
            }}
          >
            Ethernal Fund
          </p>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: '#e8f0ff', letterSpacing: '-0.02em' }}>
            {t('security.modalTitle', 'Seguridad & Control')}
          </h2>
        </div>
      </div>

      {/* Cards row */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        {cards.map(card => (
          <SecurityCard key={card.label} {...card} />
        ))}
      </div>

      {/* Divider */}
      <div
        style={{
          margin: '1.5rem 0',
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}
      />

      {/* Stats footer */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, textAlign: 'center', marginBottom: '1.25rem' }}>
        {stats.map(({ label, value, color }) => (
          <div key={label}>
            <span
              style={{
                display: 'block',
                fontSize: 10,
                fontFamily: 'DM Mono, monospace',
                color: '#8899aa',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: 4,
              }}
            >
              {label}
            </span>
            <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em', color }}>
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* Shield bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 13,
          padding: '14px 16px',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
          <path d="M10 2L3 5.5V10C3 14 6.1 17.7 10 18.5C13.9 17.7 17 14 17 10V5.5L10 2Z" fill="#378ADD" fillOpacity="0.15" stroke="#185FA5" strokeWidth="1.2" />
          <path d="M7 10l2 2 4-4" stroke="#185FA5" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p style={{ fontSize: 13, color: '#8899aa', lineHeight: 1.6, margin: 0 }}>
          <strong style={{ color: '#e8f0ff', fontWeight: 500 }}>
            {t('security.shieldTitle', 'Arquitectura sin custodia.')}
          </strong>{' '}
          {t(
            'security.shieldDescription',
            'El poseedor de la wallet es el único con acceso a los fondos — ni Ethernal Fund ni ningún tercero puede intervenir, embargar o redirigir los activos.',
          )}
        </p>
      </div>

      {/* Disclaimer */}
      <p
        style={{
          fontFamily: 'DM Mono, monospace',
          fontSize: 10,
          color: '#334455',
          letterSpacing: '1px',
          textAlign: 'center',
          marginTop: 20,
        }}
      >
        {t('security.disclaimer', 'ETHERNAL FUND · CONTRATO ON-CHAIN · ARBITRUM · NO CUSTODIAL')}
      </p>
    </div>
  );
}

interface SecurityControlModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SecurityControlModal({ isOpen, onClose }: SecurityControlModalProps) {
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleKey = useCallback(
    (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); },
    [onClose],
  );

  useEffect(() => {
    if (isOpen) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, handleKey]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(5,8,18,0.85)',
        backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 820,
          maxHeight: '92vh',
          background: '#0d1221',
          borderRadius: '24px 24px 0 0',
          border: '1px solid rgba(255,255,255,0.08)',
          borderBottom: 'none',
          boxShadow: '0 -20px 80px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideUp .35s cubic-bezier(.32,1.2,.64,1) both',
        }}
      >
        {/* drag handle + close */}
        <div
          style={{
            padding: '16px 24px 0',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,.15)', margin: '0 auto' }} />
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,.08)',
              border: '1px solid rgba(255,255,255,.1)',
              borderRadius: '50%',
              width: 36, height: 36,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#8899aa', transition: 'all .2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.15)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,.08)')}
          >
            <X size={16} />
          </button>
        </div>

        {/* scrollable body */}
        <div style={{ overflowY: 'auto', padding: '20px 28px 40px', flex: 1 }}>
          <SecurityControlContent />
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Outfit:wght@300;400;500;600;700&display=swap');
        @keyframes slideUp {
          from { transform: translateY(60px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}