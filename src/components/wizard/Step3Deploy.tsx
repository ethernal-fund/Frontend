/**
 * Step3Deploy.tsx
 *
 * Responsibilities:
 *  1. Drive the two on-chain transactions (approve + deploy) via useDeployFund.
 *  2. Once the fund address is confirmed on-chain, run the post-deploy flow:
 *       auth → register in DB → sync → poll until GET /funds/me returns data.
 *
 * Architecture notes:
 *  - useDeployFund handles ONLY on-chain operations (no DB calls).
 *  - This component owns ALL database registration logic.
 *  - The useEffect that triggers runPostDeployFlow depends on BOTH `isSuccess`
 *    AND `fundAddr` to prevent the race condition where isSuccess fires before
 *    the fund address propagates from the hook's local state.
 *  - hasTriggeredPostFlow ref prevents double-execution on re-renders.
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import { useTranslation }  from 'react-i18next'
import { useChainId }      from 'wagmi'
import { useNavigate }     from 'react-router-dom'
import { useQueryClient }  from '@tanstack/react-query'
import {
  ExternalLink, CheckCircle, Loader2, AlertCircle,
  LayoutDashboard, RefreshCw, ShieldCheck,
} from 'lucide-react'

import { useWizardStore }   from '@/stores/wizardStore'
import { useDeployFund }    from '@/hooks/useDeployFund'
import { useSiweAuth }      from '@/hooks/useSiweAuth'
import { useAuthStore }     from '@/stores/authStore'
import { fundsService }     from '@/services/fundsService'
import { FUND_QUERY_KEY }   from '@/hooks/useMyFund'
import { fmtUsdc }          from '@/lib/calculator'
import { getExplorerUrl, getExplorerAddressUrl } from '@/config/chains'
import { cn }               from '@/lib/cn'
import { ROUTES }           from '@/router/routes'

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_POLL_ATTEMPTS  = 15
const POLL_INTERVAL_MS   = 4_000
const MAX_SYNC_RETRIES   = 3
const SYNC_RETRY_DELAY   = 2_000
const MAX_LOGIN_ATTEMPTS = 2

// ─── Types ────────────────────────────────────────────────────────────────────

interface Step3Props {
  onBack:    () => void
  onSuccess: () => void
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
  | 'sync_failed'

// ─── Component ────────────────────────────────────────────────────────────────

export function Step3Deploy({ onBack, onSuccess }: Step3Props) {
  const { t }       = useTranslation()
  const chainId     = useChainId()
  const navigate    = useNavigate()
  const queryClient = useQueryClient()

  // Wizard state — for display only (not for fundAddr resolution)
  const { calculator, result, selectedProtocol, prevStep } = useWizardStore()

  // useDeployFund now sets status='success' immediately after extracting the
  // fund address — no DB work inside the hook.
  const {
    status,
    txHash,
    errorMsg,
    approveUsdc,
    deployFund,
    approved,
    fundAddr: hookFundAddr,   // ← prefer hook's local state over store
  } = useDeployFund()

  // Fallback to store value in the unlikely case hookFundAddr is null but the
  // store was already updated (e.g. after a page remount mid-flow).
  const storeFundAddr = useWizardStore((s) => s.fundAddr)
  const fundAddr      = hookFundAddr ?? storeFundAddr ?? null

  const { login }       = useSiweAuth()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  const [postStep,   setPostStep]   = useState<PostDeployStep>('idle')
  const [syncErrMsg, setSyncErrMsg] = useState<string | null>(null)

  const pollRef               = useRef<ReturnType<typeof setInterval> | null>(null)
  const attempts              = useRef(0)
  // Prevents double-execution if the component re-renders while flow is running
  const hasTriggeredPostFlow  = useRef(false)

  const isDeploying = status === 'approving' || status === 'deploying'
  const isSuccess   = status === 'success'
  const isError     = status === 'error'

  const totalApprove = calculator.principal + (result?.monthlyGross ?? 0)

  // ── Post-deploy flow ──────────────────────────────────────────────────────
  //
  // Order:
  //   1. Ensure SIWE auth (up to MAX_LOGIN_ATTEMPTS).
  //      On failure: save to pending queue; show degraded UI.
  //   2. POST /funds/register (internal retry + localStorage queue on failure).
  //      409 = already exists = OK.
  //   3. POST /funds/sync (up to MAX_SYNC_RETRIES with backoff).
  //   4. Poll GET /funds/me until record appears or attempts are exhausted.

  const runPostDeployFlow = useCallback(async () => {
    // This guard is the ultimate safety net, but the useEffect dependency
    // array is the primary guard (fundAddr must be non-null).
    if (!fundAddr || !result || !selectedProtocol) {
      console.warn('[Step3Deploy] runPostDeployFlow: missing required state — aborting')
      return
    }

    // ── Step 1: Auth ────────────────────────────────────────────────────────
    if (!isAuthenticated) {
      setPostStep('authenticating')

      let loginOk = false
      for (let attempt = 0; attempt < MAX_LOGIN_ATTEMPTS; attempt++) {
        try {
          await login()
          loginOk = true
          break
        } catch (authErr) {
          console.warn(`[Step3Deploy] SIWE attempt ${attempt + 1} failed:`, authErr)
          if (attempt < MAX_LOGIN_ATTEMPTS - 1) {
            await new Promise((r) => setTimeout(r, 1_500))
          }
        }
      }

      if (!loginOk) {
        // Auth failed — save to pending queue so it retries on next login.
        // fundsService.registerFund already persists to localStorage on failure.
        console.warn('[Step3Deploy] Auth failed after all attempts — queuing register')
        fundsService.registerFund({
          contract_address:       fundAddr,
          chain_id:               chainId,
          principal:              calculator.principal,
          monthly_deposit:        result.monthlyGross,
          desired_monthly_income: calculator.desiredMonthlyIncome,
          current_age:            calculator.currentAge,
          retirement_age:         calculator.retirementAge,
          payment_years:          calculator.paymentYears,
          apy_percent:            calculator.apyPercent,
          protocol_address:       selectedProtocol.address,
        }).catch(() => {
          // registerFund already saves to localStorage on failure — swallow here
        })
        setSyncErrMsg(
          'Authentication failed. Your fund exists on-chain and will be ' +
          'registered automatically on your next login.',
        )
        setPostStep('auth_failed')
        return
      }
    }

    // ── Step 2: Register in DB ──────────────────────────────────────────────
    setPostStep('registering')
    let regFailed = false

    try {
      await fundsService.registerFund({
        contract_address:       fundAddr,
        chain_id:               chainId,
        principal:              calculator.principal,
        monthly_deposit:        result.monthlyGross,
        desired_monthly_income: calculator.desiredMonthlyIncome,
        current_age:            calculator.currentAge,
        retirement_age:         calculator.retirementAge,
        payment_years:          calculator.paymentYears,
        apy_percent:            calculator.apyPercent,
        protocol_address:       selectedProtocol.address,
      })
    } catch (regErr: unknown) {
      // fundsService already handles 409 as success internally.
      // Any error reaching here is a genuine failure; payload is already queued.
      regFailed = true
      console.warn('[Step3Deploy] registerFund failed — payload queued:', regErr)
    }

    // ── Step 3: Sync on-chain data ──────────────────────────────────────────
    setPostStep('syncing')
    let synced = false

    for (let attempt = 0; attempt < MAX_SYNC_RETRIES; attempt++) {
      try {
        await fundsService.syncFund(fundAddr)
        synced = true
        break
      } catch (syncErr) {
        console.warn(`[Step3Deploy] sync attempt ${attempt + 1} failed:`, syncErr)
        if (attempt < MAX_SYNC_RETRIES - 1) {
          await new Promise((r) => setTimeout(r, SYNC_RETRY_DELAY * (attempt + 1)))
        }
      }
    }

    if (!synced && regFailed) {
      setSyncErrMsg(
        'Registration and sync failed. Your fund exists on-chain and will ' +
        'appear in the dashboard after your next login.',
      )
      setPostStep('sync_failed')
      return
    }

    if (!synced) {
      setSyncErrMsg(
        'Sync failed. Your fund exists on-chain and will appear in the dashboard shortly.',
      )
      setPostStep('sync_failed')
      return
    }

    if (regFailed) {
      setSyncErrMsg(
        'DB registration is queued. Sync succeeded — your fund will appear soon.',
      )
      setPostStep('reg_failed')
      // Don't return — continue to poll so the user gets feedback if it works
    }

    // ── Step 4: Poll until GET /funds/me returns the record ────────────────
    setPostStep('polling')
    attempts.current = 0

    await queryClient.invalidateQueries({ queryKey: FUND_QUERY_KEY })

    pollRef.current = setInterval(async () => {
      attempts.current += 1
      try {
        const record = await queryClient.fetchQuery({
          queryKey:  FUND_QUERY_KEY,
          staleTime: 0,
        })
        if (record || attempts.current >= MAX_POLL_ATTEMPTS) {
          clearInterval(pollRef.current!)
          if (record) {
            setPostStep('ready')
          } else {
            setPostStep('sync_failed')
            setSyncErrMsg(
              'Fund not yet visible in the database. ' +
              'You can still go to the Dashboard — it will appear shortly.',
            )
          }
        }
      } catch {
        if (attempts.current >= MAX_POLL_ATTEMPTS) {
          clearInterval(pollRef.current!)
          setPostStep('sync_failed')
          setSyncErrMsg('Could not verify fund in the database.')
        }
      }
    }, POLL_INTERVAL_MS)
  }, [
    fundAddr,
    chainId,
    isAuthenticated,
    login,
    queryClient,
    calculator,
    result,
    selectedProtocol,
  ])

  // Keep ref fresh so handleRetryLogin always has the latest closure
  const runPostDeployFlowRef = useRef(runPostDeployFlow)
  useEffect(() => {
    runPostDeployFlowRef.current = runPostDeployFlow
  }, [runPostDeployFlow])

  // ── Trigger post-deploy flow ──────────────────────────────────────────────
  //
  // Depends on BOTH isSuccess AND fundAddr.
  //
  // Previously only isSuccess was in the dep array, so the effect could fire
  // with fundAddr=null if React batched the state updates from useDeployFund
  // and the component re-rendered before the Zustand store propagated.
  // Now we wait for fundAddr to be non-null before proceeding.

  useEffect(() => {
    if (!isSuccess || !fundAddr) return
    if (hasTriggeredPostFlow.current) return

    hasTriggeredPostFlow.current = true
    void runPostDeployFlowRef.current()

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [isSuccess, fundAddr]) // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup poll on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  // ── Retry login handler ───────────────────────────────────────────────────

  const handleRetryLogin = useCallback(async () => {
    setSyncErrMsg(null)
    setPostStep('authenticating')
    try {
      await login()
      // Reset trigger guard so the flow re-runs with a fresh auth token
      hasTriggeredPostFlow.current = false
      await runPostDeployFlowRef.current()
    } catch (retryErr) {
      console.warn('[Step3Deploy] SIWE retry failed:', retryErr)
      setSyncErrMsg('Authentication rejected again. Please try once more.')
      setPostStep('auth_failed')
    }
  }, [login])

  // ── Navigation ────────────────────────────────────────────────────────────

  const handleGoToDashboard = useCallback(() => {
    onSuccess()
    navigate(ROUTES.DASHBOARD, {
      state:   { newFundAddr: fundAddr },
      replace: true,
    })
  }, [onSuccess, navigate, fundAddr])

  // ── Derived UI flags ──────────────────────────────────────────────────────

  const showDashboardBtn =
    isSuccess &&
    (postStep === 'ready'      ||
     postStep === 'sync_failed' ||
     postStep === 'reg_failed'  ||
     postStep === 'auth_failed')

  const showRetryLoginBtn  = isSuccess && !isAuthenticated && postStep === 'auth_failed'
  const dashboardBtnGreen  = postStep === 'ready'

  const postStepConfig: Record<PostDeployStep, { label: string; color: string }> = {
    idle:           { label: '',                                                                        color: '' },
    authenticating: { label: 'Sign the message in your wallet…',                                       color: 'text-(--accent2) border-(--accent2)' },
    registering:    { label: 'Registering fund in the database…',                                      color: 'text-(--accent2) border-(--accent2)' },
    syncing:        { label: 'Syncing on-chain data…',                                                 color: 'text-(--accent2) border-(--accent2)' },
    polling:        { label: 'Verifying fund on the network…',                                         color: 'text-(--accent2) border-(--accent2)' },
    ready:          { label: 'Fund verified and ready!',                                               color: 'text-(--success) border-(--success)'  },
    auth_failed:    { label: syncErrMsg ?? 'Auth failed — fund will register on next login.',          color: 'text-(--warn) border-(--warn)'        },
    reg_failed:     { label: syncErrMsg ?? 'Registration queued — indexer will complete it.',          color: 'text-(--warn) border-(--warn)'        },
    sync_failed:    { label: syncErrMsg ?? 'Sync failed — fund exists on-chain.',                      color: 'text-(--warn) border-(--warn)'        },
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Summary ── */}
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

      {/* ── Allowance note ── */}
      <div className="bg-[#7b4dff11] border border-[#7b4dff44] rounded-xl px-4 py-3 font-mono text-xs text-(--accent2)">
        You will approve <strong>{fmtUsdc(totalApprove)}</strong> to the Factory contract,
        then your PersonalFund will be deployed in one transaction.
      </div>

      {/* ── Action buttons ── */}
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

      {/* ── On-chain tx status ── */}
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
                🎉 Fund deployed at{' '}
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

      {/* ── Post-deploy status ── */}
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

      {/* ── Back button — hidden once deployed ── */}
      {!isSuccess && (
        <button
          onClick={() => { prevStep(); onBack() }}
          disabled={isDeploying}
          className="text-sm text-(--muted) hover:text-(--text) transition disabled:opacity-40"
        >
          ← Back to Protocol
        </button>
      )}

      {/* ── Retry login ── */}
      {showRetryLoginBtn && (
        <button
          onClick={() => void handleRetryLogin()}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-xl font-bold text-base bg-(--accent2) text-white hover:opacity-90 transition"
        >
          <ShieldCheck size={18} /> Retry Login
        </button>
      )}

      {/* ── Dashboard button — available even on partial failure ── */}
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
            ? 'Go to Dashboard'
            : 'Go to Dashboard (sync pending)'
          }
        </button>
      )}

    </div>
  )
}