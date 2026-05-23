import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react'
import { useNavigate, useLocation }                          from 'react-router-dom'
import {
  useWriteContract, useWaitForTransactionReceipt,
  useChainId, useConnection, useReadContract,
}                                                            from 'wagmi'
import { format }                                            from 'date-fns'
import {
  Wallet, Shield, TrendingUp, DollarSign, Clock,
  CheckCircle, AlertCircle, ArrowRight, RefreshCw, Sparkles,
  Target, MessageCircle, ExternalLink, PieChart,
  Settings, Zap, BarChart3, BookOpen, ChevronRight, Activity,
  AlertTriangle, X, Info, ChevronDown,
} from 'lucide-react'

import { useDashboard }                                      from '@/hooks/useDashboard'
import { useProtocols }                                      from '@/hooks/useProtocols'
import { useInvalidateFund }                                 from '@/hooks/useMyFund'
import { useMonthlyDeposit }                                 from '@/hooks/useMonthlyDeposit'
import { useExtraDeposit }                                   from '@/hooks/useExtraDeposit'
import { USER_PREFERENCES_ABI, PERSONAL_FUND_ABI }          from '@/config/abis'
import { getContractAddress, ZERO_ADDRESS as ZERO_ADDR }     from '@/config/addresses'
import { getExplorerAddressUrl }                             from '@/config/chains'
import { toUsdcBigInt }                                      from '@/lib/calculator'

// Constants 

const ZERO_ADDRESS = ZERO_ADDR

const RISK_LEVELS = [
  {
    value:       0,
    label:       'Conservador',
    description: 'Bajo riesgo, rendimientos estables y protección del capital',
    accent:      '#10b981',
    badge:       'text-emerald-400 border-emerald-500/40 bg-emerald-500/10',
    ring:        'border-emerald-500/60 bg-emerald-500/10',
    icon:        Shield,
  },
  {
    value:       1,
    label:       'Moderado',
    description: 'Balance entre crecimiento y estabilidad, ideal para largo plazo',
    accent:      '#3b82f6',
    badge:       'text-blue-400 border-blue-500/40 bg-blue-500/10',
    ring:        'border-blue-500/60 bg-blue-500/10',
    icon:        BarChart3,
  },
  {
    value:       2,
    label:       'Agresivo',
    description: 'Máximo potencial de rendimiento con mayor exposición al riesgo',
    accent:      '#a78bfa',
    badge:       'text-violet-400 border-violet-500/40 bg-violet-500/10',
    ring:        'border-violet-500/60 bg-violet-500/10',
    icon:        Zap,
  },
] as const

const STRATEGY_TYPES = [
  { value: 0, label: 'Concentrado',   description: 'Todo en el mejor protocolo según tu perfil',               icon: Target    },
  { value: 1, label: 'Diversificado', description: 'Distribución entre múltiples protocolos',                  icon: PieChart  },
  { value: 2, label: 'Híbrido',       description: 'Combinación dinámica ajustada al rendimiento del mercado', icon: Activity  },
] as const

// Placeholder — swap for API call when backend endpoint is ready
const ADMIN_CONTENT = [
  {
    id: 1, type: 'recommendation' as const,
    title:   'Estrategia recomendada para Q1 2025',
    summary: 'Dados los indicadores macroeconómicos actuales, el equipo recomienda aumentar exposición a Aave v3 en Arbitrum.',
    date: 'Feb 15, 2026', icon: TrendingUp, accent: '#6366f1',
  },
  {
    id: 2, type: 'course' as const,
    title:   'Módulo 3: Fundamentos de DeFi',
    summary: 'Aprende cómo funcionan los protocolos de lending descentralizado y cómo evaluar su seguridad.',
    date: 'Feb 10, 2026', icon: BookOpen, accent: '#ec4899',
  },
  {
    id: 3, type: 'recommendation' as const,
    title:   'Alerta: Actualización de riesgo',
    summary: 'Compound Finance actualizó sus parámetros de colateral. Usuarios con estrategia Agresiva deben revisar su exposición.',
    date: 'Feb 8, 2026', icon: AlertTriangle, accent: '#f59e0b',
  },
] as const

// Helpers 

function formatUSDC(amount: bigint | number | undefined | null): string {
  if (amount == null) return '$0.00'
  const n = typeof amount === 'bigint' ? Number(amount) / 1e6 : amount
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

function shortAddr(addr: string | undefined | null): string {
  if (!addr || addr.length < 10) return addr ?? '—'
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`
}

function riskLabel(level: number): string {
  return RISK_LEVELS[level as 0 | 1 | 2]?.label ?? 'Desconocido'
}

// CountdownTimer 

function CountdownTimer({ targetDate }: { targetDate: Date | null }) {
  const [display, setDisplay] = useState('—')
  useEffect(() => {
    if (!targetDate) { setDisplay('—'); return }
    const update = () => {
      const diff = targetDate.getTime() - Date.now()
      if (diff <= 0) { setDisplay('disponible'); return }
      const d = Math.floor(diff / 86_400_000)
      const h = Math.floor((diff % 86_400_000) / 3_600_000)
      const m = Math.floor((diff % 3_600_000) / 60_000)
      setDisplay(d > 0 ? `${d}d ${h}h` : `${h}h ${m}m`)
    }
    update()
    const id = setInterval(update, 60_000)
    return () => clearInterval(id)
  }, [targetDate])
  return <span>{display}</span>
}

// StatCard

function StatCard({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.08)' }}
      className="rounded-xl p-4 flex flex-col gap-1">
      <p className="text-[10px] tracking-[0.25em] uppercase font-medium" style={{ color: '#555' }}>{label}</p>
      <p className="text-lg font-bold" style={{ color: '#e8e4dc', fontFamily: "'DM Mono', monospace" }}>{value}</p>
      {sub && <p className="text-[10px]" style={{ color: '#444' }}>{sub}</p>}
    </div>
  )
}

// SectionCard 

function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl p-6 sm:p-8 ${className}`}
      style={{ background: 'rgba(255,255,255,0.025)', border: '0.5px solid rgba(255,255,255,0.07)' }}
    >
      {children}
    </div>
  )
}

