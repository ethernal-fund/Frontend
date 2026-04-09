import { useEffect }      from 'react';
import { useTranslation }  from 'react-i18next';
import { AlertTriangle }   from 'lucide-react';
import { useWizardStore }  from '@/stores/wizardStore';
import { fmtUsdc }         from '@/lib/calculator';
import { cn }              from '@/lib/cn';

function Field({
  label, hint, children,
}: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-mono text-[0.65rem] text-(--muted) uppercase tracking-widest">
        {label}
      </label>
      {children}
      {hint && <span className="font-mono text-[0.6rem] text-(--muted)">{hint}</span>}
    </div>
  );
}

const inputCls = cn(
  'bg-(--surface2) border border-(--border2) rounded-lg px-4 py-3',
  'text-(--text) font-mono text-sm outline-none transition-colors',
  'focus:border-(--accent) placeholder:text-(--muted)',
);

interface Step1Props {
  onNext: () => void;
}

export function Step1Calculator({ onNext }: Step1Props) {
  const { t }  = useTranslation('fund');
  const { calculator, result, setCalculatorField, runCalculator, nextStep } = useWizardStore();

  useEffect(() => { runCalculator(); }, [runCalculator]);

  function handleNext() {
    if (!result) return;
    const monthly = result.monthlyGross;
    if (monthly < 50) { alert(t('monthlyTooLow', { min: 50 })); return; }
    if (calculator.currentAge < 18 || calculator.currentAge > 80) { alert('Age must be 18–80'); return; }
    if (calculator.retirementAge < 55)                             { alert('Retirement age must be ≥ 55'); return; }
    if (calculator.retirementAge <= calculator.currentAge)         { alert('Retirement age must be > current age'); return; }
    if (calculator.retirementAge - calculator.currentAge < 15)    { alert('At least 15 years required until retirement'); return; }
    if (calculator.principal > 100_000)                            { alert('Principal cannot exceed 100,000 USDC'); return; }
    nextStep();
    onNext();
  }

  function field(key: keyof typeof calculator) {
    return (v: React.ChangeEvent<HTMLInputElement>) => {
      setCalculatorField(key, parseFloat(v.target.value) || 0);
      runCalculator();
    };
  }

  return (
    <div className="space-y-6">

      {/* Calculator box */}
      <div className="bg-(--surface2) border border-(--border2) rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-(--surface) border border-(--border2) flex items-center justify-center text-base">🧮</div>
          <div>
            <div className="font-bold text-sm">{t('Calculator')}</div>
            <div className="text-(--muted) text-xs mt-0.5">{t('inputs')}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={t('Desired Income')}>
            <input type="number" className={inputCls} min={1} value={calculator.desiredMonthlyIncome}
              onChange={field('desiredMonthlyIncome')} placeholder="3000" />
          </Field>
          <Field label={t('Payment Years')}>
            <input type="number" className={inputCls} min={1} max={50} value={calculator.paymentYears}
              onChange={field('paymentYears')} placeholder="20" />
          </Field>
          <Field label={t('Current Age')}>
            <input type="number" className={inputCls} min={18} max={80} value={calculator.currentAge}
              onChange={field('currentAge')} placeholder="30" />
          </Field>
          <Field label={t('Retirement Age')}>
            <input type="number" className={inputCls} min={55} max={100} value={calculator.retirementAge}
              onChange={field('retirementAge')} placeholder="65" />
          </Field>
          <Field label={t('Apy')}>
            <input type="number" className={inputCls} min={0} max={100} step={0.1} value={calculator.apyPercent}
              onChange={field('apyPercent')} placeholder="5" />
          </Field>
          <Field label={t('Principal')}>
            <input type="number" className={inputCls} min={0} step={1} value={calculator.principal}
              onChange={field('principal')} placeholder="0" />
          </Field>
        </div>

        {/* Result grid */}
        {result && (
          <div className="mt-6 bg-(--bg) border border-(--border2) rounded-xl p-5">
            <div className="font-mono text-[0.65rem] text-(--muted) uppercase tracking-widest mb-4">
              {t('result')}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label: t('corpus'),           value: fmtUsdc(result.corpus, 0)           },
                { label: t('Monthly Needed'),    value: fmtUsdc(result.monthlyGross),        accent: true },
                { label: t('Total Deposit'),     value: fmtUsdc(result.totalDeposited, 0)   },
                { label: t('Years Left'),         value: `${result.yearsToRetirement} yrs`   },
                { label: t('Fund at Retirement'), value: fmtUsdc(result.estimatedFundVal, 0) },
                { label: t('Income for'),         value: `${calculator.paymentYears} years`  },
              ].map(({ label, value, accent }) => (
                <div key={label}>
                  <div className="font-mono text-[0.6rem] text-(--muted) uppercase tracking-wider mb-1">{label}</div>
                  <div className={cn('font-mono text-sm font-bold', accent ? 'text-(--accent) text-base' : 'text-(--text)')}>{value}</div>
                </div>
              ))}
              {/* Fee row */}
              <div className="col-span-2 sm:col-span-3 border-t border-(--border2) pt-3 mt-1">
                <div className="font-mono text-[0.6rem] text-(--warn) uppercase tracking-wider mb-1">{t('Fee Row')}</div>
                <div className="font-mono text-xs text-(--warn)">
                  {fmtUsdc(result.feePerMonth)}/mo · {fmtUsdc(result.totalFees, 0)} total
                </div>
              </div>
            </div>
            {/* Warnings */}
            {result.warnings.map((w) => (
              <div key={w} className="mt-3 flex items-start gap-2 bg-[#ffd24d11] border border-[#ffd24d44] rounded-lg px-3 py-2">
                <AlertTriangle size={14} className="text-(--warn) shrink-0 mt-0.5" />
                <span className="font-mono text-[0.7rem] text-(--warn)">{w}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Deposit preview */}
      {result && (
        <div>
          <div className="font-mono text-[0.65rem] text-(--muted) uppercase tracking-widest mb-3">
            {t('Initial Deposit')}
          </div>
          <div className="bg-(--surface2) border border-(--border2) rounded-xl p-4 grid grid-cols-3 gap-4">
            {[
              { label: t('Principal'), value: fmtUsdc(calculator.principal) },
              { label: t('First Monthly'),   value: fmtUsdc(result.monthlyGross)  },
              { label: t('Total Approve'),   value: fmtUsdc(calculator.principal + result.monthlyGross) },
            ].map(({ label, value }) => (
              <div key={label}>
                <div className="font-mono text-[0.6rem] text-(--muted) uppercase tracking-wider mb-1">{label}</div>
                <div className="font-mono text-sm font-bold text-(--accent)">{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next button */}
      <div className="flex justify-end">
        <button
          onClick={handleNext}
          className="px-6 py-3 bg-(--accent) text-(--bg) rounded-lg font-bold text-sm hover:opacity-90 transition"
        >
          {t('Select Protocol')}
        </button>
      </div>
    </div>
  );
}
