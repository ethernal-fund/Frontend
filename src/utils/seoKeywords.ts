export type SupportedLocale = 'es' | 'en' | 'pt' | 'zh' | 'fr' | 'de' | 'it';

export const SUPPORTED_LOCALES: SupportedLocale[] = ['es', 'en', 'pt', 'zh', 'fr', 'de', 'it'];

const isSupportedLocale = (locale: string): locale is SupportedLocale =>
  SUPPORTED_LOCALES.includes(locale as SupportedLocale);

// Base keywords compartidas  
const baseKeywords = [
  'Ethernal',
  'DeFi',
  'Arbitrum',
  'blockchain',
  'retirement',
  'pension',
  'on-chain',
  'DeFi retirement',
] as const;

// Keywords localizadas 
const localizedKeywords: Record<SupportedLocale, string[]> = {
  es: [
    ...baseKeywords,
    'jubilación autogestionada',
    'retiro blockchain',
    'ANSES + DeFi',
    'fondo de retiro crypto',
    'jubilación inflación',
    'ahorro para el retiro',
    'pensión on-chain',
    'DeFi Argentina',
    'jubilación sin bancos',
    'monotributo + jubilación',
    'autogestión financiera',
  ],

  en: [
    ...baseKeywords,
    'DeFi retirement',
    'crypto pension',
    'on-chain retirement',
    'blockchain savings',
    'Arbitrum retirement fund',
    'decentralized pension',
    'DeFi retirement planning',
    'inflation protected retirement',
    'self-custody pension',
    'own your retirement',
  ],

  pt: [
    ...baseKeywords,
    'aposentadoria DeFi',
    'previdência blockchain',
    'fundo de aposentadoria',
    'retorno on-chain',
    'inflação e aposentadoria',
    'pensão cripto',
    'Arbitrum aposentadoria',
    'aposentadoria sem bancos',
    'autogestão financeira',
    'previdência privada crypto',
  ],

  zh: [
    ...baseKeywords,
    '退休 DeFi',
    '区块链养老金',
    '链上退休',
    '加密养老金',
    '你的退休你做主',
    '无银行退休',
    '最低费用养老',
    'Arbitrum 退休基金',
    '去中心化养老金',
    '通胀保护退休',
  ],

  fr: [
    ...baseKeywords,
    'retraite DeFi',
    'pension blockchain',
    'épargne retraite crypto',
    'retraite on-chain',
    'planification retraite Arbitrum',
    'pension décentralisée',
    'retraite sans banque',
    'autogestión retraite',
    'protection inflation retraite',
    'fonds retraite crypto',
  ],

  de: [
    ...baseKeywords,
    'Altersvorsorge DeFi',
    'Blockchain Rente',
    'Pension on-chain',
    'Krypto Altersvorsorge',
    'Inflationsschutz Rente',
    'DeFi Rentenplanung',
    'dezentrale Rente',
    'Rente ohne Bank',
    'Arbitrum Rentenfonds',
    'selbstverwaltete Altersvorsorge',
  ],

  it: [
    ...baseKeywords,
    'pensionamento DeFi',
    'pensione blockchain',
    'risparmio pensione',
    'ritiro on-chain',
    'pianificazione pensione crypto',
    'pensione decentralizzata',
    'pensione senza banca',
    'protezione inflazione pensione',
    'fondo pensione Arbitrum',
    'autogestione pensione',
  ],
};

export const getLocalizedKeywords = (locale: string): string[] => {
  const lang = isSupportedLocale(locale) ? locale : 'en';
  return localizedKeywords[lang];
};