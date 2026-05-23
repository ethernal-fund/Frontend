import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, Download, FileText, AlertTriangle } from 'lucide-react';

const TokenSalePage: React.FC = () => {
  const { t } = useTranslation();

  const sections: { heading: string; body: string | string[] }[] = [
    // definitions
    {
      heading: t('sale.agreement.sections.definitions.title'),
      body:    t('sale.agreement.sections.definitions.items', { returnObjects: true }) as string[],
    },
    // nature
    {
      heading: t('sale.agreement.sections.nature.title'),
      body:    t('sale.agreement.sections.nature.items', { returnObjects: true }) as string[],
    },
    // conditions
    {
      heading: t('sale.agreement.sections.conditions.title'),
      body:    t('sale.agreement.sections.conditions.items', { returnObjects: true }) as string[],
    },
    // seedRound
    {
      heading: t('sale.agreement.sections.seedRound.title'),
      body:    t('sale.agreement.sections.seedRound.items', { returnObjects: true }) as string[],
    },
    // irreversibility (body string)
    {
      heading: t('sale.agreement.sections.irreversibility.title'),
      body:    t('sale.agreement.sections.irreversibility.body'),
    },
    // useOfFunds
    {
      heading: t('sale.agreement.sections.useOfFunds.title'),
      body:    t('sale.agreement.sections.useOfFunds.items', { returnObjects: true }) as string[],
    },
    // risks
    {
      heading: t('sale.agreement.sections.risks.title'),
      body:    t('sale.agreement.sections.risks.items', { returnObjects: true }) as string[],
    },
    // kyc (body string)
    {
      heading: t('sale.agreement.sections.kyc.title'),
      body:    t('sale.agreement.sections.kyc.body'),
    },
    // ip (body string)
    {
      heading: t('sale.agreement.sections.ip.title'),
      body:    t('sale.agreement.sections.ip.body'),
    },
    // liability (body string)
    {
      heading: t('sale.agreement.sections.liability.title'),
      body:    t('sale.agreement.sections.liability.body'),
    },
    // amendments (body string)
    {
      heading: t('sale.agreement.sections.amendments.title'),
      body:    t('sale.agreement.sections.amendments.body'),
    },
    // governingLaw (items)
    {
      heading: t('sale.agreement.sections.governingLaw.title'),
      body:    t('sale.agreement.sections.governingLaw.items', { returnObjects: true }) as string[],
    },
    // general (body string)
    {
      heading: t('sale.agreement.sections.general.title'),
      body:    t('sale.agreement.sections.general.body'),
    },
  ];

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
            {t('legal.version', { version: '1.0' })} · {t('sale.agreement.subtitle').split('·').pop()?.trim()}
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
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{t('sale.agreement.title')}</h1>
          <p className="text-gray-300 text-sm">{t('sale.agreement.subtitle')}</p>
        </div>
      </div>

      {/* ── Warning banner ── */}
      <div className="bg-red-600 text-white py-3 px-4">
        <div className="max-w-3xl mx-auto flex items-start gap-2">
          <AlertTriangle size={15} className="shrink-0 mt-0.5" />
          <p className="text-sm font-semibold">{t('sale.agreement.warning')}</p>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">

          {/* ── PDF Download section ── */}
          <div className="border-b border-gray-100 bg-yellow-50 px-8 py-6">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <FileText size={13} />
              {t('sale.agreement.downloadSection.title')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="/legal/Etrf_Token_Sale_Agreement_v1_0_EN.pdf"
                download
                className="flex items-center gap-2 bg-gray-800 hover:bg-yellow-500 hover:text-gray-900 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
              >
                <Download size={14} />
                {t('sale.agreement.downloadSection.english')}
              </a>
              <a
                href="/legal/Etrf_Token_Sale_Agreement_v1_0_ES.pdf"
                download
                className="flex items-center gap-2 bg-green-800 hover:bg-yellow-500 hover:text-gray-900 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
              >
                <Download size={14} />
                {t('sale.agreement.downloadSection.spanish')}
              </a>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              {t('sale.agreement.downloadSection.governingNote')}
            </p>
          </div>

          {/* Table of contents */}
          <div className="border-b border-gray-100 bg-gray-50 px-8 py-6">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              {t('legal.toc')}
            </p>
            <nav aria-label={t('legal.toc')}>
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
            </nav>
          </div>

          {/* Sections */}
          <div className="px-8 py-8 space-y-10">
            {sections.map((s, i) => (
              <section key={i} id={`section-${i + 1}`} className="scroll-mt-24">
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
              {t('legal.version', { version: '1.0' })} · {t('sale.agreement.subtitle').split('·').pop()?.trim()}
            </p>
            <a
              href="mailto:legal@ethernal.fund"
              className="flex items-center gap-1 text-xs text-green-700 hover:text-yellow-600 transition"
            >
              legal@ethernal.fund
              <Mail size={12} />
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

export default TokenSalePage;