// TxStatusBadge

function TxStatusBadge({ isPending, isConfirming, isConfirmed, error }: {
  isPending: boolean; isConfirming: boolean; isConfirmed: boolean; error?: Error | null
}) {
  if (error)       return <p className="text-xs text-red-400 mt-2 flex items-center gap-1"><AlertCircle size={12} />{error.message.split('\n')[0]}</p>
  if (isConfirmed) return <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1"><CheckCircle size={12} />Guardado on-chain</p>
  if (isConfirming) return <p className="text-xs mt-2 flex items-center gap-1" style={{ color: '#897148' }}><RefreshCw size={12} className="animate-spin" />Confirmando...</p>
  if (isPending)   return <p className="text-xs mt-2 flex items-center gap-1" style={{ color: '#897148' }}><RefreshCw size={12} className="animate-spin" />Esperando firma...</p>
  return null
}

// DepositModal 

interface DepositModalProps {
  mode:           'monthly' | 'extra'
  fundAddress:    `0x${string}`
  monthlyAmount:  bigint
  onClose:        () => void
}

function DepositModal({ mode, fundAddress, monthlyAmount, onClose }: DepositModalProps) {
  const [tab,    setTab]    = useState<'monthly' | 'extra'>(mode)
  const [amount, setAmount] = useState('')
  const [amtErr, setAmtErr] = useState<string | null>(null)

  const monthly = useMonthlyDeposit({ fundAddress, monthlyAmount })
  const extra   = useExtraDeposit({ fundAddress })

  const handleMonthlyDeposit = async () => {
    await monthly.deposit()
  }

  const handleExtraDeposit = async () => {
    const parsed = parseFloat(amount)
    if (isNaN(parsed) || parsed <= 0) { setAmtErr('Ingresá un monto válido mayor a 0'); return }
    setAmtErr(null)
    await extra.deposit(parsed)
  }

  const handleReclaim = async () => {
    await extra.reclaim()
  }

  const isDone = monthly.status === 'success' || extra.status === 'success'

  useEffect(() => {
    if (isDone) {
      const t = setTimeout(onClose, 2000)
      return () => clearTimeout(t)
    }
    return undefined
  }, [isDone, onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-6 sm:p-8 relative"
        style={{ background: '#141210', border: '0.5px solid rgba(255,255,255,0.1)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-base" style={{ color: '#e8e4dc', fontFamily: "'Cormorant Garamond', serif", fontSize: '1.3rem' }}>
            Realizar Depósito
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-opacity hover:opacity-60" style={{ color: '#555' }}>
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
          {(['monthly', 'extra'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all"
              style={tab === t
                ? { background: 'rgba(137,113,72,0.3)', color: '#c9a96e', border: '0.5px solid rgba(137,113,72,0.4)' }
                : { color: '#555' }
              }
            >
              {t === 'monthly' ? 'Mensual' : 'Extra'}
            </button>
          ))}
        </div>

        {/* Monthly tab */}
        {tab === 'monthly' && (
          <div className="space-y-4">
            <div className="rounded-xl p-5 text-center" style={{ background: 'rgba(137,113,72,0.08)', border: '0.5px solid rgba(137,113,72,0.2)' }}>
              <p className="text-[10px] tracking-widest uppercase mb-2" style={{ color: '#555' }}>Depósito mensual configurado</p>
              <p className="text-3xl font-bold" style={{ color: '#c9a96e', fontFamily: "'DM Mono', monospace" }}>
                {formatUSDC(monthlyAmount)}
              </p>
            </div>

            {!monthly.canDeposit && monthly.secondsLeft > 0 && (
              <div className="flex items-start gap-2 rounded-xl p-3" style={{ background: 'rgba(245,158,11,0.08)', border: '0.5px solid rgba(245,158,11,0.2)' }}>
                <Clock size={14} className="shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
                <p className="text-xs" style={{ color: '#f59e0b' }}>
                  Próximo depósito disponible en{' '}
                  <span className="font-bold">
                    {Math.floor(monthly.secondsLeft / 86400)}d {Math.floor((monthly.secondsLeft % 86400) / 3600)}h
                  </span>
                </p>
              </div>
            )}

            {monthly.missedMonths > 0 && (
              <div className="flex items-start gap-2 rounded-xl p-3" style={{ background: 'rgba(239,68,68,0.08)', border: '0.5px solid rgba(239,68,68,0.2)' }}>
                <AlertTriangle size={14} className="shrink-0 mt-0.5 text-red-400" />
                <p className="text-xs text-red-400">
                  Tenés <strong>{monthly.missedMonths}</strong> {monthly.missedMonths === 1 ? 'mes perdido' : 'meses perdidos'}.
                  Los depósitos atrasados aplican penalidades.
                </p>
              </div>
            )}

            <TxStatusBadge
              isPending={monthly.status === 'approving'}
              isConfirming={monthly.status === 'depositing'}
              isConfirmed={monthly.status === 'success'}
              error={monthly.errorMsg ? new Error(monthly.errorMsg) : null}
            />

            <button
              onClick={() => void handleMonthlyDeposit()}
              disabled={!monthly.canDeposit || monthly.isLoading}
              className="w-full py-3.5 rounded-xl font-semibold text-sm transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ background: 'rgba(137,113,72,0.25)', color: '#c9a96e', border: '0.5px solid rgba(137,113,72,0.4)' }}
            >
              {monthly.isLoading
                ? <><RefreshCw size={14} className="animate-spin" />{monthly.status === 'approving' ? 'Aprobando...' : 'Depositando...'}</>
                : <><DollarSign size={14} />Depositar {formatUSDC(monthlyAmount)}</>
              }
            </button>

            {monthly.txHash && (
              <a
                href={monthly.explorerUrl ?? '#'} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-1 text-xs hover:opacity-80 transition-opacity"
                style={{ color: '#555' }}
              >
                <ExternalLink size={11} />Ver en explorer
              </a>
            )}
          </div>
        )}

        {/* Extra tab */}
        {tab === 'extra' && (
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] tracking-widest uppercase mb-2" style={{ color: '#555' }}>
                Monto en USDC
              </label>
              <input
                type="number" min="1" step="0.01"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value)
                  setAmtErr(null)
                }}
                placeholder="0.00"
                className="w-full px-4 py-3 rounded-xl text-sm font-mono outline-none transition-colors"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: amtErr ? '0.5px solid rgba(239,68,68,0.6)' : '0.5px solid rgba(255,255,255,0.1)',
                  color: '#e8e4dc',
                }}
              />
              {amtErr && <p className="text-xs text-red-400 mt-1">{amtErr}</p>}
            </div>

            <div className="flex items-start gap-2 rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.06)' }}>
              <Info size={12} className="shrink-0 mt-0.5" style={{ color: '#555' }} />
              <p className="text-[11px] leading-relaxed" style={{ color: '#444' }}>
                Tenés 24 horas para reclamar un depósito extra con 1% de penalidad.
              </p>
            </div>

            {extra.inGrace && extra.lastExtraNet > 0n && (
              <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(245,158,11,0.08)', border: '0.5px solid rgba(245,158,11,0.2)' }}>
                <p className="text-xs font-semibold" style={{ color: '#f59e0b' }}>
                  Período de gracia activo — {Math.floor(extra.graceSecondsLeft / 3600)}h {Math.floor((extra.graceSecondsLeft % 3600) / 60)}m restantes
                </p>
                <p className="text-[11px]" style={{ color: '#888' }}>
                  Último depósito: {formatUSDC(extra.lastExtraNet)} neto
                </p>
                <button
                  onClick={() => void handleReclaim()}
                  disabled={extra.status === 'reclaiming'}
                  className="w-full py-2.5 rounded-lg text-xs font-semibold transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '0.5px solid rgba(245,158,11,0.3)' }}
                >
                  {extra.status === 'reclaiming'
                    ? <><RefreshCw size={12} className="animate-spin" />Reclamando...</>
                    : 'Reclamar depósito (−1%)'
                  }
                </button>
              </div>
            )}

            <TxStatusBadge
              isPending={extra.status === 'approving'}
              isConfirming={extra.status === 'depositing'}
              isConfirmed={extra.status === 'success'}
              error={extra.errorMsg ? new Error(extra.errorMsg) : null}
            />

            <button
              onClick={() => void handleExtraDeposit()}
              disabled={extra.isLoading || !amount}
              className="w-full py-3.5 rounded-xl font-semibold text-sm transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ background: 'rgba(137,113,72,0.25)', color: '#c9a96e', border: '0.5px solid rgba(137,113,72,0.4)' }}
            >
              {extra.isLoading
                ? <><RefreshCw size={14} className="animate-spin" />{extra.status === 'approving' ? 'Aprobando...' : 'Depositando...'}</>
                : <><DollarSign size={14} />Depositar Extra</>
              }
            </button>

            {extra.txHash && (
              <a
                href={extra.explorerUrl ?? '#'} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-1 text-xs hover:opacity-80 transition-opacity"
                style={{ color: '#555' }}
              >
                <ExternalLink size={11} />Ver en explorer
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// DashboardPage 

const DashboardPage: React.FC = () => {
  const navigate  = useNavigate()
  const location  = useLocation()
  const chainId   = useChainId()
  const { address } = useConnection()

  // Data 

  const {
    hasFund,
    fundAddress,
    fundFromChain,
    monthlyDeposit,
    desiredMonthly,
    retirementAge,
    paymentYears,
    apyPercent,
    protocolAddress,
    lastSyncedAt,
    chain,
    isLoading,
    isLoadingChain,
    refetchChain,
    refetchDb,
  } = useDashboard()

  const invalidateFund = useInvalidateFund()
  const { protocols }  = useProtocols()

  const userPrefAddress = (getContractAddress(chainId, 'userPreferences') ?? ZERO_ADDRESS) as `0x${string}`
  const hasFundRef = useRef(hasFund)
  useEffect(() => { hasFundRef.current = hasFund }, [hasFund])

  //  Read on-chain preferences 
  const { data: onChainPrefs } = useReadContract({
    address:      userPrefAddress,
    abi:          USER_PREFERENCES_ABI,
    functionName: 'getUserConfig',
    args:         address ? [address] : undefined,
    query:        { enabled: !!address && userPrefAddress !== ZERO_ADDRESS },
  })

  // getUserConfig returns { selectedProtocol, autoCompound, riskTolerance, lastUpdate, totalDeposited, totalWithdrawn }
  const onChainRisk     = onChainPrefs ? Number((onChainPrefs as { riskTolerance: number }).riskTolerance ?? 0) : 0
  const onChainProtocol = onChainPrefs ? (onChainPrefs as { selectedProtocol: `0x${string}` }).selectedProtocol : undefined

  // getRoutingStrategy is not in the ABI; derive strategy value from onChainPrefs if available
  const onChainStrategyValue = 0

  // Preferences state 
  const [pendingRisk,     setPendingRisk]     = useState<number | null>(null)
  const [pendingStrategy, setPendingStrategy] = useState<number | null>(null)
  const [pendingProtocol, setPendingProtocol] = useState<`0x${string}` | null>(null)

  const effectiveRisk     = pendingRisk     ?? onChainRisk
  const effectiveStrategy = pendingStrategy ?? onChainStrategyValue
  const effectiveProtocol = pendingProtocol ?? onChainProtocol ?? (protocolAddress as `0x${string}` | null)

  // Deposit modal
  const [depositModal, setDepositModal] = useState<{ open: boolean; mode: 'monthly' | 'extra' }>({
    open: false, mode: 'monthly',
  })

  const monthlyAmountWei = useMemo(
    () => monthlyDeposit != null ? toUsdcBigInt(monthlyDeposit) : 0n,
    [monthlyDeposit],
  )

  // Post-deploy polling 
  const [isPollingFund, setIsPollingFund] = useState(false)

  useEffect(() => {
    const state = location.state as { newFundAddr?: string } | null
    if (!state?.newFundAddr) return

    window.history.replaceState({}, '')
    setIsPollingFund(true)

    let attempts = 0
    const MAX_ATTEMPTS = 15
    const poll = setInterval(async () => {
      attempts++
      await refetchDb()
      await invalidateFund()
      if (hasFundRef.current || attempts >= MAX_ATTEMPTS) {
        clearInterval(poll)
        setIsPollingFund(false)
        if (hasFundRef.current) refetchChain()
      }
    }, 2_000)

    return () => { clearInterval(poll); setIsPollingFund(false) }
  }, [location.state]) // eslint-disable-line react-hooks/exhaustive-deps

  const nextDepositDate = useMemo<Date | null>(() => {
    if (!chain?.lastMonthlyDepositTime || chain.lastMonthlyDepositTime === 0n) return null
    const next = new Date(Number(chain.lastMonthlyDepositTime) * 1000)
    next.setMonth(next.getMonth() + 1)
    return next
  }, [chain?.lastMonthlyDepositTime])

  const progress = useMemo(() => {
    if (!chain?.totalBalance || !monthlyDeposit) return null
    const nowSec          = BigInt(Math.floor(Date.now() / 1000))
    const currentBalance  = Number(chain.totalBalance) / 1e6
    const monthly         = monthlyDeposit
    const remainingSec    = chain.timelockEnd > nowSec ? chain.timelockEnd - nowSec : 0n
    const remainingMonths = Number(remainingSec) / (30 * 24 * 3600)
    const targetYears     = paymentYears ?? 25
    const neededBalance   = desiredMonthly != null
      ? desiredMonthly * 12 * targetYears
      : monthly * 12 * targetYears
    const projectedBalance   = currentBalance + monthly * remainingMonths
    const progressPercentage = neededBalance > 0
      ? Math.min((currentBalance / neededBalance) * 100, 100)
      : 0
    return {
      currentBalance,
      projectedBalance:   Math.max(projectedBalance, currentBalance),
      neededBalance,
      progressPercentage,
      onTrack:            projectedBalance >= neededBalance,
      monthsRemaining:    Math.floor(remainingMonths),
    }
  }, [chain, monthlyDeposit, desiredMonthly, paymentYears])

  // Write contracts 
  const {
    writeContract: writeConfig,
    isPending:     isWritingConfig,
    data:          configTxHash,
    error:         configError,
    reset:         resetConfig,
  } = useWriteContract()

  const {
    writeContract: writeStrategy,
    isPending:     isWritingStrategy,
    data:          stratTxHash,
    error:         stratError,
    reset:         resetStrategy,
  } = useWriteContract()

  const {
    writeContract: writeRetirement,
    isPending:     isWritingRetirement,
    data:          retirementTxHash,
    error:         retirementError,
  } = useWriteContract()

  const { isPending: isConfirmingConfig,   isSuccess: isConfigConfirmed   } =
    useWaitForTransactionReceipt({ hash: configTxHash,     query: { enabled: Boolean(configTxHash)     } })
  const { isPending: isConfirmingStrategy, isSuccess: isStrategyConfirmed } =
    useWaitForTransactionReceipt({ hash: stratTxHash,      query: { enabled: Boolean(stratTxHash)      } })
  const { isPending: isConfirmingRetire,   isSuccess: isRetireConfirmed   } =
    useWaitForTransactionReceipt({ hash: retirementTxHash, query: { enabled: Boolean(retirementTxHash) } })
  const [prefSaveError, setPrefSaveError] = useState<string | null>(null)
  useEffect(() => {
    if (configError)  setPrefSaveError(configError.message.split('\n')[0] ?? null)
    if (stratError)   setPrefSaveError(stratError.message.split('\n')[0]  ?? null)
  }, [configError, stratError])

  // Clear error on new attempt
  const isSavingPrefs    = isWritingConfig    || isConfirmingConfig
  const isSavingStrategy = isWritingStrategy  || isConfirmingStrategy
  const isRetiringFund   = isWritingRetirement || isConfirmingRetire

  const nowSec = BigInt(Math.floor(Date.now() / 1000))
  const timelockExpired = chain?.timelockEnd && chain.timelockEnd > 0n && chain.timelockEnd <= nowSec

  // Handlers

  const handleSaveUserConfig = useCallback(() => {
    if (!address) return
    setPrefSaveError(null)
    resetConfig()
    writeConfig({
      address:      userPrefAddress,
      abi:          USER_PREFERENCES_ABI,
      functionName: 'setUserConfig',
      args:         [address, effectiveProtocol ?? ZERO_ADDRESS, false, effectiveRisk as 0 | 1 | 2],
    })
    setPendingRisk(null)
    setPendingProtocol(null)
  }, [address, effectiveRisk, effectiveProtocol, writeConfig, resetConfig, userPrefAddress])

  const handleSaveStrategy = useCallback(() => {
    if (!address) return
    setPrefSaveError(null)
    resetStrategy()
    writeStrategy({
      address:      userPrefAddress,
      abi:          USER_PREFERENCES_ABI,
      functionName: 'setRoutingStrategy',
      args:         [effectiveStrategy as 0 | 1 | 2, 50n, 10n],
    })
    setPendingStrategy(null)
  }, [address, effectiveStrategy, writeStrategy, resetStrategy, userPrefAddress])

  const handleStartRetirement = useCallback(() => {
    if (!fundAddress) return
    writeRetirement({
      address:      fundAddress,
      abi:          PERSONAL_FUND_ABI,
      functionName: 'startRetirement',
    })
  }, [fundAddress, writeRetirement])

  const refetchAll = useCallback(async () => {
    await Promise.all([refetchDb(), refetchChain()])
  }, [refetchDb, refetchChain])

  // Loading

  if (isLoading && !hasFund) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0c0b0a' }}>
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full mx-auto animate-spin"
            style={{ border: '1.5px solid rgba(137,113,72,0.15)', borderTopColor: '#897148' }} />
          <p className="text-sm tracking-widest uppercase" style={{ color: '#444', fontFamily: "'DM Mono', monospace" }}>
            Cargando dashboard
          </p>
        </div>
      </div>
    )
  }

  // Render

  return (
    <div className="min-h-screen" style={{ background: '#0c0b0a', fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=DM+Sans:wght@300;400;500&family=DM+Mono&display=swap');
      `}</style>

      {/* Grain overlay — consistent with SalePage */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")`,
        opacity: 0.4, zIndex: 0,
      }} />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-6">

        {/* Banners */}

        {isPollingFund && (
          <div className="flex items-center gap-3 rounded-xl px-5 py-3.5"
            style={{ background: 'rgba(137,113,72,0.08)', border: '0.5px solid rgba(137,113,72,0.25)' }}>
            <RefreshCw size={14} className="animate-spin shrink-0" style={{ color: '#897148' }} />
            <p className="text-xs tracking-wide" style={{ color: '#897148' }}>
              Verificando tu fondo en la blockchain — esto puede tomar unos segundos.
            </p>
          </div>
        )}

        {fundFromChain && !isPollingFund && (
          <div className="flex items-start gap-3 rounded-xl px-5 py-3.5"
            style={{ background: 'rgba(245,158,11,0.06)', border: '0.5px solid rgba(245,158,11,0.2)' }}>
            <AlertTriangle size={14} className="shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
            <div>
              <p className="text-xs font-semibold" style={{ color: '#f59e0b' }}>Sincronización pendiente</p>
              <p className="text-[11px] mt-0.5" style={{ color: '#6b5f3f' }}>
                Tu fondo existe on-chain pero aún no está en la base de datos. Los metadatos del calculador no estarán disponibles hasta sincronizar. Se resolverá automáticamente.
              </p>
            </div>
          </div>
        )}

        {/* Header */}

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: '#897148' }}>
                <Sparkles size={10} style={{ color: '#f7f8f6' }} />
              </div>
              <span className="text-[10px] tracking-[0.3em] uppercase" style={{ color: '#555' }}>Ethernal Fund</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-light" style={{ color: '#e8e4dc', fontFamily: "'Cormorant Garamond', serif" }}>
              Tu Dashboard
            </h1>
            <p className="text-xs mt-1 font-mono" style={{ color: '#444' }}>
              {address?.slice(0, 10)}...{address?.slice(-8)}
            </p>
          </div>

          <button
            onClick={() => void refetchAll()}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-opacity disabled:opacity-40"
            style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.1)', color: '#666' }}
          >
            <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
            {isLoading ? 'Actualizando' : 'Actualizar'}
          </button>
        </div>

        {/* Main layout */}
        <div className="grid lg:grid-cols-3 gap-6">

          {/* ── Left column: Fund ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* My Fund card */}
            <SectionCard>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                  <Shield size={18} style={{ color: '#897148' }} />
                  <span className="text-[10px] tracking-[0.25em] uppercase font-medium" style={{ color: '#555' }}>
                    Mi Fondo Personal
                  </span>
                </div>
                <span
                  className="text-[10px] tracking-widest uppercase px-3 py-1 rounded-full font-semibold"
                  style={hasFund
                    ? { background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '0.5px solid rgba(16,185,129,0.3)' }
                    : { background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '0.5px solid rgba(245,158,11,0.3)' }
                  }
                >
                  {hasFund ? 'Activo' : 'Sin fondo'}
                </span>
              </div>

              {hasFund ? (
                <div className="space-y-6">

                  {/* Balance hero */}
                  <div>
                    <p className="text-[10px] tracking-[0.25em] uppercase mb-2" style={{ color: '#555' }}>Balance Actual</p>
                    <div className="flex items-end gap-3">
                      {isLoadingChain
                        ? <div className="h-10 w-40 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
                        : <p className="text-4xl sm:text-5xl font-light" style={{ color: '#c9a96e', fontFamily: "'Cormorant Garamond', serif" }}>
                            {formatUSDC(chain?.totalBalance)}
                          </p>
                      }
                      <span
                        className="text-xs px-2 py-0.5 rounded-full mb-1 font-medium"
                        style={chain?.retirementStarted
                          ? { background: 'rgba(16,185,129,0.1)', color: '#10b981' }
                          : { background: 'rgba(99,102,241,0.1)',  color: '#818cf8' }
                        }
                      >
                        {chain?.retirementStarted ? 'Jubilado' : 'Ahorrando'}
                      </span>
                    </div>
                  </div>

                  {/* Progress toward goal */}
                  {progress && (
                    <div className="rounded-xl p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.06)' }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Target size={13} style={{ color: '#555' }} />
                          <span className="text-[10px] tracking-[0.2em] uppercase" style={{ color: '#555' }}>Progreso a la meta</span>
                        </div>
                        <span className="text-sm font-bold font-mono" style={{ color: progress.onTrack ? '#10b981' : '#f59e0b' }}>
                          {progress.progressPercentage.toFixed(1)}%
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${Math.min(progress.progressPercentage, 100)}%`,
                            background: progress.onTrack
                              ? 'linear-gradient(90deg, #10b981, #34d399)'
                              : 'linear-gradient(90deg, #f59e0b, #fcd34d)',
                          }}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center">
                        {[
                          { label: 'Actual',     value: formatUSDC(chain?.totalBalance) },
                          { label: 'Proyectado', value: formatUSDC(BigInt(Math.floor(progress.projectedBalance * 1e6))) },
                          { label: 'Meta',       value: formatUSDC(BigInt(Math.floor(progress.neededBalance * 1e6))) },
                        ].map(({ label, value }) => (
                          <div key={label}>
                            <p className="text-[9px] tracking-widest uppercase mb-0.5" style={{ color: '#444' }}>{label}</p>
                            <p className="text-xs font-mono font-semibold" style={{ color: '#888' }}>{value}</p>
                          </div>
                        ))}
                      </div>

                      {progress.monthsRemaining > 0 && (
                        <p className="text-[10px] text-center" style={{ color: '#444' }}>
                          {progress.monthsRemaining} meses restantes hasta el timelock
                        </p>
                      )}
                    </div>
                  )}

                  {/* Stats grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <StatCard label="Depósito Mensual"  value={formatUSDC(monthlyDeposit ?? 0)} />
                    <StatCard label="Total Depósitos"   value={chain?.monthlyDepositCount?.toString() ?? '—'} />
                    <StatCard label="Edad de Retiro"    value={retirementAge != null ? `${retirementAge} años` : '—'} />
                    <StatCard label="APY Configurado"   value={apyPercent    != null ? `${apyPercent.toFixed(2)}%` : '—'} />
                    <StatCard label="Ingreso Deseado"   value={desiredMonthly != null ? formatUSDC(desiredMonthly) : '—'} />
                    <StatCard
                      label="Protocolo"
                      value={protocolAddress ? shortAddr(protocolAddress) : '—'}
                    />
                  </div>

                  {/* Missed months warning */}
                  {chain?.missedMonths && chain.missedMonths > 0n && (
                    <div className="flex items-start gap-2 rounded-xl px-4 py-3" style={{ background: 'rgba(239,68,68,0.06)', border: '0.5px solid rgba(239,68,68,0.2)' }}>
                      <AlertTriangle size={13} className="shrink-0 mt-0.5 text-red-400" />
                      <p className="text-xs text-red-400">
                        Tenés <strong>{chain.missedMonths.toString()}</strong> {chain.missedMonths === 1n ? 'mes perdido' : 'meses perdidos'} sin depositar.
                        Los depósitos atrasados aplican penalidades.
                      </p>
                    </div>
                  )}

                  {/* Deposit actions */}
                  <div className="grid sm:grid-cols-2 gap-3">
                    {/* Monthly */}
                    <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: 'rgba(137,113,72,0.06)', border: '0.5px solid rgba(137,113,72,0.2)' }}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold" style={{ color: '#c9a96e' }}>Depósito Mensual</p>
                        {nextDepositDate && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(137,113,72,0.1)', color: '#897148' }}>
                            <CountdownTimer targetDate={nextDepositDate} />
                          </span>
                        )}
                      </div>
                      <p className="text-2xl font-light" style={{ color: '#c9a96e', fontFamily: "'Cormorant Garamond', serif" }}>
                        {formatUSDC(monthlyDeposit ?? 0)}
                      </p>
                      <button
                        onClick={() => setDepositModal({ open: true, mode: 'monthly' })}
                        className="w-full py-2.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80 flex items-center justify-center gap-1.5"
                        style={{ background: 'rgba(137,113,72,0.2)', color: '#c9a96e', border: '0.5px solid rgba(137,113,72,0.35)' }}
                      >
                        <DollarSign size={12} />Depositar
                      </button>
                    </div>

                    {/* Extra */}
                    <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                      <p className="text-xs font-semibold" style={{ color: '#888' }}>Depósito Extra</p>
                      <p className="text-sm leading-relaxed" style={{ color: '#444' }}>
                        Aportá cualquier monto adicional en cualquier momento. 24h para reclamar.
                      </p>
                      <button
                        onClick={() => setDepositModal({ open: true, mode: 'extra' })}
                        className="w-full py-2.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80 flex items-center justify-center gap-1.5 mt-auto"
                        style={{ background: 'rgba(255,255,255,0.05)', color: '#888', border: '0.5px solid rgba(255,255,255,0.1)' }}
                      >
                        <DollarSign size={12} />Depositar Extra
                      </button>
                    </div>
                  </div>

                  {/* Timelock */}
                  {chain?.timelockEnd && chain.timelockEnd > 0n && (
                    <div className="flex items-center justify-between rounded-xl px-5 py-4"
                      style={{ background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                      <div className="flex items-center gap-2.5">
                        <Clock size={14} style={{ color: '#555' }} />
                        <div>
                          <p className="text-[10px] tracking-widest uppercase" style={{ color: '#444' }}>Timelock</p>
                          <p className="text-sm font-mono mt-0.5" style={{ color: '#888' }}>
                            {format(new Date(Number(chain.timelockEnd) * 1000), 'dd MMM yyyy')}
                          </p>
                        </div>
                      </div>
                      {!timelockExpired && (
                        <span className="text-xs font-mono" style={{ color: '#555' }}>
                          {Math.floor(Number(chain.timelockEnd - BigInt(Math.floor(Date.now() / 1000))) / 86400)}d restantes
                        </span>
                      )}
                      {timelockExpired && (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                          Desbloqueado
                        </span>
                      )}
                    </div>
                  )}

                  {/* Contract address */}
                  <div className="flex items-center justify-between gap-3 rounded-xl px-5 py-4"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.06)' }}>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-[10px] tracking-widest uppercase" style={{ color: '#444' }}>Contrato</p>
                        {fundFromChain && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '0.5px solid rgba(245,158,11,0.2)' }}>
                            sin DB
                          </span>
                        )}
                      </div>
                      <p className="font-mono text-xs truncate" style={{ color: '#666' }}>{fundAddress}</p>
                      {lastSyncedAt && (
                        <p className="text-[10px] mt-0.5" style={{ color: '#333' }}>
                          Sync: {format(new Date(lastSyncedAt), 'dd MMM HH:mm')}
                        </p>
                      )}
                    </div>
                    <a
                      href={getExplorerAddressUrl(chainId, fundAddress!)}
                      target="_blank" rel="noopener noreferrer"
                      className="p-2 rounded-lg transition-opacity hover:opacity-70 shrink-0"
                      style={{ background: 'rgba(255,255,255,0.05)', color: '#555' }}
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>

                  {/* Start retirement CTA */}
                  {chain && !chain.retirementStarted && timelockExpired && (
                    <div>
                      <button
                        onClick={handleStartRetirement}
                        disabled={isRetiringFund}
                        className="w-full py-4 rounded-xl font-semibold text-sm transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(52,211,153,0.1))', color: '#10b981', border: '0.5px solid rgba(16,185,129,0.35)' }}
                      >
                        {isRetiringFund
                          ? <><RefreshCw size={14} className="animate-spin" />Iniciando retiro...</>
                          : <><CheckCircle size={14} />Iniciar Retiro</>
                        }
                      </button>
                      <TxStatusBadge
                        isPending={isWritingRetirement}
                        isConfirming={isConfirmingRetire}
                        isConfirmed={isRetireConfirmed}
                        error={retirementError}
                      />
                    </div>
                  )}

                </div>
              ) : (
                /* No fund */
                <div className="text-center py-12 space-y-4">
                  <Wallet size={40} className="mx-auto opacity-20" style={{ color: '#e8e4dc' }} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#888' }}>No tenés un fondo aún</p>
                    <p className="text-xs mt-1" style={{ color: '#444' }}>Creá tu fondo de retiro personal on-chain.</p>
                  </div>
                  <button
                    onClick={() => navigate('/calculator')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
                    style={{ background: 'rgba(137,113,72,0.2)', color: '#c9a96e', border: '0.5px solid rgba(137,113,72,0.35)' }}
                  >
                    <ArrowRight size={13} />Crear mi Fondo
                  </button>
                </div>
              )}
            </SectionCard>

            {/* Admin content */}
            <SectionCard>
              <div className="flex items-center gap-2.5 mb-5">
                <BookOpen size={15} style={{ color: '#555' }} />
                <span className="text-[10px] tracking-[0.25em] uppercase font-medium" style={{ color: '#555' }}>
                  Del Equipo Ethernal
                </span>
              </div>
              <div className="space-y-3">
                {ADMIN_CONTENT.map((item) => {
                  const Icon = item.icon
                  return (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 rounded-xl p-4 cursor-pointer transition-all hover:opacity-80"
                      style={{ background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.06)' }}
                    >
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${item.accent}18`, border: `0.5px solid ${item.accent}30` }}>
                        <Icon size={13} style={{ color: item.accent }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-xs font-medium leading-snug" style={{ color: '#c8c4bb' }}>{item.title}</p>
                          <ChevronRight size={12} className="shrink-0 mt-0.5" style={{ color: '#444' }} />
                        </div>
                        <p className="text-[11px] leading-relaxed mb-1.5" style={{ color: '#555' }}>{item.summary}</p>
                        <p className="text-[10px]" style={{ color: '#333' }}>{item.date}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </SectionCard>

          </div>

          {/* Right column: Preferences + Protocols */}
          <div className="space-y-6">

            {/* Preferences */}
            <SectionCard>
              <div className="flex items-center gap-2.5 mb-6">
                <Settings size={15} style={{ color: '#555' }} />
                <span className="text-[10px] tracking-[0.25em] uppercase font-medium" style={{ color: '#555' }}>
                  Preferencias
                </span>
              </div>

              {/* Risk tolerance */}
              <div className="mb-5">
                <p className="text-[10px] tracking-widest uppercase mb-3" style={{ color: '#444' }}>Tolerancia al Riesgo</p>
                <div className="space-y-1.5">
                  {RISK_LEVELS.map((r) => {
                    const Icon = r.icon
                    const isSelected = effectiveRisk === r.value
                    return (
                      <button
                        key={r.value}
                        onClick={() => setPendingRisk(r.value)}
                        className="w-full flex items-center gap-2.5 p-3 rounded-xl border transition-all text-left"
                        style={isSelected
                          ? { border: `0.5px solid ${r.accent}50`, background: `${r.accent}0d` }
                          : { border: '0.5px solid rgba(255,255,255,0.06)', background: 'transparent' }
                        }
                      >
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: isSelected ? `${r.accent}18` : 'rgba(255,255,255,0.04)' }}>
                          <Icon size={13} style={{ color: isSelected ? r.accent : '#444' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold" style={{ color: isSelected ? '#e8e4dc' : '#666' }}>{r.label}</p>
                          <p className="text-[10px] truncate" style={{ color: '#444' }}>{r.description}</p>
                        </div>
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: r.accent }} />}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Protocol preference */}
              <div className="mb-5">
                <p className="text-[10px] tracking-widest uppercase mb-3" style={{ color: '#444' }}>Protocolo Preferido</p>
                {protocols.length > 0 ? (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {protocols.map((p) => {
                      const isSelected = effectiveProtocol === p.address
                      return (
                        <button
                          key={p.address}
                          onClick={() => setPendingProtocol(p.address as `0x${string}`)}
                          className="w-full flex items-center justify-between gap-2 p-3 rounded-xl border transition-all text-left"
                          style={isSelected
                            ? { border: '0.5px solid rgba(137,113,72,0.4)', background: 'rgba(137,113,72,0.08)' }
                            : { border: '0.5px solid rgba(255,255,255,0.06)', background: 'transparent' }
                          }
                        >
                          <div className="min-w-0">
                            <p className="font-mono text-[11px] truncate" style={{ color: isSelected ? '#c9a96e' : '#666' }}>{shortAddr(p.address)}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px]" style={{ color: '#444' }}>{riskLabel(p.risk ?? 0)}</span>
                              <span className="text-[10px] font-semibold" style={{ color: '#10b981' }}>{(p.apyBps / 100).toFixed(2)}% APY</span>
                            </div>
                          </div>
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#897148' }} />}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-center py-4 rounded-xl" style={{ color: '#444', border: '0.5px dashed rgba(255,255,255,0.08)' }}>
                    No hay protocolos activos
                  </p>
                )}
              </div>

              {prefSaveError && (
                <p className="text-[11px] text-red-400 mb-3 flex items-start gap-1">
                  <AlertCircle size={12} className="shrink-0 mt-0.5" />{prefSaveError}
                </p>
              )}
              {isConfigConfirmed && (
                <p className="text-[11px] mb-3 flex items-center gap-1" style={{ color: '#10b981' }}>
                  <CheckCircle size={12} />Preferencias guardadas on-chain
                </p>
              )}

              <button
                onClick={handleSaveUserConfig}
                disabled={isSavingPrefs || (pendingRisk === null && pendingProtocol === null)}
                className="w-full py-2.5 rounded-xl text-xs font-semibold transition-opacity disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-4"
                style={{ background: 'rgba(137,113,72,0.2)', color: '#c9a96e', border: '0.5px solid rgba(137,113,72,0.35)' }}
              >
                {isSavingPrefs
                  ? <><RefreshCw size={12} className="animate-spin" />Guardando...</>
                  : <><CheckCircle size={12} />Guardar Configuración</>
                }
              </button>

              {/* Strategy */}
              <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)', paddingTop: '1.25rem' }}>
                <p className="text-[10px] tracking-widest uppercase mb-3" style={{ color: '#444' }}>Estrategia de Inversión</p>
                <div className="space-y-1.5 mb-3">
                  {STRATEGY_TYPES.map((s) => {
                    const Icon = s.icon
                    const isSelected = effectiveStrategy === s.value
                    return (
                      <button
                        key={s.value}
                        onClick={() => setPendingStrategy(s.value)}
                        className="w-full flex items-center gap-2.5 p-3 rounded-xl border transition-all text-left"
                        style={isSelected
                          ? { border: '0.5px solid rgba(139,92,246,0.4)', background: 'rgba(139,92,246,0.08)' }
                          : { border: '0.5px solid rgba(255,255,255,0.06)', background: 'transparent' }
                        }
                      >
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: isSelected ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.04)' }}>
                          <Icon size={13} style={{ color: isSelected ? '#a78bfa' : '#444' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold" style={{ color: isSelected ? '#e8e4dc' : '#666' }}>{s.label}</p>
                          <p className="text-[10px] truncate" style={{ color: '#444' }}>{s.description}</p>
                        </div>
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#a78bfa' }} />}
                      </button>
                    )
                  })}
                </div>
                {isStrategyConfirmed && (
                  <p className="text-[11px] mb-2 flex items-center gap-1" style={{ color: '#10b981' }}>
                    <CheckCircle size={12} />Estrategia guardada on-chain
                  </p>
                )}
                <button
                  onClick={handleSaveStrategy}
                  disabled={isSavingStrategy || pendingStrategy === null}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold transition-opacity disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: '0.5px solid rgba(139,92,246,0.3)' }}
                >
                  {isSavingStrategy
                    ? <><RefreshCw size={12} className="animate-spin" />Guardando...</>
                    : <><CheckCircle size={12} />Guardar Estrategia</>
                  }
                </button>
              </div>
            </SectionCard>

            {/* Active protocols */}
            <SectionCard>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <Activity size={14} style={{ color: '#555' }} />
                  <span className="text-[10px] tracking-[0.25em] uppercase font-medium" style={{ color: '#555' }}>
                    Protocol Registry
                  </span>
                </div>
                {protocols.length > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(139,92,246,0.1)', color: '#a78bfa', border: '0.5px solid rgba(139,92,246,0.2)' }}>
                    {protocols.length}
                  </span>
                )}
              </div>

              {protocols.length > 0 ? (
                <div className="space-y-2">
                  {protocols.slice(0, 4).map((p) => (
                    <div key={p.address} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5"
                      style={{ background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.05)' }}>
                      <div className="min-w-0">
                        <p className="font-mono text-[11px] truncate" style={{ color: '#777' }}>{shortAddr(p.address)}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px]" style={{ color: '#444' }}>{riskLabel(p.risk ?? 0)}</span>
                          {p.verified && <CheckCircle size={9} style={{ color: '#3b82f6' }} />}
                        </div>
                      </div>
                      <p className="text-sm font-bold font-mono shrink-0" style={{ color: '#10b981' }}>
                        {(p.apyBps / 100).toFixed(2)}%
                      </p>
                    </div>
                  ))}
                  {protocols.length > 4 && (
                    <button className="w-full text-center text-[11px] py-2 flex items-center justify-center gap-1 transition-opacity hover:opacity-70"
                      style={{ color: '#444' }}>
                      {protocols.length - 4} más <ChevronDown size={11} />
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-xs text-center py-4 rounded-xl" style={{ color: '#444', border: '0.5px dashed rgba(255,255,255,0.06)' }}>
                  Sin protocolos registrados
                </p>
              )}
            </SectionCard>

            {/* Contact */}
            <SectionCard>
              <div className="flex items-center gap-2.5 mb-4">
                <MessageCircle size={14} style={{ color: '#555' }} />
                <span className="text-[10px] tracking-[0.25em] uppercase font-medium" style={{ color: '#555' }}>
                  Soporte
                </span>
              </div>
              <p className="text-xs leading-relaxed mb-4" style={{ color: '#444' }}>
                Contactá al equipo de Ethernal para preguntas sobre tu plan de retiro o estrategias de inversión.
              </p>
              <div className="space-y-2">
                <a
                  href="mailto:contact@ethernal.fund"
                  className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl text-xs font-medium transition-opacity hover:opacity-80 group"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', color: '#888' }}
                >
                  Contactar Ethernal
                  <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                </a>
                <a
                  href="https://ethernal.fund/docs" target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl text-xs font-medium transition-opacity hover:opacity-80 group"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.06)', color: '#666' }}
                >
                  Ver Documentación
                  <ExternalLink size={11} />
                </a>
              </div>
            </SectionCard>

          </div>
        </div>
      </div>

      {/* Deposit Modal */}
      {depositModal.open && hasFund && fundAddress && (
        <DepositModal
          mode={depositModal.mode}
          fundAddress={fundAddress}
          monthlyAmount={monthlyAmountWei}
          onClose={() => setDepositModal((s) => ({ ...s, open: false }))}
        />
      )}

    </div>
  )
}

export default DashboardPage