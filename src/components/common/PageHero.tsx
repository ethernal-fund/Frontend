/**
 * PageHero — shared hero section for all page domains.
 *
 * Consumes design tokens from tokens.css exclusively.
 * Zero hardcoded colors, zero hex values.
 *
 * Usage:
 *   <PageHero
 *     badge="Lectura obligatoria"
 *     badgeVariant="danger"
 *     title="Aviso de Riesgos"
 *     subtitle="Antes de usar Ethernal Fund, leé y entendé estos riesgos."
 *     meta="v1.0 · Abril 2026"
 *     warning="Este protocolo no está regulado..."   ← optional red banner
 *   />
 */

import { Link }        from 'react-router-dom';
import { ArrowLeft }   from 'lucide-react';
import { useTranslation } from 'react-i18next';

// ─── Types ────────────────────────────────────────────────────────────────────

export type BadgeVariant = 'brand' | 'accent' | 'danger' | 'muted';

export interface PageHeroProps {
  /** Small pill above the title */
  badge?:        string;
  badgeVariant?: BadgeVariant;

  /** Main heading */
  title:         string;

  /** Optional subtitle below the title */
  subtitle?:     string;

  /** Small metadata line (e.g. "Ethernal Fund · Abril 2026") */
  meta?:         string;

  /**
   * If provided, renders a full-width red warning banner below the hero.
   * Used in DisclaimerPage / RiskPage.
   */
  warning?:      string;

  /** Override the back link destination. Defaults to "/" */
  backTo?:       string;

  /** Show the top topbar with back link and version meta */
  showTopBar?:   boolean;

  /** Extra classes for the hero wrapper (e.g. to adjust padding) */
  className?:    string;
}

// ─── Badge color map (no hex — only CSS token references) ────────────────────

const BADGE_STYLES: Record<BadgeVariant, React.CSSProperties> = {
  brand:  {
    background: 'var(--color-brand-light)',
    color:      'var(--color-brand-dark)',
  },
  accent: {
    background: 'var(--color-accent)',
    color:      'var(--primitive-gray-900)',
  },
  danger: {
    background: 'var(--color-danger)',
    color:      'var(--primitive-white)',
  },
  muted: {
    background: 'rgba(255,255,255,0.12)',
    color:      'var(--color-text-on-dark)',
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function TopBar({ backTo, meta }: { backTo: string; meta?: string }) {
  const { t } = useTranslation();
  return (
    <div
      style={{
        background: 'var(--primitive-gray-800)',
        color:      'var(--color-text-on-dark)',
      }}
      className="py-4 px-4"
    >
      <div className="max-w-3xl mx-auto flex items-center justify-between">
        <Link
          to={backTo}
          className="flex items-center gap-2 text-sm transition"
          style={{ color: 'var(--color-text-tertiary)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-accent)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-tertiary)')}
        >
          <ArrowLeft size={16} />
          {t('common.back')}
        </Link>
        {meta && (
          <span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--primitive-text-xs)' }}>
            {meta}
          </span>
        )}
      </div>
    </div>
  );
}

function WarningBanner({ text }: { text: string }) {
  return (
    <div
      style={{ background: 'var(--color-danger)', color: 'var(--primitive-white)' }}
      className="py-3 px-4"
    >
      <div className="max-w-3xl mx-auto">
        <p className="text-sm font-semibold text-center">{text}</p>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export const PageHero: React.FC<PageHeroProps> = ({
  badge,
  badgeVariant = 'accent',
  title,
  subtitle,
  meta,
  warning,
  backTo       = '/',
  showTopBar   = true,
  className    = '',
}) => {
  return (
    <>
      {/* ── Top navigation bar ── */}
      {showTopBar && <TopBar backTo={backTo} meta={meta} />}

      {/* ── Hero gradient section ── */}
      <div
        style={{ background: 'var(--color-bg-hero)' }}
        className={`text-white py-12 px-4 ${className}`}
      >
        <div className="max-w-3xl mx-auto">
          {/* Badge */}
          {badge && (
            <div className="flex items-center gap-2 mb-3">
              <span
                style={{
                  ...BADGE_STYLES[badgeVariant],
                  fontSize:     'var(--primitive-text-xs)',
                  fontWeight:   600,
                  padding:      '3px 12px',
                  borderRadius: '999px',
                }}
              >
                {badge}
              </span>
            </div>
          )}

          {/* Title */}
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize:   'clamp(1.75rem, 4vw, 2.5rem)',
              fontWeight: 700,
              lineHeight: 1.15,
              marginBottom: subtitle ? '0.5rem' : 0,
              color: 'var(--color-text-on-dark)',
            }}
          >
            {title}
          </h1>

          {/* Subtitle */}
          {subtitle && (
            <p
              style={{
                color:    'var(--color-text-tertiary)',
                fontSize: 'var(--primitive-text-sm)',
                marginTop: '0.5rem',
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* ── Warning banner (optional) ── */}
      {warning && <WarningBanner text={warning} />}
    </>
  );
};

export default PageHero;