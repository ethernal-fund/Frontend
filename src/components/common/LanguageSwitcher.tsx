import React from 'react';
import { useTranslation } from 'react-i18next';

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },      
  { code: 'es', name: 'Español', flag: '🇦🇷' },     
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },    
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },    
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'zh', name: '中文', flag: '🇨🇳' }, 
];

export const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = React.useState(false);
  const currentLang = languages.find(lang => lang.code === i18n.language) ?? languages[0]!;
  const changeLanguage = (langCode: string) => {
    i18n.changeLanguage(langCode);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition"
        aria-label="Change language"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="text-2xl">{currentLang.flag}</span>

      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
                className={`w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 transition ${
                  i18n.language === lang.code ? 'bg-green-50 text-green-700' : 'text-gray-700'
                }`}
                aria-current={i18n.language === lang.code ? 'true' : 'false'}
              >
                <span className="text-2xl" aria-hidden="true">{lang.flag}</span>
                <span className="font-medium">{lang.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageSwitcher;