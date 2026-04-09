import { useState } from 'react';
import { CheckCircle, AlertCircle, ThumbsUp, ThumbsDown, Meh } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { surveyService } from '@/services/api';
import { isApiError } from '@/lib/api';
import type { SurveyCreate, FollowUpCreate } from '@/services/api';
import SEO from '@/components/common/SEO';

interface SurveyData {
  age: string;
  trustTraditional: number | null;
  blockchainFamiliarity: number | null;
  retirementConcern: number | null;
  hasRetirementPlan: number | null;
  valuesInRetirement: number | null;
  interestedInBlockchain: number | null;
}

interface FollowUpData {
  wantsMoreInfo: '' | 'yes' | 'no';
  email: string;
}

const INITIAL_SURVEY: SurveyData = {
  age: '',
  trustTraditional: null,
  blockchainFamiliarity: null,
  retirementConcern: null,
  hasRetirementPlan: null,
  valuesInRetirement: null,
  interestedInBlockchain: null,
};

const INITIAL_FOLLOW_UP: FollowUpData = { wantsMoreInfo: '', email: '' };
const AGE_OPTIONS = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'] as const;

const SurveyPage: React.FC = () => {
  const { t } = useTranslation();
  const [surveyData, setSurveyData]     = useState<SurveyData>(INITIAL_SURVEY);
  const [followUpData, setFollowUpData] = useState<FollowUpData>(INITIAL_FOLLOW_UP);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [success, setSuccess]           = useState(false);
  const [finalSuccess, setFinalSuccess] = useState(false);
  const [error, setError]               = useState('');

  const handleSurveySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!surveyData.age) {
      setError(t('survey.selectAge'));
      return;
    }

    const ratings: Array<number | null> = [
      surveyData.trustTraditional,
      surveyData.blockchainFamiliarity,
      surveyData.retirementConcern,
      surveyData.hasRetirementPlan,
      surveyData.valuesInRetirement,
      surveyData.interestedInBlockchain,
    ];

    if (!ratings.every((r) => r !== null)) {
      setError(t('survey.answerAll'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload: SurveyCreate = {
        age: surveyData.age,
        trust_traditional:        surveyData.trustTraditional!,
        blockchain_familiarity:   surveyData.blockchainFamiliarity!,
        retirement_concern:       surveyData.retirementConcern!,
        has_retirement_plan:      surveyData.hasRetirementPlan!,
        values_in_retirement:     surveyData.valuesInRetirement!,
        interested_in_blockchain: surveyData.interestedInBlockchain!,
      };

      await surveyService.createSurvey(payload);
      setSuccess(true);
      setShowFollowUp(true);
    } catch (err) {
      if (isApiError(err)) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t('errors.somethingWrong'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFollowUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpData.wantsMoreInfo) {
      setError(t('followUp.pleaseIndicate'));
      return;
    }
    if (followUpData.wantsMoreInfo === 'yes' && !followUpData.email) {
      setError(t('followUp.enterEmail'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload: FollowUpCreate = {
        wants_more_info: followUpData.wantsMoreInfo === 'yes',
        email: followUpData.wantsMoreInfo === 'yes' ? followUpData.email : undefined,
      };

      await surveyService.createFollowUp(payload);
      setFinalSuccess(true);
      setShowFollowUp(false);
      setTimeout(() => {
        setFinalSuccess(false);
        setSuccess(false);
        setSurveyData(INITIAL_SURVEY);
        setFollowUpData(INITIAL_FOLLOW_UP);
      }, 5000);

    } catch (err) {
      if (isApiError(err)) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t('errors.somethingWrong'));
      }
    } finally {
      setLoading(false);
    }
  };

  const RatingButtons = ({
    value,
    onChange,
  }: {
    value: number | null;
    onChange: (val: number) => void;
  }) => {
    const ratings = [
      { val: -2, icon: ThumbsDown, label: t('survey.rating.stronglyDisagree'), color: 'red' },
      { val: -1, icon: ThumbsDown, label: t('survey.rating.disagree'),         color: 'orange' },
      { val:  0, icon: Meh,        label: t('survey.rating.neutral'),           color: 'gray' },
      { val:  1, icon: ThumbsUp,   label: t('survey.rating.agree'),             color: 'blue' },
      { val:  2, icon: ThumbsUp,   label: t('survey.rating.stronglyAgree'),     color: 'green' },
    ] as const;

    const activeClass: Record<string, string> = {
      red:    'border-red-500 bg-red-50 text-red-700',
      orange: 'border-orange-500 bg-orange-50 text-orange-700',
      gray:   'border-gray-500 bg-gray-50 text-gray-700',
      blue:   'border-blue-500 bg-blue-50 text-blue-700',
      green:  'border-green-500 bg-green-50 text-green-700',
    };

    return (
      <div className="flex flex-wrap gap-2 justify-center">
        {ratings.map(({ val, icon: Icon, label, color }) => (
          <button
            key={val}
            type="button"
            onClick={() => onChange(val)}
            title={label}
            className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all ${
              value === val
                ? activeClass[color]
                : 'border-gray-300 hover:border-gray-400 text-gray-600'
            }`}
          >
            <Icon size={24} />
            <span className="text-xs whitespace-nowrap">{label}</span>
          </button>
        ))}
      </div>
    );
  };

  return (
    <>
      <SEO
        title={t('survey.title')}
        description={t('survey.subtitle')}
        keywords={['survey', 'retirement', 'blockchain', 'anonymous']}
      />

      <div className="min-h-screen bg-linear-to-br from-blue-50 to-green-50 py-12 px-4">
        <div className="max-w-4xl mx-auto">

          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">{t('survey.title')}</h1>
            <p className="text-lg text-gray-600">{t('survey.subtitle')}</p>
          </div>

          {/* Final success */}
          {finalSuccess && (
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 mb-6 shadow-lg animate-fade-in">
              <div className="flex items-start gap-3">
                <CheckCircle className="text-green-600 shrink-0 mt-1" size={24} />
                <div>
                  <h3 className="font-semibold text-green-800 mb-1">{t('followUp.thankYou')}</h3>
                  <p className="text-green-700 text-sm">
                    {followUpData.wantsMoreInfo === 'yes'
                      ? t('followUp.willContact')
                      : t('followUp.helpImprove')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 mb-6 shadow-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-red-600 shrink-0 mt-1" size={24} />
                <div>
                  <h3 className="font-semibold text-red-800 mb-1">{t('survey.errorTitle')}</h3>
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Survey form */}
          {!success && !showFollowUp && (
            <form onSubmit={(e) => { void handleSurveySubmit(e); }} className="bg-white rounded-2xl shadow-xl p-8 space-y-8">

              {/* Q1: Age */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  1. {t('survey.question1')} *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {AGE_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setSurveyData((p) => ({ ...p, age: option }))}
                      className={`p-3 rounded-lg border-2 font-medium transition-all ${
                        surveyData.age === option
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-300 hover:border-gray-400 text-gray-600'
                      }`}
                    >
                      {t(`survey.ageOptions.${option}`)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Q2 – Q7 */}
              {(
                [
                  { key: 'trustTraditional',      q: 'question2' },
                  { key: 'blockchainFamiliarity',  q: 'question3' },
                  { key: 'retirementConcern',      q: 'question4' },
                  { key: 'hasRetirementPlan',      q: 'question5' },
                  { key: 'valuesInRetirement',     q: 'question6' },
                  { key: 'interestedInBlockchain', q: 'question7' },
                ] as const
              ).map(({ key, q }, idx) => (
                <div key={key}>
                  <label className="block text-sm font-semibold text-gray-700 mb-4 text-center">
                    {idx + 2}. {t(`survey.${q}`)} *
                  </label>
                  <RatingButtons
                    value={surveyData[key]}
                    onChange={(val) => setSurveyData((p) => ({ ...p, [key]: val }))}
                  />
                </div>
              ))}

              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-4 bg-linear-to-r from-green-600 to-blue-600 text-white rounded-xl font-semibold text-lg hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    {t('survey.submitting')}
                  </>
                ) : (
                  <>
                    <CheckCircle size={20} />
                    {t('survey.submit')}
                  </>
                )}
              </button>

              <p className="text-xs text-gray-500 text-center">* {t('survey.required')}</p>
            </form>
          )}

          {/* Follow-up form */}
          {success && showFollowUp && (
            <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6 animate-fade-in">
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 mb-6">
                <div className="flex items-start gap-3">
                  <CheckCircle className="text-green-600 shrink-0 mt-1" size={24} />
                  <div>
                    <h3 className="font-semibold text-green-800 mb-1">{t('followUp.successTitle')}</h3>
                    <p className="text-green-700 text-sm">{t('followUp.successMessage')}</p>
                  </div>
                </div>
              </div>

              <form onSubmit={(e) => { void handleFollowUpSubmit(e); }} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-4">
                    {t('followUp.question1')} *
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setFollowUpData((p) => ({ ...p, wantsMoreInfo: 'yes', email: '' }))}
                      className={`p-4 rounded-lg border-2 font-medium transition-all ${
                        followUpData.wantsMoreInfo === 'yes'
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-300 hover:border-gray-400 text-gray-600'
                      }`}
                    >
                      ✅ {t('followUp.yesInterested')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFollowUpData((p) => ({ ...p, wantsMoreInfo: 'no', email: '' }))}
                      className={`p-4 rounded-lg border-2 font-medium transition-all ${
                        followUpData.wantsMoreInfo === 'no'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-300 hover:border-gray-400 text-gray-600'
                      }`}
                    >
                      {t('followUp.notNow')}
                    </button>
                  </div>
                </div>

                {followUpData.wantsMoreInfo === 'yes' && (
                  <div className="animate-fade-in">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('followUp.question2')} *
                    </label>
                    <input
                      type="email"
                      required
                      value={followUpData.email}
                      onChange={(e) => setFollowUpData((p) => ({ ...p, email: e.target.value }))}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-green-300 focus:border-green-500 transition"
                      placeholder={t('followUp.emailPlaceholder')}
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-6 py-4 bg-linear-to-r from-green-600 to-blue-600 text-white rounded-xl font-semibold text-lg hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                      {t('survey.submitting')}
                    </>
                  ) : (
                    <>
                      <CheckCircle size={20} />
                      {t('followUp.finish')}
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

        </div>
      </div>
    </>
  );
};

export default SurveyPage;
