import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Github, Twitter, Linkedin, Mail } from 'lucide-react';
import logo from '@/assets/ethernal_sombra.jpg';

const Footer: React.FC = () => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-800 text-white py-8 px-4 mt-auto">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">

          {/* ── Brand ── */}
          <div>
            <Link to="/" className="flex items-center gap-3 mb-4 group w-fit">
              <div className="w-10 h-10 bg-white rounded-lg p-1.5 flex items-center justify-center">
                <img
                  src={logo}
                  alt="Ethernal Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-xl font-bold group-hover:text-yellow-400 transition">
                ETHernal
              </span>
            </Link>
            <p className="text-gray-400 text-sm">{t('footer.tagline')}</p>
          </div>

          {/* ── Quick Links ── */}
          <div>
            <h3 className="font-semibold mb-4">{t('footer.quickLinks')}</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-gray-400 hover:text-yellow-400 transition text-sm">
                  {t('nav.home')}
                </Link>
              </li>
              <li>
                <Link to="/calculator" className="text-gray-400 hover:text-yellow-400 transition text-sm">
                  {t('nav.calculator')}
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-gray-400 hover:text-yellow-400 transition text-sm">
                  {t('nav.contact')}
                </Link>
              </li>
            </ul>
          </div>

          {/* ── Social ── */}
          <div>
            <h3 className="font-semibold mb-4">{t('footer.followUs')}</h3>
            <div className="flex gap-4 mb-4">
              <a
                href="https://github.com/ethernal-fund"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center hover:bg-green-600 transition"
                aria-label="GitHub"
              >"
                <Github size={20} />
              </a>
              <a
                href="https://x.com/EthernalFund"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center hover:bg-green-600 transition"
                aria-label="Twitter / X"
              >
                <Twitter size={20} />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center hover:bg-green-600 transition"
                aria-label="LinkedIn"
              >
                <Linkedin size={20} />
              </a>
              <a
                href="mailto:contact@ethernal.fund"
                className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center hover:bg-green-600 transition"
                aria-label="Email"
              >
                <Mail size={20} />
              </a>
            </div>
            <a
              href="mailto:contact@ethernal.fund"
              className="text-gray-400 hover:text-yellow-400 transition text-sm"
            >
              contact@ethernal.fund
            </a>
          </div>
        </div>

        <div className="border-t border-gray-700 my-6" />

        {/* ── Bottom bar ── */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-400 text-sm text-center md:text-left">
            &copy; {currentYear} {t('footer.copyright')}
          </p>

          <div className="flex flex-wrap justify-center gap-4 md:gap-6">
            <Link to="/privacy" className="text-yellow-400 hover:text-yellow-300 transition text-sm">
              {t('footer.privacy')}
            </Link>
            <span className="text-gray-600 hidden sm:inline" aria-hidden="true">|</span>
            <Link to="/terms" className="text-yellow-400 hover:text-yellow-300 transition text-sm">
              {t('footer.terms')}
            </Link>
            <span className="text-gray-600 hidden sm:inline" aria-hidden="true">|</span>
            <Link to="/disclaimer" className="text-yellow-400 hover:text-yellow-300 transition text-sm">
              {t('footer.disclaimer')}
            </Link>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">{t('footer.builtOn')}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;