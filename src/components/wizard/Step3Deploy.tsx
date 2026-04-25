import { useEffect, useRef, useCallback, useState } from 'react';
import { useTranslation }  from 'react-i18next';
import { useChainId }      from 'wagmi';
import { useNavigate }     from 'react-router-dom';
import { useQueryClient }  from '@tanstack/react-query';
import {
  ExternalLink, CheckCircle, Loader2, AlertCircle,
  LayoutDashboard, RefreshCw, ShieldCheck,
} from 'lucide-react';

import { useWizardStore }   from '@/stores/wizardStore';
import { useDeployFund }    from '@/hooks/useDeployFund';
import { useSiweAuth }      from '@/hooks/useSiweAuth';
import { useAuthStore }     from '@/stores/authStore';
import { fundsService }     from '@/services/fundsService';
import { FUND_QUERY_KEY }   from '@/hooks/useMyFund';
import { fmtUsdc }          from '@/lib/calculator';
import { getExplorerUrl, getExplorerAddressUrl } from '@/config/chains';
import { cn }               from '@/lib/cn';
import { ROUTES }           from '@/router/routes';

const MAX_POLL_ATTEMPTS = 12;
const POLL_INTERVAL_MS  = 5_000;
const MAX_SYNC_RETRIES = 3;
const SYNC_RETRY_DELAY = 2_000;

interface Step3Props {
  onBack:    () => void;
  onSuccess: () => void;
}

type PostDeployStep =
  | 'idle'            // deploy aún no completado
  | 'authenticating'  // esperando firma SIWE
  | 'syncing'         // POST /funds/sync en curso
  | 'polling'         // GET /funds/me en loop hasta encontrar el fondo
  | 'ready'           // fondo confirmado en DB → habilitar botón Dashboard
  | 'sync_failed'     // sync falló tras reintentos (fondo existe on-chain)

