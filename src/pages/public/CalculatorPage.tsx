import { useState, useEffect } from 'react';
import {
  VictoryChart,
  VictoryLine,
  VictoryArea,
  VictoryAxis,
  VictoryTooltip,
  VictoryVoronoiContainer,
} from 'victory';
import { useTranslation }    from 'react-i18next';
import { useWizardStore }    from '@/stores/wizardStore';
import { useWallet }         from '@/hooks/web3/useWallet';
import { useChainId }        from 'wagmi';
import { areMainContractsDeployed } from '@/config/addresses';
import { formatCurrency }    from '@/lib/formatters';
import { FaucetButton }      from '@/components/web3/FaucetButton';
import { calcResult } from '@/lib/calculator';
import type { CalculatorInput, CalculatorResult } from '@/types';
import { validateCalcInputs } from '@/lib/calculatorValidation';
import { WizardModal }       from '@/components/wizard/WizardModal';
import {
  Calculator,
  TrendingUp,
  DollarSign,
  Calendar,
  Percent,
  Wallet,
  ArrowRight,
  CheckCircle,
  Info,
  Sparkles,
  AlertCircle,
  Droplets,
  ChevronRight,
} from 'lucide-react';

interface FieldProps {
  label:    string;
  value:    number;
  onChange: (val: number) => void;
  icon?:    React.ReactNode;
  step?:    number;
  min?:     number;
  max?:     number;
  hint?:    string;
}

const Field = ({ label, value, onChange, icon, step = 1, min, max, hint }: FieldProps) => (
  <div>
    <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-dark mb-2">
      {icon && <span className="text-forest-green">{icon}</span>}
      {label}
    </label>
    <input
      type="number"
      className="input"
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      step={step}
      min={min}
      max={max}
    />
    {hint && <p className="mt-1 text-xs text-gray-medium">{hint}</p>}
  </div>
);

