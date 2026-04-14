import React from 'react';

export type OGLocale = 'es' | 'en' | 'pt' | 'zh' | 'fr' | 'de' | 'it';

interface OGContent {
  headline: string;
  tagline: string;
  pillars: [string, string, string];
  cta: string;
  font: string; 
}

const OG_CONTENT: Record<OGLocale, OGContent> = {
  es: {
    headline: 'Tu retiro,\ntu decisión.',
    tagline: 'El primer fondo de jubilación on-chain para todos.',
    pillars: ['Sin bancos', 'Sin intermediarios', 'Mínimas comisiones'],
    cta: 'ethernal.fund',
    font: 'Fraunces',
  },
  en: {
    headline: 'Your retirement,\nyour rules.',
    tagline: 'The first on-chain pension fund for everyone.',
    pillars: ['No banks', 'No middlemen', 'Minimal fees'],
    cta: 'ethernal.fund',
    font: 'Fraunces',
  },
  pt: {
    headline: 'Sua aposentadoria,\nsuas regras.',
    tagline: 'O primeiro fundo de pensão on-chain para todos.',
    pillars: ['Sem bancos', 'Sem intermediários', 'Taxas mínimas'],
    cta: 'ethernal.fund',
    font: 'Fraunces',
  },
  zh: {
    headline: '你的退休，\n你做主。',
    tagline: '首个面向所有人的链上养老基金',
    pillars: ['无银行', '无机构', '最低费用'],
    cta: 'ethernal.fund',
    font: 'Noto Serif SC',
  },
  fr: {
    headline: 'Votre retraite,\nvos règles.',
    tagline: 'Le premier fonds de pension on-chain pour tous.',
    pillars: ['Sans banque', 'Sans intermédiaires', 'Frais minimes'],
    cta: 'ethernal.fund',
    font: 'Fraunces',
  },
  de: {
    headline: 'Ihre Rente,\nihre Regeln.',
    tagline: 'Der erste On-Chain-Pensionsfonds für alle.',
    pillars: ['Ohne Bank', 'Ohne Mittelsmänner', 'Minimale Gebühren'],
    cta: 'ethernal.fund',
    font: 'Fraunces',
  },
  it: {
    headline: 'La tua pensione,\nle tue regole.',
    tagline: 'Il primo fondo pensione on-chain per tutti.',
    pillars: ['Senza banche', 'Senza intermediari', 'Commissioni minime'],
    cta: 'ethernal.fund',
    font: 'Fraunces',
  },
};

const ACCENT: Record<OGLocale, string> = {
  es: '#F5A623',   // ámbar
  en: '#4ADE80',   // verde esmeralda
  pt: '#34D399',   // verde menta
  zh: '#F87171',   // rojo coral
  fr: '#60A5FA',   // azul cielo
  de: '#A78BFA',   // violeta
  it: '#FB923C',   // naranja
};

interface OGImageProps {
  locale?: OGLocale;

  logoUrl?: string;
}

