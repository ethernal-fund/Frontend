import { useEffect, useState } from 'react';
import { Shield, GraduationCap, TrendingUp, ArrowRight } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useWallet } from '@/hooks/web3/useWallet';
import { useTranslation } from 'react-i18next';
import SEO from '@/components/common/SEO';
import { FeeComparisonModal } from '@/components/marketing/FeeComparisonModal';

type OGLocale = 'es' | 'en' | 'pt' | 'zh' | 'fr' | 'de' | 'it';

interface OGImageProps {
  locale: OGLocale;
  logoUrl?: string;
}

const OG_COPY: Record<OGLocale, { title: string; subtitle: string; cta: string }> = {
  en: {
    title: 'Your Retirement on the Blockchain',
    subtitle: 'Decentralized, transparent and low-fee savings — powered by Arbitrum.',
    cta: 'Start saving →',
  },
  es: {
    title: 'Tu Jubilación en la Blockchain',
    subtitle: 'Ahorro descentralizado, transparente y sin comisiones abusivas — sobre Arbitrum.',
    cta: 'Empezar a ahorrar →',
  },
  pt: {
    title: 'Sua Aposentadoria na Blockchain',
    subtitle: 'Poupança descentralizada, transparente e com taxas baixas — no Arbitrum.',
    cta: 'Comece a poupar →',
  },
  zh: {
    title: '区块链上的退休储蓄',
    subtitle: '去中心化、透明且低费用的储蓄——由 Arbitrum 驱动。',
    cta: '开始储蓄 →',
  },
  fr: {
    title: 'Votre Retraite sur la Blockchain',
    subtitle: 'Épargne décentralisée, transparente et à faibles frais — propulsée par Arbitrum.',
    cta: 'Commencer →',
  },
  de: {
    title: 'Ihre Rente auf der Blockchain',
    subtitle: 'Dezentrales, transparentes und günstiges Sparen — mit Arbitrum.',
    cta: 'Jetzt sparen →',
  },
  it: {
    title: 'Il Tuo Pensionamento sulla Blockchain',
    subtitle: 'Risparmio decentralizzato, trasparente e a basse commissioni — su Arbitrum.',
    cta: 'Inizia a risparmiare →',
  },
};