const CalculatorPage = () => {
  const { t } = useTranslation();
  const { isConnected, openModal } = useWallet();
  const chainId = useChainId();
  const factoryReady = areMainContractsDeployed(chainId);

  const [modalOpen, setModalOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [result, setResult] = useState<CalculatorResult | null>(null);
  const [chartData, setChartData] = useState<{ year: number; balance: number }[]>([]);

  const [inputs, setInputs] = useState<CalculatorInput>({
    principal:            0,
    currentAge:           30,
    retirementAge:        65,
    desiredMonthlyIncome: 3000,
    apyPercent:           5,
    paymentYears:         20,
  });

  const { setCalculatorField, runCalculator } = useWizardStore();

  useEffect(() => {
    recalculate();
  }, [inputs]);

  const recalculate = () => {
    setError('');
    setWarning('');

    const validationError = validateCalcInputs(inputs);
    if (validationError) {
      setError(validationError);
      setResult(null);
      setChartData([]);
      return;
    }

    const calc = calcResult(inputs);
    if (!calc) {
      setResult(null);
      setChartData([]);
      return;
    }

    setResult(calc.result);
    setChartData(calc.chartData);

    const warns: string[] = [];
    if (calc.result.monthlyGross > 100_000)
      warns.push('⚠ Monthly deposit exceeds $100,000 — consider a higher APY, longer accumulation, or lower desired income.');
    if (calc.result.yearsToRetirement < 20)
      warns.push('⚠ Less than 20 years to retirement — results are aggressive.');
    if (warns.length) setWarning(warns.join(' · '));
  };

  const syncToWizardAndOpen = () => {
    setCalculatorField('desiredMonthlyIncome', inputs.desiredMonthlyIncome);
    setCalculatorField('paymentYears',         inputs.paymentYears);
    setCalculatorField('currentAge',           inputs.currentAge);
    setCalculatorField('retirementAge',        inputs.retirementAge);
    setCalculatorField('apyPercent',           inputs.apyPercent);
    setCalculatorField('principal',            inputs.principal);
    runCalculator();
    setModalOpen(true);
  };

  const handleCreateContract = async () => {
    if (!result) return;
    if (!factoryReady) {
      setError(t('createContract.factoryAddressNotConfigured'));
      return;
    }
    if (!isConnected) {
      setIsConnecting(true);
      try { await openModal(); }
      catch { setError(t('errors.somethingWrong')); }
      finally { setIsConnecting(false); }
      return;
    }
    syncToWizardAndOpen();
  };

  const victoryData = chartData.map((d) => ({ x: d.year, y: d.balance }));

  return (
    <div className="min-h-screen bg-background-light py-8 sm:py-12 px-4">
      <div className="max-w-7xl mx-auto">

        {/* ── Header ── */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-dark-blue mb-4 flex items-center justify-center gap-3">
            <Calculator className="text-forest-green" size={40} />
            <span className="hidden sm:inline">{t('calculator.titleFull')}</span>
            <span className="sm:hidden">{t('calculator.titleShort')}</span>
          </h1>
          <p className="text-base sm:text-xl text-gray-medium max-w-3xl mx-auto px-4">
            {t('calculator.subtitle')}
          </p>
        </div>

        {/* ── Global error ── */}
        {error && (
          <div className="max-w-2xl mx-auto mb-6">
            <div className="alert alert-error">
              <AlertCircle className="shrink-0" size={20} />
              <div>
                <p className="font-semibold">{t('calculator.dataError')}</p>
                <p className="text-sm mt-0.5">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6 sm:gap-10">

          {/* ── LEFT COLUMN ── */}
          <div className="space-y-6">

            {/* Calculator card */}
            <div className="card">
              <h2 className="text-xl sm:text-2xl font-bold text-dark-blue mb-6 flex items-center gap-3">
                <Sparkles className="text-forest-green" size={22} />
                {t('calculator.configurePlan')}
              </h2>
              <p className="text-sm text-gray-medium mb-6">
                {t('calculator.configurePlanDesc', 'Enter your retirement goal — we calculate the monthly deposit needed.')}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <Field
                  label={t('calculator.desiredMonthly', 'Desired Monthly at Retirement (USDC)')}
                  value={inputs.desiredMonthlyIncome}
                  onChange={(val) => setInputs((p) => ({ ...p, desiredMonthlyIncome: val }))}
                  icon={<DollarSign className="w-4 h-4" />}
                  min={1}
                  hint={t('calculator.desiredMonthlyHint', 'How much you want to receive per month')}
                />
                <Field
                  label={t('calculator.yearsReceivingIncome')}
                  value={inputs.paymentYears}
                  onChange={(val) => setInputs((p) => ({ ...p, paymentYears: val }))}
                  icon={<Calendar className="w-4 h-4" />}
                  min={1}
                  max={50}
                  hint={t('calculator.yearsReceivingIncomeHint', 'Duration of your retirement income')}
                />
                <Field
                  label={t('calculator.currentAge')}
                  value={inputs.currentAge}
                  onChange={(val) => setInputs((p) => ({ ...p, currentAge: val }))}
                  icon={<Calendar className="w-4 h-4" />}
                  min={18}
                  max={80}
                  hint="18 – 80"
                />
                <Field
                  label={t('calculator.retirementAge')}
                  value={inputs.retirementAge}
                  onChange={(val) => setInputs((p) => ({ ...p, retirementAge: val }))}
                  icon={<Calendar className="w-4 h-4" />}
                  min={55}
                  hint={t('calculator.retirementAgeHint', '≥ 55, at least 15 yrs ahead')}
                />
                <Field
                  label={t('calculator.expectedReturn')}
                  value={inputs.apyPercent}
                  onChange={(val) => setInputs((p) => ({ ...p, apyPercent: val }))}
                  step={0.1}
                  icon={<Percent className="w-4 h-4" />}
                  min={0}
                  max={100}
                  hint={t('calculator.expectedReturnHint', 'Use the protocol APY — e.g. 5 for 5%')}
                />
                <Field
                  label={t('calculator.initialCapital')}
                  value={inputs.principal}
                  onChange={(val) => setInputs((p) => ({ ...p, principal: val }))}
                  icon={<DollarSign className="w-4 h-4" />}
                  min={0}
                  max={100_000}
                  hint={t('calculator.initialCapitalHint', 'Optional lump-sum deposit (max 100,000 USDC)')}
                />
              </div>

              {/* Inline result summary (reemplaza ResultBox) */}
              {result && (
                <div className="mt-6 bg-gray-light border border-gray-200 rounded-xl p-5">
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-medium mb-4">Result</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <StatCell label="Required corpus"         value={formatCurrency(result.corpus)} />
                    <StatCell label="Monthly deposit needed"  value={`${formatCurrency(result.monthlyGross)} / mo`} highlight />
                    <StatCell label="Total you will deposit"  value={formatCurrency(result.totalDeposited)} />
                    <StatCell label="Years to retirement"     value={`${result.yearsToRetirement} years`} />
                    <StatCell label="Est. fund at retirement" value={formatCurrency(result.estimatedFundVal)} />
                    <StatCell label="Monthly income for"      value={`${inputs.paymentYears} years`} />
                    <div className="col-span-2 sm:col-span-3 border-t border-gray-200 pt-3 mt-1">
                      <p className="text-xs font-semibold text-warning mb-1">5% protocol fee (included)</p>
                      <p className="font-mono text-sm text-warning">
                        {formatCurrency(result.feePerMonth)}/mo · {formatCurrency(result.totalFees)} total
                      </p>
                    </div>
                  </div>
                  {warning && (
                    <div className="mt-4 alert alert-warning">
                      <p className="font-mono text-xs">{warning}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Inline deposit preview (reemplaza DepositPreview) */}
              {result && (
                <div className="mt-4 grid grid-cols-3 gap-3 bg-gray-light border border-gray-200 rounded-xl p-4">
                  <PreviewCell label="Principal"          value={formatCurrency(inputs.principal)} />
                  <PreviewCell label="+ 1st monthly"      value={formatCurrency(result.monthlyGross)} />
                  <PreviewCell label="= Total to approve" value={formatCurrency(inputs.principal + result.monthlyGross)} accent />
                </div>
              )}
            </div>

            {/* Faucet card */}
            <div className="card border-info/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-forest-green p-2.5 rounded-lg">
                  <Droplets className="text-white" size={20} />
                </div>
                <h3 className="text-lg font-bold text-dark-blue">
                  {t('calculator.getTestTokens')}
                </h3>
              </div>
              <p className="text-gray-medium text-sm mb-5">{t('calculator.getTestTokensDesc')}</p>
              <FaucetButton />
            </div>

            {/* Step-by-step guide */}
            <div className="card">
              <h3 className="text-lg font-bold text-dark-blue mb-5 flex items-center gap-2">
                <Info className="text-forest-green" size={20} />
                {t('calculator.howToStart')}
              </h3>
              <div className="space-y-3">
                {(
                  [
                    { step: 1, icon: <Wallet className="w-4 h-4" />,     titleKey: 'calculator.step1Title', descKey: 'calculator.step1Desc' },
                    { step: 2, icon: <Droplets className="w-4 h-4" />,   titleKey: 'calculator.step2Title', descKey: 'calculator.step2Desc' },
                    { step: 3, icon: <Calculator className="w-4 h-4" />, titleKey: 'calculator.step3Title', descKey: 'calculator.step3Desc' },
                    { step: 4, icon: <CheckCircle className="w-4 h-4" />, titleKey: 'calculator.step4Title', descKey: 'calculator.step4Desc' },
                  ] as const
                ).map((item) => (
                  <div
                    key={item.step}
                    className="bg-gray-light rounded-xl p-4 flex items-start gap-4 hover:shadow-md transition-shadow"
                  >
                    <div
                      className="font-bold w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-sm"
                      style={{ background: 'var(--color-forest-green)', color: '#fff' }}
                    >
                      {item.step}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-forest-green">{item.icon}</span>
                        <h4 className="font-semibold text-dark-blue text-sm">{t(item.titleKey)}</h4>
                      </div>
                      <p className="text-xs text-gray-medium">{t(item.descKey)}</p>
                    </div>
                    <ChevronRight className="text-gray-medium shrink-0" size={18} />
                  </div>
                ))}
              </div>

              <div className="mt-5 alert alert-warning">
                <AlertCircle className="shrink-0" size={18} />
                <div>
                  <p className="font-semibold text-sm">{t('calculator.testnetOnly')}</p>
                  <p className="text-xs mt-0.5">{t('calculator.testnetOnlyDesc')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN ── */}
          {result && (
            <div className="space-y-6 sm:space-y-8">

              {/* Growth chart */}
              <div className="card">
                <h3 className="text-xl font-bold text-dark-blue mb-5 flex items-center gap-2">
                  <TrendingUp className="text-forest-green" size={22} />
                  {t('calculator.growthProjection')}
                </h3>
                {victoryData.length > 0 ? (
                  <VictoryChart
                    height={300}
                    containerComponent={
                      <VictoryVoronoiContainer
                        labels={({ datum }: { datum: { x: number; y: number } }) =>
                          `${t('calculator.ageLabel')} ${datum.x}: $${datum.y.toLocaleString()}`
                        }
                        labelComponent={
                          <VictoryTooltip
                            style={{ fontSize: 11 }}
                            flyoutStyle={{ fill: 'white', stroke: '#e2e8f0' }}
                          />
                        }
                      />
                    }
                  >
                    <VictoryAxis
                      tickFormat={(v: number) => `${v}`}
                      label={t('calculator.ageLabel')}
                      style={{
                        axisLabel:  { padding: 30, fontSize: 11, fill: '#6b7280' },
                        tickLabels: { fontSize: 10, fill: '#6b7280' },
                        grid:       { stroke: '#f3f4f6' },
                      }}
                    />
                    <VictoryAxis
                      dependentAxis
                      tickFormat={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                      style={{
                        tickLabels: { fontSize: 10, fill: '#6b7280' },
                        grid:       { stroke: '#f3f4f6', strokeDasharray: '4,4' },
                      }}
                    />
                    <VictoryArea
                      data={victoryData}
                      style={{
                        data: {
                          fill:        'rgba(27, 94, 32, 0.10)',
                          stroke:      '#1B5E20',
                          strokeWidth: 2.5,
                        },
                      }}
                      interpolation="monotoneX"
                    />
                    <VictoryLine
                      data={victoryData}
                      style={{ data: { stroke: '#1B5E20', strokeWidth: 2.5 } }}
                      interpolation="monotoneX"
                    />
                  </VictoryChart>
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-medium text-sm">
                    {t('calculator.fillFormToSeeChart')}
                  </div>
                )}
              </div>

              {/* Deposit breakdown */}
              <div className="card">
                <h3 className="text-xl font-bold text-dark-blue mb-5 flex items-center gap-2">
                  <Info className="text-forest-green" size={20} />
                  {t('calculator.depositSummary')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-light rounded-xl p-4 text-center">
                    <p className="text-gray-medium text-xs mb-1">{t('calculator.totalDeposit')}</p>
                    <p className="text-2xl font-black text-dark-blue break-all">
                      {formatCurrency(inputs.principal + result.monthlyGross)}
                    </p>
                    <p className="text-xs text-gray-medium mt-1">{t('calculator.fromWallet', 'From your wallet')}</p>
                  </div>
                  <div className="bg-gray-light rounded-xl p-4 text-center">
                    <p className="text-gray-medium text-xs mb-1">{t('calculator.daoFee')}</p>
                    <p className="text-2xl font-black break-all" style={{ color: 'var(--color-warning)' }}>
                      {formatCurrency(result.feePerMonth)}
                    </p>
                    <p className="text-xs text-gray-medium mt-1">{t('calculator.goesToTreasury')}</p>
                  </div>
                  <div className="bg-gray-light rounded-xl p-4 text-center">
                    <p className="text-gray-medium text-xs mb-1">{t('calculator.netToFund')}</p>
                    <p className="text-2xl font-black break-all" style={{ color: 'var(--color-success)' }}>
                      {formatCurrency(result.monthlyNet)}
                    </p>
                    <p className="text-xs text-gray-medium mt-1">{t('calculator.forDefi')}</p>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div
                className="rounded-2xl shadow-xl p-6 sm:p-10 text-white text-center"
                style={{ background: 'var(--gradient-primary)' }}
              >
                <h2 className="text-2xl sm:text-3xl font-black mb-4 text-white">
                  {isConnected ? t('calculator.fundReady') : t('calculator.lastStep')}
                </h2>
                <p className="text-base sm:text-lg mb-6 text-white/90">
                  {t('calculator.monthlySavingsRequired')}{' '}
                  <strong className="text-2xl sm:text-3xl block sm:inline mt-2 sm:mt-0">
                    {formatCurrency(result.monthlyGross)} / mo
                  </strong>
                </p>

                <button
                  onClick={handleCreateContract}
                  disabled={isConnecting}
                  className="btn btn-gold mx-auto sm:w-auto text-base sm:text-lg px-8 py-4"
                >
                  {isConnecting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black" />
                      {t('common.loading')}
                    </>
                  ) : isConnected ? (
                    <>
                      <CheckCircle size={20} />
                      {t('calculator.createContract')}
                      <ArrowRight size={20} />
                    </>
                  ) : (
                    <>
                      <Wallet size={20} />
                      {t('nav.connectWallet')}
                      <ArrowRight size={20} />
                    </>
                  )}
                </button>

                <p className="mt-4 text-white/70 text-sm">
                  {isConnected ? t('calculator.createOnArbitrum') : t('calculator.walletWillOpen')}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Wizard Modal ── */}
      <WizardModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
};

export default CalculatorPage;

const StatCell = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
  <div>
    <p className="text-xs text-gray-medium mb-1">{label}</p>
    <p className={`font-mono font-bold ${highlight ? 'text-forest-green text-lg' : 'text-dark-blue'}`}>
      {value}
    </p>
  </div>
);

const PreviewCell = ({ label, value, accent }: { label: string; value: string; accent?: boolean }) => (
  <div>
    <p className="text-xs text-gray-medium uppercase tracking-wider mb-1">{label}</p>
    <p className={`font-mono text-sm font-bold ${accent ? 'text-forest-green' : 'text-dark-blue'}`}>
      {value}
    </p>
  </div>
);