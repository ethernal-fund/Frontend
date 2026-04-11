import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ExternalLink } from 'lucide-react';

interface Section {
  heading: string;
  body: string | string[];   // string = párrafo, string[] = bullets
}

interface LegalPageProps {
  docKey:     'privacy' | 'terms' | 'disclaimer';
  version:    string;
  effectiveDate: string;
  sections:   Section[];
  /** mostrar badge de advertencia roja (solo disclaimer) */
  warning?:   string;
}

const LegalPage: React.FC<LegalPageProps> = ({
  docKey,
  version,
  effectiveDate,
  sections,
  warning,
}) => {
  const { t } = useTranslation();

  // Scroll to top on mount
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const titleKey = `legal.${docKey}.title` as const;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">

      {/* ── Top bar ── */}
      <div className="bg-gray-800 text-white py-4 px-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-gray-300 hover:text-yellow-400 transition text-sm"
          >
            <ArrowLeft size={16} />
            {t('common.back')}
          </Link>
          <span className="text-xs text-gray-400">
            {t('legal.version', { version })} · {effectiveDate}
          </span>
        </div>
      </div>

      {/* ── Hero ── */}
      <div className="bg-linear-to-br from-gray-800 to-green-900 text-white py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-medium bg-yellow-400 text-gray-900 px-3 py-1 rounded-full">
              {t('legal.badge')}
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{t(titleKey)}</h1>
          <p className="text-gray-300 text-sm">
            Ethernal Fund · {t('legal.effective', { date: effectiveDate })}
          </p>
        </div>
      </div>

      {/* ── Warning banner (disclaimer only) ── */}
      {warning && (
        <div className="bg-red-600 text-white py-3 px-4">
          <div className="max-w-3xl mx-auto">
            <p className="text-sm font-semibold text-center">{warning}</p>
          </div>
        </div>
      )}

      {/* ── Content ── */}
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">

          {/* Table of contents */}
          <div className="border-b border-gray-100 bg-gray-50 px-8 py-6">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              {t('legal.toc')}
            </p>
            <ol className="space-y-1">
              {sections.map((s, i) => (
                <li key={i}>
                  <a
                    href={`#section-${i + 1}`}
                    className="text-sm text-green-700 hover:text-yellow-600 transition"
                  >
                    {i + 1}. {s.heading}
                  </a>
                </li>
              ))}
            </ol>
          </div>

          {/* Sections */}
          <div className="px-8 py-8 space-y-10">
            {sections.map((s, i) => (
              <section key={i} id={`section-${i + 1}`} className="scroll-mt-6">
                <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-baseline gap-2">
                  <span className="text-yellow-500 font-mono text-sm">{String(i + 1).padStart(2, '0')}</span>
                  {s.heading}
                </h2>

                {Array.isArray(s.body) ? (
                  <ul className="space-y-2 pl-1">
                    {s.body.map((item, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm text-gray-600 leading-relaxed">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-600 leading-relaxed">{s.body}</p>
                )}
              </section>
            ))}
          </div>

          {/* Footer of card */}
          <div className="border-t border-gray-100 bg-gray-50 px-8 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className="text-xs text-gray-400">
              {t('legal.version', { version })} · {effectiveDate}
            </p>
            <a
              href="mailto:contact@ethernal.fund"
              className="flex items-center gap-1 text-xs text-green-700 hover:text-yellow-600 transition"
            >
              contact@ethernal.fund
              <ExternalLink size={12} />
            </a>
          </div>
        </div>

        {/* Back link */}
        <div className="mt-8 flex justify-center">
          <Link
            to="/"
            className="text-sm text-gray-500 hover:text-yellow-600 transition flex items-center gap-1"
          >
            <ArrowLeft size={14} />
            {t('legal.backToHome')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LegalPage;