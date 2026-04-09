import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useConnection } from 'wagmi';
import { Mail, User, MessageSquare, Send, CheckCircle, AlertCircle } from 'lucide-react';
import SEO from '@/components/common/SEO';
import { contactService } from '@/services/api';

interface FormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  message?: string;
}

const ContactPage: React.FC = () => {
  const { t } = useTranslation();
  const { address } = useConnection();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [loading, setLoading]         = useState(false);
  const [success, setSuccess]         = useState(false);
  const [error, setError]             = useState('');
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});

  const validateEmail = (email: string): boolean =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!formData.name.trim()) {
      errors.name = t('contact.validation.nameRequired');
    } else if (formData.name.trim().length < 2) {
      errors.name = t('contact.validation.nameTooShort');
    }

    if (!formData.email.trim()) {
      errors.email = t('contact.validation.emailRequired');
    } else if (!validateEmail(formData.email)) {
      errors.email = t('contact.validation.emailInvalid');
    }

    if (!formData.message.trim()) {
      errors.message = t('contact.validation.messageRequired');
    } else if (formData.message.trim().length < 10) {
      errors.message = t('contact.validation.messageTooShort');
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      setError(t('contact.validation.formErrors'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      await contactService.submitContact({
        ...formData,
        walletAddress: address ?? undefined,
      });

      setSuccess(true);
      setFormData({ name: '', email: '', subject: '', message: '' });
      setFieldErrors({});
      setTimeout(() => setSuccess(false), 5000);

    } catch (err) {
      setError(err instanceof Error ? err.message : t('contact.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field as keyof FormErrors]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    if (error) setError('');
  };

  return (
    <>
      <SEO
        title={t('contact.title')}
        description={t('contact.subtitle')}
        keywords={['contact', 'support', 'Ethernal', 'DAO', 'help']}
      />

      <div className="min-h-screen bg-linear-to-br from-blue-50 via-purple-50 to-pink-50 py-8 sm:py-12 px-4">
        <div className="max-w-2xl mx-auto">

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 flex items-center justify-center gap-3">
              <Mail className="text-purple-600" size={40} />
              {t('contact.title')}
            </h1>
            <p className="text-gray-600 text-base sm:text-lg">
              {t('contact.subtitle')}
            </p>
          </div>

          {/* Success banner */}
          {success && (
            <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4 sm:p-6 mb-6 shadow-lg animate-fade-in">
              <div className="flex items-start gap-3">
                <CheckCircle className="text-green-600 shrink-0 mt-1" size={24} />
                <div>
                  <h3 className="font-semibold text-green-800 mb-1">{t('contact.success')}</h3>
                  <p className="text-green-700 text-sm">{t('contact.successDetail')}</p>
                </div>
              </div>
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 sm:p-6 mb-6 shadow-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-red-600 shrink-0 mt-1" size={24} />
                <div>
                  <h3 className="font-semibold text-red-800 mb-1">{t('common.error')}</h3>
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 border border-purple-100"
          >
            {/* Name */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <User className="w-5 h-5" />
                {t('contact.name')} *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 transition ${
                  fieldErrors.name
                    ? 'border-red-300 focus:ring-red-200 focus:border-red-500'
                    : 'border-gray-300 focus:ring-purple-300 focus:border-purple-500'
                }`}
                placeholder={t('contact.namePlaceholder')}
                aria-describedby={fieldErrors.name ? 'name-error' : undefined}
              />
              {fieldErrors.name && (
                <p id="name-error" className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {fieldErrors.name}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Mail className="w-5 h-5" />
                {t('contact.email')} *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 transition ${
                  fieldErrors.email
                    ? 'border-red-300 focus:ring-red-200 focus:border-red-500'
                    : 'border-gray-300 focus:ring-purple-300 focus:border-purple-500'
                }`}
                placeholder="your@email.com"
                aria-describedby={fieldErrors.email ? 'email-error' : undefined}
              />
              {fieldErrors.email && (
                <p id="email-error" className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Subject */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <MessageSquare className="w-5 h-5" />
                {t('contact.subject')}
              </label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => handleInputChange('subject', e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-purple-300 focus:border-purple-500 transition"
                placeholder={t('contact.subjectPlaceholder')}
              />
            </div>

            {/* Message */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <MessageSquare className="w-5 h-5" />
                {t('contact.message')} *
              </label>
              <textarea
                required
                rows={6}
                value={formData.message}
                onChange={(e) => handleInputChange('message', e.target.value)}
                className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 transition resize-none ${
                  fieldErrors.message
                    ? 'border-red-300 focus:ring-red-200 focus:border-red-500'
                    : 'border-gray-300 focus:ring-purple-300 focus:border-purple-500'
                }`}
                placeholder={t('contact.messagePlaceholder')}
                aria-describedby={fieldErrors.message ? 'message-error' : undefined}
              />
              {fieldErrors.message && (
                <p id="message-error" className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {fieldErrors.message}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">{t('contact.messageHint')}</p>
            </div>

            {/* Wallet info */}
            {address && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <CheckCircle className="text-blue-600 shrink-0 mt-0.5" size={18} />
                  <div>
                    <p className="text-sm font-medium text-blue-800 mb-1">
                      {t('contact.walletConnected')}
                    </p>
                    <p className="text-xs text-blue-700 font-mono break-all">
                      {t('contact.walletIncluded')} {address.slice(0, 10)}...{address.slice(-8)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-4 bg-linear-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold text-lg hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  {t('contact.sending')}
                </>
              ) : (
                <>
                  <Send size={20} />
                  {t('contact.send')}
                </>
              )}
            </button>

            <p className="text-xs text-gray-500 text-center">{t('contact.requiredFields')}</p>
          </form>

          {/* Alt contact */}
          <div className="mt-8 bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4 text-center">
              {t('contact.otherWays')}
            </h3>
            <div className="space-y-3 text-center text-sm text-gray-600">
              <p>
                <strong>{t('contact.emailLabel')}:</strong>{' '}
                <a href="mailto:contact@ethernal.fund" className="text-purple-600 hover:underline">
                  contact@ethernal.fund
                </a>
              </p>
              <p>
                <strong>{t('contact.responseTime')}:</strong> {t('contact.responseTimeValue')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ContactPage;