export const OGImage: React.FC<OGImageProps> = ({
  locale = 'es',
  logoUrl = '/ethernal-logo-transparente.png',
}) => {
  const content = OG_CONTENT[locale];
  const accent = ACCENT[locale];
  const isZh = locale === 'zh';

  const W = 1200;
  const H = 630;

  return (
    <div
      style={{
        width: W,
        height: H,
        position: 'relative',
        overflow: 'hidden',
        background: '#0A0F1E',
        fontFamily: isZh
          ? "'Noto Serif SC', serif"
          : "'Fraunces', Georgia, serif",
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── Google Fonts (solo en browser, no en SSR/export) ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,700;1,9..144,300&family=Noto+Serif+SC:wght@300;700&family=DM+Mono:wght@400&display=swap');
      `}</style>

      {/* ── Fondo: malla de gradiente ── */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `
          radial-gradient(ellipse 80% 60% at 15% 50%, #0D2B4E 0%, transparent 70%),
          radial-gradient(ellipse 60% 80% at 85% 20%, #0B3D2E 0%, transparent 65%),
          radial-gradient(ellipse 50% 50% at 60% 90%, #1A0A2E 0%, transparent 60%),
          #0A0F1E
        `,
      }} />

      {/* ── Textura grain sutil ── */}
      <svg style={{ position: 'absolute', inset: 0, opacity: 0.04, width: '100%', height: '100%' }}>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/>
          <feColorMatrix type="saturate" values="0"/>
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)"/>
      </svg>

      {/* ── Línea de acento diagonal ── */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        background: `linear-gradient(135deg, ${accent}18 0%, transparent 40%)`,
      }} />

      {/* ── Barra lateral de acento ── */}
      <div style={{
        position: 'absolute',
        left: 0, top: 0, bottom: 0,
        width: 6,
        background: `linear-gradient(to bottom, ${accent}, ${accent}40)`,
      }} />

      {/* ── Grid de puntos decorativos (esquina derecha) ── */}
      <div style={{
        position: 'absolute',
        right: 60, top: 60,
        display: 'grid',
        gridTemplateColumns: 'repeat(6, 12px)',
        gap: 10,
        opacity: 0.15,
      }}>
        {Array.from({ length: 36 }).map((_, i) => (
          <div key={i} style={{
            width: 3, height: 3,
            borderRadius: '50%',
            background: accent,
          }} />
        ))}
      </div>

      {/* ── Contenido principal ── */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        height: '100%',
        padding: '0 80px',
        gap: 60,
      }}>

        {/* COLUMNA IZQUIERDA — texto */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 24,
        }}>

          {/* Eyebrow */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <div style={{ width: 28, height: 2, background: accent }} />
            <span style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 13,
              letterSpacing: '0.2em',
              color: accent,
              textTransform: 'uppercase',
            }}>
              DeFi · Arbitrum · On-chain
            </span>
          </div>

          {/* Headline */}
          <div style={{
            fontSize: isZh ? 72 : 68,
            fontWeight: 700,
            lineHeight: 1.05,
            color: '#F8F4EE',
            letterSpacing: isZh ? '0.02em' : '-0.02em',
            whiteSpace: 'pre-line',
          }}>
            {content.headline}
          </div>

          {/* Tagline */}
          <div style={{
            fontSize: isZh ? 20 : 19,
            fontWeight: 300,
            color: '#94A3B8',
            lineHeight: 1.5,
            maxWidth: 520,
            fontStyle: isZh ? 'normal' : 'italic',
            letterSpacing: isZh ? '0.05em' : '0.01em',
          }}>
            {content.tagline}
          </div>

          {/* Pillars */}
          <div style={{
            display: 'flex',
            gap: 12,
            marginTop: 8,
          }}>
            {content.pillars.map((p, i) => (
              <div key={i} style={{
                padding: '7px 16px',
                border: `1px solid ${accent}50`,
                borderRadius: 4,
                fontSize: isZh ? 15 : 13,
                fontFamily: isZh ? "'Noto Serif SC', serif" : "'DM Mono', monospace",
                color: accent,
                letterSpacing: isZh ? '0.05em' : '0.08em',
                background: `${accent}0D`,
              }}>
                {p}
              </div>
            ))}
          </div>

          {/* CTA / URL */}
          <div style={{
            marginTop: 12,
            fontFamily: "'DM Mono', monospace",
            fontSize: 15,
            color: '#475569',
            letterSpacing: '0.1em',
          }}>
            {content.cta}
          </div>
        </div>

        {/* COLUMNA DERECHA — logo */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          {/* Halo de luz detrás del logo */}
          <div style={{
            position: 'relative',
            width: 220,
            height: 220,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={{
              position: 'absolute',
              inset: -30,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${accent}25 0%, transparent 70%)`,
            }} />
            <div style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: `1px solid ${accent}30`,
            }} />
            {/* Logo */}
            <img
              src={logoUrl}
              alt="Ethernal Fund"
              style={{
                width: 160,
                height: 160,
                objectFit: 'contain',
                position: 'relative',
                zIndex: 1,
                mixBlendMode: 'luminosity',
                filter: 'brightness(1.1)',
              }}
            />
          </div>

          {/* Wordmark debajo del logo */}
          <div style={{
            marginTop: 20,
            fontFamily: isZh ? "'Noto Serif SC', serif" : "'Fraunces', serif",
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: isZh ? '0.15em' : '0.25em',
            color: '#F8F4EE',
            textTransform: 'uppercase',
          }}>
            ETHERNAL
          </div>
          <div style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 11,
            letterSpacing: '0.3em',
            color: accent,
            textTransform: 'uppercase',
            marginTop: 4,
          }}>
            FUND
          </div>
        </div>
      </div>

      {/* ── Footer line ── */}
      <div style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        height: 3,
        background: `linear-gradient(to right, ${accent}, ${accent}60, transparent)`,
      }} />
    </div>
  );
};

export default OGImage;
