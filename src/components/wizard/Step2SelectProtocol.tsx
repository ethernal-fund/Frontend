import { useTranslation }  from 'react-i18next';
import { useChainId }      from 'wagmi';
import { ExternalLink, AlertTriangle, RefreshCw } from 'lucide-react';
import { useProtocols }    from '@/hooks/useProtocols';
import { useWizardStore }  from '@/stores/wizardStore';
import { getExplorerAddressUrl } from '@/config/chains';
import { cn }              from '@/lib/cn';

interface Step2Props {
  onNext: () => void;
  onBack: () => void;
}

export function Step2SelectProtocol({ onNext, onBack }: Step2Props) {
  const { t } = useTranslation();
  const chainId = useChainId();
  const { protocols, isLoading, registryReady, error, refetch } = useProtocols();
  const { selectedProtocol, selectProtocol, nextStep, prevStep } = useWizardStore();

  function handleNext() {
    if (!selectedProtocol) return;
    nextStep();
    onNext();
  }

  return (
    <div className="space-y-6">
      <div className="font-mono text-[0.65rem] text-(--muted) uppercase tracking-widest">
        {t('Select Protocol')}
      </div>

      {!registryReady ? (
        <div className="flex items-start gap-3 bg-[#ffd24d11] border border-[#ffd24d44] rounded-xl px-4 py-4">
          <AlertTriangle size={16} className="text-(--warn) shrink-0 mt-0.5" />
          <div className="font-mono text-xs text-(--warn)">
            Protocol registry not deployed on this chain.
            Switch to Arbitrum Sepolia to create a fund.
          </div>
        </div>
      ) : error ? (
        <div className="flex items-start gap-3 bg-[#ff4d6d11] border border-[#ff4d6d44] rounded-xl px-4 py-4">
          <AlertTriangle size={16} className="text-(--danger) shrink-0 mt-0.5" />
          <div className="flex-1 font-mono text-xs text-(--danger)">
            <div className="mb-2">Failed to load protocols from the registry.</div>
            <button
              onClick={() => void refetch()}
              className="flex items-center gap-1.5 underline underline-offset-2 hover:opacity-80 transition"
            >
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        </div>
      ) : isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-(--surface2) border border-(--border2) rounded-xl animate-pulse" />
          ))}
        </div>
      ) : protocols.length === 0 ? (
        <div className="flex items-start gap-3 bg-[#ffd24d11] border border-[#ffd24d44] rounded-xl px-4 py-4">
          <AlertTriangle size={16} className="text-(--warn) shrink-0 mt-0.5" />
          <div className="flex-1 font-mono text-xs text-(--warn)">
            <div className="mb-2">No active protocols found in the registry.</div>
            <button
              onClick={() => void refetch()}
              className="flex items-center gap-1.5 underline underline-offset-2 hover:opacity-80 transition"
            >
              <RefreshCw size={12} /> Refresh
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {protocols.map((p) => {
            const isSelected = selectedProtocol?.address === p.address;
            const apyPct     = (p.apyBps / 100).toFixed(2);
            return (
              <div
                key={p.address}
                role="button"
                tabIndex={0}
                onClick={() => selectProtocol(p)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') selectProtocol(p); }}
                className={cn(
                  'w-full flex items-center justify-between px-4 py-3.5 cursor-pointer',
                  'border rounded-xl transition-all duration-150 text-left group',
                  isSelected
                    ? 'border-[#22c55e] bg-[#22c55e11]'
                    : 'bg-(--surface2) border-(--border2) hover:border-[#fbbf24] hover:bg-[#fbbf2408]',
                )}
              >
                <div>
                  <div className={cn(
                    'font-bold text-sm transition-colors',
                    isSelected ? 'text-[#22c55e]' : 'group-hover:text-[#fbbf24]',
                  )}>
                    {p.name}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-[0.65rem] text-(--muted)">
                      {p.address.slice(0, 8)}…{p.address.slice(-6)}
                    </span>
                    <a
                      href={getExplorerAddressUrl(chainId, p.address)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-(--accent2) hover:opacity-80 transition"
                    >
                      <ExternalLink size={10} />
                    </a>
                    {p.verified && (
                      <span className={cn(
                        'font-mono text-[0.6rem] border px-1.5 py-0.5 rounded-full transition-colors',
                        isSelected
                          ? 'border-[#22c55e] text-[#22c55e]'
                          : 'border-(--success) text-(--success)',
                      )}>
                        Verified
                      </span>
                    )}
                  </div>
                </div>
                <div className={cn(
                  'font-mono text-lg font-bold shrink-0 transition-colors',
                  isSelected ? 'text-[#22c55e]' : 'text-(--accent) group-hover:text-[#fbbf24]',
                )}>
                  {apyPct}%
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex justify-between">
        <button
          onClick={() => { prevStep(); onBack(); }}
          className="px-4 py-2.5 border border-(--border2) rounded-lg text-sm text-(--muted) hover:text-(--text) hover:border-(--border) transition"
        >
          ← {t('step1', { ns: 'common', defaultValue: 'Back' })}
        </button>
        <button
          onClick={handleNext}
          disabled={!selectedProtocol}
          className="px-6 py-2.5 bg-(--accent) text-(--bg) rounded-lg font-bold text-sm hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {t('Approve And Deploy')}
        </button>
      </div>
    </div>
  );
}