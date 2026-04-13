import { useTranslation }   from 'react-i18next';
import { useChainId }       from 'wagmi';
import { useNavigate }      from 'react-router-dom';
import { ExternalLink, CheckCircle, Loader2, AlertCircle, LayoutDashboard } from 'lucide-react';
import { useWizardStore }   from '@/stores/wizardStore';
import { useDeployFund }    from '@/hooks/useDeployFund';
import { fmtUsdc }          from '@/lib/calculator';
import { getExplorerUrl, getExplorerAddressUrl } from '@/config/chains';
import { cn }               from '@/lib/cn';

interface Step3Props {
  onBack: () => void;
}

export function Step3Deploy({ onBack }: Step3Props) {
  const { t } = useTranslation();
  const chainId  = useChainId();
  const navigate = useNavigate();
  const { calculator, result, selectedProtocol, approved, prevStep } = useWizardStore();
  const { status, txHash, fundAddr, errorMsg, approveUsdc, deployFund } = useDeployFund();

  const totalApprove = (calculator.principal) + (result?.monthlyGross ?? 0);
  const isSuccess    = status === 'success';
  const isLoading    = status === 'approving' || status === 'deploying';

  return (
    <div className="space-y-6">

      {/* Summary */}
      <div className="bg-(--surface2) border border-(--border2) rounded-xl p-5">
        <div className="font-mono text-[0.65rem] text-(--muted) uppercase tracking-widest mb-4">Summary</div>
        <div className="grid grid-cols-2 gap-3 text-sm font-mono">
          {[
            ['Principal',        fmtUsdc(calculator.principal)],
            ['Monthly deposit',  fmtUsdc(result?.monthlyGross ?? 0)],
            ['Age range',        `${calculator.currentAge} → ${calculator.retirementAge}`],
            ['APY',              `${calculator.apyPercent}%`],
            ['Protocol',         selectedProtocol?.name ?? '—'],
            ['Total to approve', fmtUsdc(totalApprove)],
          ].map(([label, value]) => (
            <div key={label}>
              <div className="text-(--muted) text-[0.6rem] uppercase tracking-wider mb-0.5">{label}</div>
              <div className="text-(--text) font-bold">{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Allowance note */}
      <div className="bg-[#7b4dff11] border border-[#7b4dff44] rounded-xl px-4 py-3 font-mono text-xs text-(--accent2)">
        You'll approve <strong>{fmtUsdc(totalApprove)}</strong> for the Factory contract, then deploy your PersonalFund in one transaction.
      </div>

      {/* Action buttons */}
      <div className="space-y-3">
        {/* Step A: Approve */}
        <button
          onClick={() => { void approveUsdc(); }}
          disabled={approved || isLoading}
          className={cn(
            'w-full flex items-center justify-center gap-3 py-4 rounded-xl font-bold text-base transition',
            approved
              ? 'bg-[#22c55e] border border-[#22c55e] text-white cursor-default shadow-[0_0_12px_#22c55e55]'
              : 'bg-(--accent) text-(--bg) hover:opacity-90 disabled:opacity-50 disabled:cursor-wait',
          )}
        >
          {status === 'approving' ? (
            <><Loader2 size={18} className="animate-spin" /> {t('approving')}</>
          ) : approved ? (
            <><CheckCircle size={18} /> {t('approved')}</>
          ) : (
            t('approveUsdc')
          )}
        </button>

        {/* Step B: Deploy */}
        <button
          onClick={() => { void deployFund(); }}
          disabled={!approved || isLoading || isSuccess}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-xl font-bold text-base bg-(--accent) text-(--bg) hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {status === 'deploying' ? (
            <><Loader2 size={18} className="animate-spin" /> {t('deploying')}</>
          ) : (
            t('deployFund')
          )}
        </button>
      </div>

      {/* Status bar */}
      {(txHash || isSuccess || status === 'error') && (
        <div
          className={cn(
            'flex items-start gap-3 border rounded-xl px-4 py-3 font-mono text-sm',
            isSuccess          && 'border-(--success) text-(--success)',
            status === 'error' && 'border-(--danger)  text-(--danger)',
            !isSuccess && status !== 'error' && 'border-(--accent2) text-(--accent2)',
          )}
        >
          {status === 'error'
            ? <AlertCircle size={16} className="shrink-0 mt-0.5" />
            : <CheckCircle size={16} className="shrink-0 mt-0.5" />}
          <div className="flex-1 min-w-0">
            {status === 'error' && <div>{errorMsg}</div>}
            {isSuccess && fundAddr && (
              <div>
                🎉 Fund deployed at{' '}
                <a
                  href={getExplorerAddressUrl(chainId, fundAddr)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-(--accent2) hover:opacity-80"
                >
                  {fundAddr.slice(0, 10)}…{fundAddr.slice(-8)}
                </a>
              </div>
            )}
            {txHash && (
              <a
                href={getExplorerUrl(chainId, txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-(--accent2) hover:opacity-80 mt-1"
              >
                {t('viewOnExplorer')} <ExternalLink size={12} />
              </a>
            )}
          </div>
        </div>
      )}

      {!isSuccess && (
        <button
          onClick={() => { prevStep(); onBack(); }}
          disabled={isLoading}
          className="text-sm text-(--muted) hover:text-(--text) transition"
        >
          ← Back to Protocol
        </button>
      )}

      {/* Dashboard CTA — appears after successful deploy */}
      {isSuccess && (
        <button
          onClick={() => navigate('/dashboard')}
          className={cn(
            'w-full flex items-center justify-center gap-3 py-4 rounded-xl font-bold text-base transition',
            'bg-[#22c55e] text-white hover:bg-[#16a34a] shadow-[0_0_16px_#22c55e44]',
          )}
        >
          <LayoutDashboard size={18} />
          Dashboard
        </button>
      )}
    </div>
  );
}