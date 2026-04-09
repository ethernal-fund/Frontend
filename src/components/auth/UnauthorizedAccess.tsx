import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

export function UnauthorizedAccess() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-linear-to-br from-red-50 to-pink-50 flex items-center justify-center px-4">
      <div className="max-w-lg w-full">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-12 text-center border-4 border-red-300">
          <ShieldAlert className="w-32 h-32 text-red-600 mx-auto mb-6 animate-bounce" />

          <h2 className="text-4xl font-black text-red-700 mb-4">
            {t('access.unauthorized.title')}
          </h2>

          <p className="text-xl text-gray-700 mb-4">
            {t('access.unauthorized.description')}
          </p>

          <p className="text-lg text-gray-600 mb-8">
            <strong>{t('access.unauthorized.adminRequired')}</strong>
          </p>

          <div className="space-y-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full bg-linear-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white font-bold py-5 px-8 rounded-2xl text-xl transition shadow-lg"
            >
              {t('access.unauthorized.goDashboard')}
            </button>

            <button
              onClick={() => navigate('/')}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-4 px-8 rounded-2xl transition"
            >
              {t('access.goHome')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}