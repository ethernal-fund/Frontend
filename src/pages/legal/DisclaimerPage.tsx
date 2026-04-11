import { useTranslation } from 'react-i18next';
import LegalPage from './LegalPage';

const DisclaimerPage: React.FC = () => {
  const { t } = useTranslation();

  const sections = [
    {
      heading: t('legal.disclaimer.s1.title'),
      body:    t('legal.disclaimer.s1.body'),
    },
    {
      heading: t('legal.disclaimer.s2.title'),
      body:    t('legal.disclaimer.s2.body'),
    },
    {
      heading: t('legal.disclaimer.s3.title'),
      body: [
        t('legal.disclaimer.s3.b1'),
        t('legal.disclaimer.s3.b2'),
        t('legal.disclaimer.s3.b3'),
        t('legal.disclaimer.s3.b4'),
        t('legal.disclaimer.s3.b5'),
        t('legal.disclaimer.s3.b6'),
        t('legal.disclaimer.s3.b7'),
      ],
    },
    {
      heading: t('legal.disclaimer.s4.title'),
      body:    t('legal.disclaimer.s4.body'),
    },
    {
      heading: t('legal.disclaimer.s5.title'),
      body: [
        t('legal.disclaimer.s5.b1'),
        t('legal.disclaimer.s5.b2'),
        t('legal.disclaimer.s5.b3'),
        t('legal.disclaimer.s5.b4'),
        t('legal.disclaimer.s5.b5'),
        t('legal.disclaimer.s5.b6'),
      ],
    },
    {
      heading: t('legal.disclaimer.s6.title'),
      body:    t('legal.disclaimer.s6.body'),
    },
    {
      heading: t('legal.disclaimer.s7.title'),
      body:    t('legal.disclaimer.s7.body'),
    },
    {
      heading: t('legal.disclaimer.s8.title'),
      body: [
        t('legal.disclaimer.s8.b1'),
        t('legal.disclaimer.s8.b2'),
        t('legal.disclaimer.s8.b3'),
      ],
    },
    {
      heading: t('legal.disclaimer.s9.title'),
      body:    t('legal.disclaimer.s9.body'),
    },
    {
      heading: t('legal.disclaimer.s10.title'),
      body:    t('legal.disclaimer.s10.body'),
    },
  ];

  return (
    <LegalPage
      docKey="disclaimer"
      version="1.0"
      effectiveDate="Abril 2026"
      sections={sections}
      warning={t('legal.disclaimer.warning')}
    />
  );
};

export default DisclaimerPage;