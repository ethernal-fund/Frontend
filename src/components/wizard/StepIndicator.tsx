import { useTranslation } from 'react-i18next';
import { Check }          from 'lucide-react';
import { cn }             from '@/lib/cn';
import type { WizardStep } from '@/types';

interface StepIndicatorProps {
  current: WizardStep;
}

export function StepIndicator({ current }: StepIndicatorProps) {
  const { t } = useTranslation();

  const steps: { num: WizardStep; label: string }[] = [
    { num: 1, label: t('Calcular') },
    { num: 2, label: t('Select Protocol') },
    { num: 3, label: t('Deploy') },
  ];

  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map(({ num, label }, idx) => {
        const done   = current > num;
        const active = current === num;
        return (
          <div key={num} className="flex items-center flex-1 last:flex-none">
            {/* Step circle */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div
                className={cn(
                  'w-6 h-6 rounded-full border flex items-center justify-center',
                  'font-mono text-[0.65rem] transition-all duration-200',
                  done   && 'bg-(--accent) border-(--accent) text-(--bg)',
                  active && 'border-(--accent) text-(--accent)',
                  !done && !active && 'border-(--border2) text-(--muted)',
                )}
              >
                {done ? <Check size={12} strokeWidth={3} /> : num}
              </div>
              <span
                className={cn(
                  'text-xs font-semibold transition-colors hidden sm:block',
                  active && 'text-(--text)',
                  !active && 'text-(--muted)',
                )}
              >
                {label}
              </span>
            </div>
            {/* Separator */}
            {idx < steps.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-px mx-3 transition-colors duration-300',
                  done ? 'bg-(--accent)' : 'bg-(--border2)',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
