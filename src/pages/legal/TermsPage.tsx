import { useTranslation } from 'react-i18next';
import LegalPage from './LegalPage';

const TermsPage: React.FC = () => {
  const { t } = useTranslation();

  const sections = [
    {
      heading: t('legal.terms.s1.title'),
      body:    t('legal.terms.s1.body'),
    },
    {
      heading: t('legal.terms.s2.title'),
      body: [
        t('legal.terms.s2.b1'),
        t('legal.terms.s2.b2'),
        t('legal.terms.s2.b3'),
        t('legal.terms.s2.b4'),
        t('legal.terms.s2.b5'),
        t('legal.terms.s2.b6'),
      ],
    },
    {
      heading: t('legal.terms.s3.title'),
      body: [
        t('legal.terms.s3.b1'),
        t('legal.terms.s3.b2'),
        t('legal.terms.s3.b3'),
        t('legal.terms.s3.b4'),
        t('legal.terms.s3.b5'),
        t('legal.terms.s3.b6'),
      ],
    },
    {
      heading: t('legal.terms.s4.title'),
      body: [
        t('legal.terms.s4.b1'),
        t('legal.terms.s4.b2'),
        t('legal.terms.s4.b3'),
        t('legal.terms.s4.b4'),
      ],
    },
    {
      heading: t('legal.terms.s5.title'),
      body: [
        t('legal.terms.s5.b1'),
        t('legal.terms.s5.b2'),
        t('legal.terms.s5.b3'),
        t('legal.terms.s5.b4'),
      ],
    },
    {
      heading: t('legal.terms.s6.title'),
      body: [
        t('legal.terms.s6.b1'),
        t('legal.terms.s6.b2'),
        t('legal.terms.s6.b3'),
        t('legal.terms.s6.b4'),
      ],
    },
    {
      heading: t('legal.terms.s7.title'),
      body: [
        t('legal.terms.s7.b1'),
        t('legal.terms.s7.b2'),
        t('legal.terms.s7.b3'),
        t('legal.terms.s7.b4'),
        t('legal.terms.s7.b5'),
        t('legal.terms.s7.b6'),
        t('legal.terms.s7.b7'),
      ],
    },
    {
      heading: t('legal.terms.s8.title'),
      body:    t('legal.terms.s8.body'),
    },
    {
      heading: t('legal.terms.s9.title'),
      body:    t('legal.terms.s9.body'),
    },
    {
      heading: t('legal.terms.s10.title'),
      body:    t('legal.terms.s10.body'),
    },
    {
      heading: t('legal.terms.s11.title'),
      body:    t('legal.terms.s11.body'),
    },
  ];

  return (
    <LegalPage
      docKey="terms"
      version="1.0"
      effectiveDate="Abril 2026"
      sections={sections}
    />
  );
};

export default TermsPage;