export const OGImage: React.FC<OGImageProps> = ({ locale, logoUrl }) => {
  const copy = OG_COPY[locale];

  return (
    <div
      style={{
        width: 1200,
        height: 630,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '64px 80px',
        background: 'linear-gradient(135deg, #1f2937 0%, #14532d 100%)',
        fontFamily: 'system-ui, sans-serif',
        color: '#ffffff',
        boxSizing: 'border-box',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Decorative circles */}
      <div
        style={{
          position: 'absolute',
          top: -120,
          right: -120,
          width: 480,
          height: 480,
          borderRadius: '50%',
          background: 'rgba(134,239,172,0.08)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -80,
          left: -80,
          width: 320,
          height: 320,
          borderRadius: '50%',
          background: 'rgba(134,239,172,0.05)',
          pointerEvents: 'none',
        }}
      />

      {/* Header row: logo + BETA badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {logoUrl && (
          <img
            src={logoUrl}
            alt="Logo"
            style={{ height: 48, width: 'auto', objectFit: 'contain' }}
          />
        )}
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.12em',
            padding: '4px 10px',
            borderRadius: 999,
            background: '#15803d',
            color: '#dcfce7',
          }}
        >
          BETA
        </span>
      </div>

      {/* Main copy */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 24 }}>
        <h1
          style={{
            fontSize: 64,
            fontWeight: 800,
            lineHeight: 1.1,
            margin: 0,
            maxWidth: 900,
          }}
        >
          {copy.title}
        </h1>
        <p
          style={{
            fontSize: 26,
            color: '#d1fae5',
            margin: 0,
            maxWidth: 780,
            lineHeight: 1.5,
          }}
        >
          {copy.subtitle}
        </p>
      </div>

      {/* Footer row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontSize: 20,
            fontWeight: 600,
            color: '#86efac',
            letterSpacing: '0.02em',
          }}
        >
          {copy.cta}
        </span>
        <div
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'center',
          }}
        >
          {(['🔒', '🎓', '📈'] as const).map((emoji, i) => (
            <span
              key={i}
              style={{
                fontSize: 28,
                background: 'rgba(255,255,255,0.08)',
                borderRadius: 12,
                padding: '6px 12px',
              }}
            >
              {emoji}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export const exportOGImage = async (locale: OGLocale): Promise<void> => {
  const { toPng } = await import('html-to-image');
  const node = document.getElementById(`og-${locale}`);
  if (!node) {
    console.warn(`[exportOGImage] Node #og-${locale} not found. Make sure OGImagePortal is mounted.`);
    return;
  }
  const dataUrl = await toPng(node, { width: 1200, height: 630, pixelRatio: 1 });
  const link = document.createElement('a');
  link.download = `og-image-${locale}.png`;
  link.href = dataUrl;
  link.click();
};

const ALL_LOCALES: OGLocale[] = ['es', 'en', 'pt', 'zh', 'fr', 'de', 'it'];
const OGImagePortal: React.FC<{ logoUrl?: string }> = ({ logoUrl }) => (
  <div aria-hidden="true" style={{ position: 'absolute', left: -9999, top: 0, pointerEvents: 'none' }}>
    {ALL_LOCALES.map(locale => (
      <div key={locale} id={`og-${locale}`}>
        <OGImage locale={locale} logoUrl={logoUrl} />
      </div>
    ))}
  </div>
);

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { isConnected, disconnect, openModal } = useWallet();
  const { t, i18n } = useTranslation();
  const [feeModalOpen, setFeeModalOpen] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('autoDisconnectHome') === 'true' && isConnected) {
      disconnect();
      sessionStorage.removeItem('autoDisconnectHome');
    }
  }, [isConnected, disconnect]);

  const handleGetStarted = () => {
    if (isConnected) void navigate('/calculator');
    else openModal();
  };

  const features = [
    { icon: Shield,        key: 'security',  onClick: undefined },
    { icon: GraduationCap, key: 'education', onClick: undefined },
    { icon: TrendingUp,    key: 'fees',      onClick: () => setFeeModalOpen(true) },
  ] as const;

  return (
    <>
      <SEO
        title={t('hero.title')}
        description={t('hero.subtitle')}
        keywords={['retirement', 'blockchain', 'DeFi', 'Arbitrum', 'decentralized', 'savings', 'ethereum', 'vyper', 'fund']}
        locale={i18n.language}
      />

      {/* Off-screen OG frames — only needed during local export; safe to keep in prod
          since it's aria-hidden and outside the viewport. Remove after committing PNGs. */}
      {import.meta.env.DEV && <OGImagePortal logoUrl="/logo.png" />}

      <div className="pt-4">

        {/* ── Beta Banner ── */}
        <div className="flex items-center justify-center gap-3 px-4 py-2.5 bg-green-50 border-b border-green-200">
          <span className="text-[10px] font-semibold tracking-widest px-2.5 py-0.5 rounded-full bg-green-700 text-green-50 select-none">
            BETA
          </span>
          <span className="text-sm text-green-900">
            {t('beta.bannerText')}
          </span>
          <Link
            to="/survey"
            className="text-sm font-semibold text-green-700 underline underline-offset-2 hover:text-green-800 transition-colors"
          >
            {t('beta.bannerCta')}
          </Link>
        </div>

        {/* Hero */}
        <section className="bg-linear-to-b from-gray-800 to-green-800 text-white py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-6">{t('hero.title')}</h1>
            <p className="text-xl mb-8 text-gray-200">{t('hero.subtitle')}</p>
            <button
              onClick={handleGetStarted}
              className="bg-yellow-600 hover:bg-yellow-700 text-gray-900 px-8 py-4 rounded-lg font-semibold text-lg transition flex items-center gap-2 mx-auto shadow-lg"
            >
              {isConnected ? t('hero.ctaConnected') : t('hero.ctaDisconnected')}
            </button>
          </div>
        </section>

        {/* Survey Banner */}
        <section className="py-10 px-4 bg-linear-to-br from-blue-50 to-green-50">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-gray-700 text-lg mb-4">
              🙌 {t('survey.bannerText')}
            </p>
            <Link
              to="/survey"
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition shadow-md"
            >
              {t('survey.bannerCta')}
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-12 text-gray-800">
              {t('features.title')}
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {features.map(({ icon: Icon, key, onClick }) => {
                const isInteractive = !!onClick;
                return (
                  <div
                    key={key}
                    onClick={onClick}
                    className={[
                      'bg-white rounded-xl p-6 shadow-lg transition-all group',
                      isInteractive
                        ? 'hover:shadow-2xl cursor-pointer hover:-translate-y-1 hover:ring-2 hover:ring-green-400/40 relative overflow-hidden'
                        : 'hover:shadow-xl',
                    ].join(' ')}
                  >
                    {isInteractive && (
                      <div className="absolute inset-0 bg-linear-to-br from-green-50/60 to-emerald-50/40 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    )}

                    <Icon className="text-green-600 mb-4" size={40} />
                    <h3 className="text-xl font-semibold mb-3 text-gray-800">
                      {t(`features.${key}.title`)}
                    </h3>
                    <p className="text-gray-600">{t(`features.${key}.description`)}</p>

                    {isInteractive && (
                      <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full group-hover:bg-green-100 transition">
                        {t('features.fees.cta')}
                        <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* About */}
        <section className="bg-gray-100 py-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-6 text-gray-800">{t('about.title')}</h2>
            <p className="text-lg text-gray-700 leading-relaxed">{t('about.description')}</p>
          </div>
        </section>

      </div>

      <FeeComparisonModal
        isOpen={feeModalOpen}
        onClose={() => setFeeModalOpen(false)}
      />
    </>
  );
};

export default HomePage;