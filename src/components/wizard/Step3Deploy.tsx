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

const MAX_POLL_ATTEMPTS  = 15;
const POLL_INTERVAL_MS   = 4_000;
const MAX_SYNC_RETRIES   = 3;
const SYNC_RETRY_DELAY   = 2_000;
const MAX_LOGIN_ATTEMPTS = 2;

interface Step3Props {
  onBack:    () => void;
  onSuccess: () => void;
}

type PostDeployStep =
  | 'idle'
  | 'authenticating'
  | 'registering'
  | 'syncing'
  | 'polling'
  | 'ready'
  | 'auth_failed'
  | 'reg_failed'
  | 'sync_failed';

export function Step3Deploy({ onBack, onSuccess }: Step3Props) {
  const { t }       = useTranslation();
  const chainId     = useChainId();
  const navigate    = useNavigate();
  const queryClient = useQueryClient();

  const { calculator, result, selectedProtocol, prevStep, fundAddr: storeFundAddr } = useWizardStore();
  const { status, txHash, errorMsg, approveUsdc, deployFund, approved } = useDeployFund();
  const { login }       = useSiweAuth();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [postStep,   setPostStep]   = useState<PostDeployStep>('idle');
  const [syncErrMsg, setSyncErrMsg] = useState<string | null>(null);

  const pollRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const attempts = useRef(0);

  const fundAddr     = storeFundAddr ?? null;
  const totalApprove = calculator.principal + (result?.monthlyGross ?? 0);
  const isDeploying  = status === 'approving' || status === 'deploying';
  const isSuccess    = status === 'success';
  const isError      = status === 'error';

  // Post-deploy flow 
  // Orden:
  //   1. Asegurar autenticación (SIWE). Reintenta MAX_LOGIN_ATTEMPTS veces
  //      antes de abortar — el flujo anterior abortaba en el primer fallo.
  //   2. POST /funds/register  (con reintentos internos en fundsService)
  //      409 = ya existe = ok.  Si falla, fundsService lo guarda en
  //      localStorage y retryPendingRegister() lo reintentará en el
  //      próximo login.
  //   3. POST /funds/sync      (hasta MAX_SYNC_RETRIES con backoff)
  //   4. Poll GET /funds/me    hasta que aparezca el registro o se agoten
  //      los intentos.
  const runPostDeployFlow = useCallback(async () => {
    if (!fundAddr || !result || !selectedProtocol) {
      console.warn('[Step3Deploy] runPostDeployFlow llamado sin fundAddr — abortando');
      return;
    }

    // Step 1: autenticar con reintentos 
    if (!isAuthenticated) {
      setPostStep('authenticating');

      let loginOk = false;
      for (let attempt = 0; attempt < MAX_LOGIN_ATTEMPTS; attempt++) {
        try {
          await login();
          loginOk = true;
          break;
        } catch (authErr) {
          console.warn(`[Step3Deploy] SIWE intento ${attempt + 1} fallido:`, authErr);
          if (attempt < MAX_LOGIN_ATTEMPTS - 1) {
            // Pequeña pausa antes de reintentar para que el usuario pueda
            // reaccionar si rechazó la firma por error.
            await new Promise((r) => setTimeout(r, 1_500));
          }
        }
      }

      if (!loginOk) {
        console.warn('[Step3Deploy] Auth fallida tras todos los reintentos — guardando en cola pendiente');
        fundsService.registerFund({
          contract_address:       fundAddr,
          principal:              calculator.principal,
          monthly_deposit:        result.monthlyGross,
          desired_monthly_income: calculator.desiredMonthlyIncome,
          current_age:            calculator.currentAge,
          retirement_age:         calculator.retirementAge,
          payment_years:          calculator.paymentYears,
          apy_percent:            calculator.apyPercent,
          protocol_address:       selectedProtocol.address,
        }).catch(() => {
          // registerFund ya guarda en localStorage si falla — ignorar el error aquí
        });
        setSyncErrMsg(
          'No se pudo autenticar. El fondo existe on-chain y se registrará automáticamente ' +
          'la próxima vez que inicies sesión.',
        );
        setPostStep('auth_failed');
        return;
      }
    }

    // Step 2: registrar en DB 
    setPostStep('registering');
    let regFailed = false;
    try {
      await fundsService.registerFund({
        contract_address:       fundAddr,
        principal:              calculator.principal,
        monthly_deposit:        result.monthlyGross,
        desired_monthly_income: calculator.desiredMonthlyIncome,
        current_age:            calculator.currentAge,
        retirement_age:         calculator.retirementAge,
        payment_years:          calculator.paymentYears,
        apy_percent:            calculator.apyPercent,
        protocol_address:       selectedProtocol.address,
      });
    } catch (regErr: unknown) {
      const httpStatus = (regErr as { response?: { status?: number } })?.response?.status;
      if (httpStatus === 409 || httpStatus === 200) {
        // 409 = el registro ya existe (deploy duplicado o reintento exitoso previo)
        console.info('[Step3Deploy] registerFund devolvió', httpStatus, '— tratado como éxito');
      } else {
        regFailed = true;
        // fundsService ya guardó el payload en localStorage para reintento
        console.warn('[Step3Deploy] registerFund falló — payload guardado en cola pendiente:', regErr);
      }
    }

    // Step 3: sincronizar datos on-chain 
    setPostStep('syncing');
    let synced = false;
    for (let attempt = 0; attempt < MAX_SYNC_RETRIES; attempt++) {
      try {
        await fundsService.syncFund(fundAddr);
        synced = true;
        break;
      } catch (syncErr) {
        console.warn(`[Step3Deploy] sync intento ${attempt + 1} fallido:`, syncErr);
        if (attempt < MAX_SYNC_RETRIES - 1) {
          await new Promise((r) => setTimeout(r, SYNC_RETRY_DELAY * (attempt + 1)));
        }
      }
    }

    if (!synced && regFailed) {
      setSyncErrMsg(
        'Registro y sincronización fallaron. El fondo existe on-chain; ' +
        'se registrará automáticamente la próxima vez que inicies sesión.',
      );
      setPostStep('sync_failed');
      return;
    }

    if (!synced) {
      setSyncErrMsg(
        'No se pudo sincronizar. El fondo existe on-chain y aparecerá en el Dashboard pronto.',
      );
      setPostStep('sync_failed');
      return;
    }

    if (regFailed) {
      setSyncErrMsg(
        'El registro en DB está pendiente, pero la sincronización fue exitosa. ' +
        'El fondo aparecerá en el Dashboard al iniciar sesión nuevamente.',
      );
      setPostStep('reg_failed');
      return;
    }

    // Step 4: poll hasta que GET /funds/me devuelva el registro
    setPostStep('polling');
    attempts.current = 0;

    await queryClient.invalidateQueries({ queryKey: FUND_QUERY_KEY });
    pollRef.current = setInterval(async () => {
      attempts.current += 1;
      try {
        const record = await queryClient.fetchQuery({
          queryKey: FUND_QUERY_KEY,
          staleTime: 0,
        });
        if (record || attempts.current >= MAX_POLL_ATTEMPTS) {
          clearInterval(pollRef.current!);
          setPostStep(record ? 'ready' : 'sync_failed');
          if (!record) {
            setSyncErrMsg('El fondo no apareció en la base de datos aún. Podés ir al Dashboard igual.');
          }
        }
      } catch {
        if (attempts.current >= MAX_POLL_ATTEMPTS) {
          clearInterval(pollRef.current!);
          setPostStep('sync_failed');
          setSyncErrMsg('No se pudo verificar el fondo en la base de datos.');
        }
      }
    }, POLL_INTERVAL_MS);
  }, [
    fundAddr,
    isAuthenticated,
    login,
    queryClient,
    calculator,
    result,
    selectedProtocol,
  ]);

  const runPostDeployFlowRef = useRef(runPostDeployFlow);
  useEffect(() => {
    runPostDeployFlowRef.current = runPostDeployFlow;
  }, [runPostDeployFlow]);

  useEffect(() => {
    if (!isSuccess) return;
    void runPostDeployFlowRef.current();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isSuccess]);

  const handleRetryLogin = useCallback(async () => {
    setSyncErrMsg(null);
    setPostStep('authenticating');
    try {
      await login();
      await runPostDeployFlowRef.current();
    } catch (retryErr) {
      console.warn('[Step3Deploy] SIWE retry fallido:', retryErr);
      setSyncErrMsg('Autenticación rechazada nuevamente. Intentá de nuevo.');
      setPostStep('auth_failed');
    }
  }, [login]);

  const handleGoToDashboard = useCallback(() => {
    onSuccess();
    navigate(ROUTES.DASHBOARD, {
      state:   { newFundAddr: fundAddr },
      replace: true,
    });
  }, [onSuccess, navigate, fundAddr]);

  const showDashboardBtn =
    isSuccess &&
    (postStep === 'ready' || postStep === 'sync_failed' || postStep === 'reg_failed' || postStep === 'auth_failed');
  const showRetryLoginBtn = isSuccess && !isAuthenticated && postStep === 'auth_failed';
  const dashboardBtnGreen = postStep === 'ready';

  const postStepConfig: Record<PostDeployStep, { label: string; color: string }> = {
    idle:           { label: '',                                                                                      color: '' },
    authenticating: { label: 'Firmá el mensaje en tu wallet…',                                                       color: 'text-(--accent2) border-(--accent2)' },
    registering:    { label: 'Registrando fondo en la base de datos…',                                               color: 'text-(--accent2) border-(--accent2)' },
    syncing:        { label: 'Sincronizando datos on-chain…',                                                         color: 'text-(--accent2) border-(--accent2)' },
    polling:        { label: 'Verificando fondo en la red…',                                                          color: 'text-(--accent2) border-(--accent2)' },
    ready:          { label: '¡Fondo verificado y listo!',                                                            color: 'text-(--success) border-(--success)'   },
    auth_failed:    { label: syncErrMsg ?? 'Auth fallida — el fondo se registrará al iniciar sesión.',                color: 'text-(--warn) border-(--warn)'         },
    reg_failed:     { label: syncErrMsg ?? 'Registro pendiente — el indexer lo completará.',                          color: 'text-(--warn) border-(--warn)'         },
    sync_failed:    { label: syncErrMsg ?? 'Sync falló — el fondo existe on-chain.',                                  color: 'text-(--warn) border-(--warn)'         },
  };

  // Render 
  return (
    <div className="space-y-6">

      {/* Summary */}
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

      {/* Allowance note */}
      <div className="bg-[#7b4dff11] border border-[#7b4dff44] rounded-xl px-4 py-3 font-mono text-xs text-(--accent2)">
        Aprobarás <strong>{fmtUsdc(totalApprove)}</strong> para el contrato Factory,
        luego se desplegará tu PersonalFund en una transacción.
      </div>

      {/* Action buttons */}
      <div className="space-y-3">
        {/* Approve USDC */}
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

      {/* On-chain status */}
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
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-(--accent2) hover:opacity-80 underline"
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

      {/* Post-deploy status */}
      {isSuccess && postStep !== 'idle' && (
        <div className={cn(
          'flex items-center gap-3 border rounded-xl px-4 py-3 font-mono text-sm',
          postStepConfig[postStep].color,
        )}>
          {postStep === 'ready'
            ? <CheckCircle size={16} className="shrink-0" />
            : postStep === 'auth_failed' || postStep === 'sync_failed' || postStep === 'reg_failed'
            ? <AlertCircle size={16} className="shrink-0" />
            : postStep === 'authenticating'
            ? <ShieldCheck size={16} className="shrink-0 animate-pulse" />
            : <RefreshCw size={16} className="shrink-0 animate-spin" />
          }
          <span>{postStepConfig[postStep].label}</span>
        </div>
      )}

      {/* Back button — oculto una vez deployado */}
      {!isSuccess && (
        <button
          onClick={() => { prevStep(); onBack(); }}
          disabled={isDeploying}
          className="text-sm text-(--muted) hover:text-(--text) transition disabled:opacity-40"
        >
          ← Volver a Protocolo
        </button>
      )}

      {/* Retry login — solo cuando SIWE falló y el usuario sigue sin autenticar */}
      {showRetryLoginBtn && (
        <button
          onClick={() => void handleRetryLogin()}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-xl font-bold text-base bg-(--accent2) text-white hover:opacity-90 transition disabled:opacity-50 disabled:cursor-wait"
        >
          <><ShieldCheck size={18} /> Reintentar login</>
        </button>
      )}

      {/* Dashboard button — disponible incluso en estados de fallo parcial */}
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