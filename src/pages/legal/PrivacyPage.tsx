import { useTranslation } from 'react-i18next';
import LegalPage from './LegalPage';

const PrivacyPage: React.FC = () => {
  const { t } = useTranslation();

  const sections = [
    {
      heading: t('legal.privacy.s1.title'),
      body:    t('legal.privacy.s1.body'),
    },
    {
      heading: t('legal.privacy.s2.title'),
      body: [
        t('legal.privacy.s2.b1'),
        t('legal.privacy.s2.b2'),
        t('legal.privacy.s2.b3'),
        t('legal.privacy.s2.b4'),
        t('legal.privacy.s2.b5'),
        t('legal.privacy.s2.b6'),
        t('legal.privacy.s2.b7'),
        t('legal.privacy.s2.b8'),
      ],
    },
    {
      heading: t('legal.privacy.s3.title'),
      body: [
        t('legal.privacy.s3.b1'),
        t('legal.privacy.s3.b2'),
        t('legal.privacy.s3.b3'),
        t('legal.privacy.s3.b4'),
        t('legal.privacy.s3.b5'),
      ],
    },
    {
      heading: t('legal.privacy.s4.title'),
      body:    t('legal.privacy.s4.body'),
    },
    {
      heading: t('legal.privacy.s5.title'),
      body: [
        t('legal.privacy.s5.b1'),
        t('legal.privacy.s5.b2'),
        t('legal.privacy.s5.b3'),
        t('legal.privacy.s5.b4'),
        t('legal.privacy.s5.b5'),
      ],
    },
    {
      heading: t('legal.privacy.s6.title'),
      body:    t('legal.privacy.s6.body'),
    },
    {
      heading: t('legal.privacy.s7.title'),
      body:    t('legal.privacy.s7.body'),
    },
    {
      heading: t('legal.privacy.s8.title'),
      body: [
        t('legal.privacy.s8.b1'),
        t('legal.privacy.s8.b2'),
        t('legal.privacy.s8.b3'),
      ],
    },
    {
      heading: t('legal.privacy.s9.title'),
      body:    t('legal.privacy.s9.body'),
    },
    {
      heading: t('legal.privacy.s10.title'),
      body:    t('legal.privacy.s10.body'),
    },
  ];

  return (
    <LegalPage
      docKey="privacy"
      version="1.0"
      effectiveDate="Abril 2026"
      sections={sections}
    />
  );
};

export default PrivacyPage;