export function Step3Deploy({ onBack, onSuccess }: Step3Props) {
  const { t }       = useTranslation();
  const chainId     = useChainId();
  const navigate    = useNavigate();
  const queryClient = useQueryClient();

  const { calculator, result, selectedProtocol, prevStep } = useWizardStore();
  const { status, txHash, fundAddr, errorMsg, approveUsdc, deployFund, approved } = useDeployFund();
  const { login }       = useSiweAuth();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [postStep,   setPostStep]   = useState<PostDeployStep>('idle');
  const [syncErrMsg, setSyncErrMsg] = useState<string | null>(null);

  const pollRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const attempts = useRef(0);
  const totalApprove = calculator.principal + (result?.monthlyGross ?? 0);
  const isDeploying  = status === 'approving' || status === 'deploying';
  const isSuccess    = status === 'success';
  const isError      = status === 'error';

  const runPostDeployFlow = useCallback(async () => {
    if (!fundAddr) return;
    if (!isAuthenticated) {
      setPostStep('authenticating');
      try {
        await login();
      } catch (authErr) {
        console.warn('[Step3Deploy] SIWE failed:', authErr);
        setSyncErrMsg('Autenticación rechazada. El fondo existe on-chain — intentá recargar la página.');
        setPostStep('sync_failed');
        return;
      }
    }

    setPostStep('syncing');
    let synced = false;
    for (let attempt = 0; attempt < MAX_SYNC_RETRIES; attempt++) {
      try {
        await fundsService.syncFund(fundAddr);
        synced = true;
        break;
      } catch (syncErr) {
        console.warn(`[Step3Deploy] sync attempt ${attempt + 1} failed:`, syncErr);
        if (attempt < MAX_SYNC_RETRIES - 1) {
          await new Promise((r) => setTimeout(r, SYNC_RETRY_DELAY * (attempt + 1)));
        }
      }
    }

    if (!synced) {
      setSyncErrMsg(
        'No se pudo registrar en la base de datos. ' +
        'El fondo existe on-chain y se sincronizará automáticamente.'
      );
      setPostStep('sync_failed');
      return;
    }

    setPostStep('polling');
    attempts.current = 0;
    await queryClient.invalidateQueries({ queryKey: FUND_QUERY_KEY });

    pollRef.current = setInterval(async () => {
      attempts.current += 1;
      await queryClient.invalidateQueries({ queryKey: FUND_QUERY_KEY });

      const cached = queryClient.getQueryData<{ contract_address: string } | null>(FUND_QUERY_KEY);
      const exhausted = attempts.current >= MAX_POLL_ATTEMPTS;

      if (cached || exhausted) {
        clearInterval(pollRef.current!);
        setPostStep('ready');
      }
    }, POLL_INTERVAL_MS);
  }, [fundAddr, isAuthenticated, login, queryClient]);

  useEffect(() => {
    if (!isSuccess) return;
    void runPostDeployFlow();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isSuccess]); 

  const handleGoToDashboard = useCallback(() => {
    onSuccess(); 
    navigate(ROUTES.DASHBOARD, {
      state:   { newFundAddr: fundAddr },
      replace: true,
    });
  }, [onSuccess, navigate, fundAddr]);

  const postStepConfig: Record<PostDeployStep, { label: string; color: string }> = {
    idle:            { label: '',                                               color: '' },
    authenticating:  { label: 'Firmá el mensaje en tu wallet…',                color: 'text-(--accent2) border-(--accent2)' },
    syncing:         { label: 'Registrando en base de datos…',                  color: 'text-(--accent2) border-(--accent2)' },
    polling:         { label: 'Verificando fondo en la red…',                   color: 'text-(--accent2) border-(--accent2)' },
    ready:           { label: '¡Fondo verificado y listo!',                     color: 'text-(--success) border-(--success)' },
    sync_failed:     { label: syncErrMsg ?? 'Sync falló — el fondo existe on-chain.', color: 'text-(--warn) border-(--warn)' },
  };

  const showDashboardBtn = isSuccess && (postStep === 'ready' || postStep === 'sync_failed');
  const dashboardBtnGreen = postStep === 'ready';

  return (
    <div className="space-y-6">

      {/* ── Resumen ── */}
      <div className="bg-(--surface2) border border-(--border2) rounded-xl p-5">
        <div className="font-mono text-[0.65rem] text-(--muted) uppercase tracking-widest mb-4">
          Summary
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm font-mono">
          {([
            ['Principal',        fmtUsdc(calculator.principal)],
            ['Monthly deposit',  fmtUsdc(result?.monthlyGross ?? 0)],
            ['Age range',        `${calculator.currentAge} → ${calculator.retirementAge}`],
            ['APY',              `${calculator.apyPercent}%`],
            ['Protocol',         selectedProtocol?.name ?? '—'],
            ['Total to approve', fmtUsdc(totalApprove)],
          ] as [string, string][]).map(([label, value]) => (
            <div key={label}>
              <div className="text-(--muted) text-[0.6rem] uppercase tracking-wider mb-0.5">{label}</div>
              <div className="text-(--text) font-bold">{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Nota de allowance ── */}
      <div className="bg-[#7b4dff11] border border-[#7b4dff44] rounded-xl px-4 py-3 font-mono text-xs text-(--accent2)">
        Aprobarás <strong>{fmtUsdc(totalApprove)}</strong> para el contrato Factory,
        luego se desplegará tu PersonalFund en una transacción.
      </div>

      {/* ── Botones de acción on-chain ── */}
      <div className="space-y-3">
        {/* Approve */}
        <button
          onClick={() => void approveUsdc()}
          disabled={approved || isDeploying}
          className={cn(
            'w-full flex items-center justify-center gap-3 py-4 rounded-xl font-bold text-base transition',
            approved
              ? 'bg-[#22c55e] border border-[#22c55e] text-white cursor-default shadow-[0_0_12px_#22c55e55]'
              : 'bg-(--accent) text-(--bg) hover:opacity-90 disabled:opacity-50 disabled:cursor-wait',
          )}
        >
          {status === 'approving'
            ? <><Loader2 size={18} className="animate-spin" /> {t('approving')}</>
            : approved
            ? <><CheckCircle size={18} /> {t('approved')}</>
            : t('approveUsdc')
          }
        </button>

        {/* Deploy */}
        <button
          onClick={() => void deployFund()}
          disabled={!approved || isDeploying || isSuccess}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-xl font-bold text-base bg-(--accent) text-(--bg) hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {status === 'deploying'
            ? <><Loader2 size={18} className="animate-spin" /> {t('deploying')}</>
            : isError
            ? t('retryDeploy', { defaultValue: 'Retry Deploy' })
            : t('deployFund')
          }
        </button>
      </div>

      {/* ── Status on-chain (tx hash + dirección del fondo) ── */}
      {(txHash || isSuccess || isError) && (
        <div className={cn(
          'flex items-start gap-3 border rounded-xl px-4 py-3 font-mono text-sm',
          isSuccess && 'border-(--success) text-(--success)',
          isError   && 'border-(--danger)  text-(--danger)',
          !isSuccess && !isError && 'border-(--accent2) text-(--accent2)',
        )}>
          {isError
            ? <AlertCircle size={16} className="shrink-0 mt-0.5" />
            : <CheckCircle size={16} className="shrink-0 mt-0.5" />
          }
          <div className="flex-1 min-w-0">
            {isError && <div>{errorMsg}</div>}
            {isSuccess && fundAddr && (
              <div>
                🎉 Fondo deployado en{' '}
                <a
                  href={getExplorerAddressUrl(chainId, fundAddr)}
                  target="_blank" rel="noopener noreferrer"
                  className="text-(--accent2) hover:opacity-80 underline"
                >
                  {fundAddr.slice(0, 10)}…{fundAddr.slice(-8)}
                </a>
              </div>
            )}
            {txHash && (
              <a
                href={getExplorerUrl(chainId, txHash)}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-(--accent2) hover:opacity-80 mt-1"
              >
                {t('viewOnExplorer')} <ExternalLink size={12} />
              </a>
            )}
          </div>
        </div>
      )}

      {isSuccess && postStep !== 'idle' && (
        <div className={cn(
          'flex items-center gap-3 border rounded-xl px-4 py-3 font-mono text-sm',
          postStepConfig[postStep].color,
        )}>
          {postStep === 'ready'
            ? <CheckCircle size={16} className="shrink-0" />
            : postStep === 'sync_failed'
            ? <AlertCircle size={16} className="shrink-0" />
            : postStep === 'authenticating'
            ? <ShieldCheck size={16} className="shrink-0 animate-pulse" />
            : <RefreshCw size={16} className="shrink-0 animate-spin" />
          }
          <span>{postStepConfig[postStep].label}</span>
        </div>
      )}

      {/* ── Volver ── */}
      {!isSuccess && (
        <button
          onClick={() => { prevStep(); onBack(); }}
          disabled={isDeploying}
          className="text-sm text-(--muted) hover:text-(--text) transition disabled:opacity-40"
        >
          ← Volver a Protocolo
        </button>
      )}

      {/* ── Botón Dashboard ── */}
      {showDashboardBtn && (
        <button
          onClick={handleGoToDashboard}
          className={cn(
            'w-full flex items-center justify-center gap-3 py-4 rounded-xl font-bold text-base transition',
            dashboardBtnGreen
              ? 'bg-[#22c55e] text-white hover:bg-[#16a34a] shadow-[0_0_16px_#22c55e44]'
              : 'bg-(--warn) text-white hover:opacity-90',
          )}
        >
          <LayoutDashboard size={18} />
          {dashboardBtnGreen
            ? 'Ir al Dashboard'
            : 'Ir al Dashboard (sync pendiente)'
          }
        </button>
      )}
    </div>
  );
}