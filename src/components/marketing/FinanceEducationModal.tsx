// src/components/marketing/FinanceEducationModal.tsx
import { X, GraduationCap, BookOpen, TrendingUp, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const FinanceEducationModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const topics = [
    { icon: BookOpen,    labelKey: 'education.modal.topic1' },
    { icon: TrendingUp,  labelKey: 'education.modal.topic2' },
    { icon: GraduationCap, labelKey: 'education.modal.topic3' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">

        {/* Header */}
        <div className="bg-linear-to-br from-blue-600 to-indigo-700 px-6 py-8 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/20 transition"
          >
            <X size={18} />
          </button>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-white/20 rounded-xl">
              <GraduationCap size={28} />
            </div>
            <div>
              <p className="text-xs font-semibold tracking-widest text-blue-200 uppercase">
                {t('features.education.title')}
              </p>
              <span className="inline-flex items-center gap-1.5 mt-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-yellow-400 text-yellow-900">
                <Clock size={11} />
                {t('education.modal.comingSoon')}
              </span>
            </div>
          </div>
          <h2 className="text-2xl font-bold leading-tight">
            {t('education.modal.title')}
          </h2>
          <p className="text-blue-100 text-sm mt-2">
            {t('education.modal.subtitle')}
          </p>
        </div>

        {/* Topics preview */}
        <div className="px-6 py-5 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            {t('education.modal.topicsLabel')}
          </p>
          {topics.map(({ icon: Icon, labelKey }) => (
            <div
              key={labelKey}
              className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100"
            >
              <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                <Icon size={16} />
              </div>
              <span className="text-sm text-gray-700 font-medium">
                {t(labelKey)}
              </span>
              <span className="ml-auto text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">
                {t('education.modal.soon')}
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition"
          >
            {t('education.modal.close')}
          </button>
        </div>

      </div>
    </div>
  );
};