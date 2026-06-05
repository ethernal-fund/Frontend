/**
 * BuyForm — formulario de compra de tokens ETRF.
 */

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v4'
import { formatUnits } from 'viem'
import { useTranslation } from 'react-i18next'
import type { RoundInfo } from '@/sale/types'
import { formatUSDC } from '@/sale/saleService'
import type { Hash } from 'viem'

const schema = z.object({
  usdcAmount: z
    .string()
    .min(1)
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0),
})

type FormValues = z.infer<typeof schema>

interface Props {
  round:          RoundInfo
  usdcBalance:    string
  usdcAllowance:  string
  calcTokensOut:  (amount: string) => string
  needsApproval:  (amount: string) => boolean
  onApprove:      (amount: string) => Promise<Hash>
  onBuy:          (amount: string) => Promise<Hash>
  /** Limpia activeTxHash y el estado de wagmi. Llamar al montar "comprar más". */
  onResetTx?:     () => void
  isPending:      boolean
  isConfirming:   boolean
  isConfirmed:    boolean
  /** Error emitido por wagmi (puede ser on-chain revert, rechazo de wallet, etc.) */
  error?:         Error | null   // ← AGREGAR esta línea
}

type Step = 'input' | 'approving' | 'buying' | 'done'

export function BuyForm({
  round,
  usdcBalance,
  calcTokensOut,
  needsApproval,
  onApprove,
  onBuy,
  onResetTx,
  isPending,
  isConfirming,
  error: wagmiError,  // ← renombrar para evitar conflicto
}: Props) {
  const { t } = useTranslation('sale')
  const [step, setStep]       = useState<Step>('input')
  const [txError, setTxError] = useState<string | null>(null)

  const {
    register,
    watch,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const amount    = watch('usdcAmount') ?? ''
  const tokensOut = calcTokensOut(amount)
  const maxWallet = Number(formatUnits(round.walletCap, 6))
  const setMax    = () =>
    setValue('usdcAmount', Math.min(Number(usdcBalance), maxWallet).toFixed(2))

  // Propagar errores de wagmi emitidos fuera del try/catch local
  useEffect(() => {
    if (wagmiError) {
      const msg =
        (wagmiError as any).shortMessage ?? wagmiError.message ?? t('buy.error.rejected')
      setTxError(msg)
      // Si estábamos en medio de un paso, volver a input
      setStep((prev) => (prev !== 'input' ? 'input' : prev))
    }
  }, [wagmiError, t])

  const onSubmit = async (data: FormValues) => {
    setTxError(null)
    try {
      if (needsApproval(data.usdcAmount)) {
        setStep('approving')
        await onApprove(data.usdcAmount)
      }
      setStep('buying')
      await onBuy(data.usdcAmount)
      setStep('done')
    } catch (e: unknown) {
      const err = e as { shortMessage?: string; message?: string }
      setTxError(err?.shortMessage ?? err?.message ?? t('buy.error.rejected'))
      setStep('input')
    }
  }

  // ─── Pantalla de éxito ────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <div className="flex flex-col items-center py-10 text-center">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mb-6"
          style={{
            background: 'rgba(137,113,72,0.15)',
            border: '0.5px solid rgba(196,169,106,0.4)',
          }}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path
              d="M4 11L9 16L18 6"
              stroke="#c4a96a"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h3
          className="text-xl font-light mb-2"
          style={{ color: '#f7f8f6', fontFamily: "'Cormorant Garamond', Georgia, serif" }}
        >
          {t('buy.success.title')}
        </h3>
        <p className="text-sm mb-1" style={{ color: '#666' }}>
          {t('buy.success.bought', {
            amount: Number(tokensOut).toLocaleString('en-US', { maximumFractionDigits: 2 }),
          })}
        </p>
        <p className="text-xs" style={{ color: '#444' }}>
          {t('buy.success.vestingNote')}
        </p>

        {isConfirming && (
          <div className="mt-4 flex items-center gap-2">
            <span
              className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"
              style={{ color: '#555' }}
            />
            <span className="text-xs" style={{ color: '#555' }}>
              {t('buy.success.confirming', { defaultValue: 'Confirmando en blockchain…' })}
            </span>
          </div>
        )}

        <button
          className="mt-8 text-xs tracking-widest uppercase underline underline-offset-4"
          style={{ color: '#666' }}
          onClick={() => {
            if (onResetTx) onResetTx()
            setStep('input')
            setTxError(null)
          }}
        >
          {t('buy.success.buyMore')}
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

      {/* Input USDC */}
      <div>
        <div className="flex justify-between items-baseline mb-2">
          <label className="text-[10px] tracking-widest uppercase" style={{ color: '#555' }}>
            {t('buy.title')}
          </label>
          <button
            type="button"
            onClick={setMax}
            className="text-[10px] tracking-widest uppercase underline underline-offset-2"
            style={{ color: '#666' }}
          >
            {t('buy.max', {
              amount: Number(usdcBalance).toLocaleString('en-US', { maximumFractionDigits: 2 }),
            })}
          </button>
        </div>

        <div
          className="relative flex items-center rounded"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '0.5px solid rgba(255,255,255,0.1)',
          }}
        >
          <span className="pl-4 text-sm" style={{ color: '#555', fontFamily: 'monospace' }}>$</span>
          <input
            {...register('usdcAmount')}
            type="number"
            step="any"
            placeholder="0.00"
            className="flex-1 bg-transparent px-3 py-4 text-lg font-light outline-none"
            style={{
              color: '#f7f8f6',
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              caretColor: '#c4a96a',
            }}
          />
          <span className="pr-4 text-xs tracking-widest" style={{ color: '#555' }}>USDC</span>
        </div>
        {errors.usdcAmount && (
          <p className="text-xs mt-1.5" style={{ color: '#e05252' }}>
            {t('buy.invalidAmount')}
          </p>
        )}
      </div>

      {/* Preview tokens */}
      <div
        className="rounded px-4 py-4 space-y-3"
        style={{
          background: 'rgba(137,113,72,0.06)',
          border: '0.5px solid rgba(137,113,72,0.15)',
        }}
      >
        <div className="flex justify-between items-center">
          <span className="text-xs tracking-widest uppercase" style={{ color: '#666' }}>
            {t('buy.youWillReceive')}
          </span>
          <span
            className="text-lg font-light"
            style={{ color: '#c4a96a', fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            {Number(tokensOut) > 0
              ? `${Number(tokensOut).toLocaleString('en-US', { maximumFractionDigits: 2 })} ETRF`
              : '— ETRF'}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs tracking-widest uppercase" style={{ color: '#555' }}>
            {t('buy.pricePerToken')}
          </span>
          <span className="text-xs" style={{ color: '#666', fontFamily: 'monospace' }}>
            {formatUSDC(round.price)}
          </span>
        </div>
        <div
          className="pt-3 mt-3"
          style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex justify-between items-center">
            <span className="text-xs tracking-widest uppercase" style={{ color: '#555' }}>
              {t('buy.cliff')}
            </span>
            <span className="text-xs" style={{ color: '#666' }}>
              {t('buy.cliffMonths', { months: round.cliffMonths })}
            </span>
          </div>
          <div className="flex justify-between items-center mt-1.5">
            <span className="text-xs tracking-widest uppercase" style={{ color: '#555' }}>
              {t('buy.vesting')}
            </span>
            <span className="text-xs" style={{ color: '#666' }}>
              {t('buy.vestingLinear', { months: round.vestingMonths })}
            </span>
          </div>
        </div>
      </div>

      {/* Error (local o de wagmi) */}
      {txError && (
        <div
          className="rounded px-4 py-3 text-xs"
          style={{
            background: 'rgba(224,82,82,0.08)',
            border: '0.5px solid rgba(224,82,82,0.25)',
            color: '#e05252',
          }}
        >
          {txError}
        </div>
      )}

      {/* Indicador de pasos */}
      {(step === 'approving' || step === 'buying') && (
        <div className="flex items-center gap-3">
          <StepDot
            active={step === 'approving'}
            done={step === 'buying'}
            label={t('buy.step1')}
          />
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
          <StepDot
            active={step === 'buying'}
            done={false}
            label={t('buy.step2')}
          />
        </div>
      )}

      {/* Botón principal */}
      <BuyButton
        step={step}
        needsApproval={needsApproval(amount)}
        isPending={isPending}
        disabled={!amount || Number(amount) <= 0}
        t={t}
      />

      {/* Cap por wallet */}
      <p className="text-center text-[11px]" style={{ color: '#444' }}>
        {t('buy.walletCapNote', { cap: formatUSDC(round.walletCap) })}
      </p>
    </form>
  )
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function StepDot({
  active,
  done,
  label,
}: { active: boolean; done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="w-4 h-4 rounded-full flex items-center justify-center"
        style={{
          background: done
            ? '#897148'
            : active
            ? 'rgba(137,113,72,0.2)'
            : 'rgba(255,255,255,0.05)',
          border: `0.5px solid ${done || active ? '#897148' : 'rgba(255,255,255,0.1)'}`,
        }}
      >
        {done && (
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <path
              d="M1.5 4L3.5 6L6.5 2"
              stroke="#f7f8f6"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
        )}
        {active && !done && (
          <div
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: '#c4a96a' }}
          />
        )}
      </div>
      <span
        className="text-[10px] tracking-widest uppercase"
        style={{ color: active || done ? '#c4a96a' : '#444' }}
      >
        {label}
      </span>
    </div>
  )
}

function BuyButton({
  step,
  needsApproval,
  isPending,
  disabled,
  t,
}: {
  step: Step
  needsApproval: boolean
  isPending: boolean
  disabled: boolean
  t: (key: string) => string
}) {
  const label = isPending
    ? t('buy.confirmWallet')
    : step === 'approving'
    ? t('buy.approving')
    : step === 'buying'
    ? t('buy.buying')
    : needsApproval
    ? t('buy.needsApproval')
    : t('buy.buy')

  return (
    <button
      type="submit"
      disabled={disabled || isPending}
      className="w-full py-4 text-sm tracking-[0.15em] uppercase font-medium transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        background: disabled || isPending ? 'rgba(137,113,72,0.3)' : '#897148',
        color: '#f7f8f6',
        borderRadius: '2px',
      }}
    >
      {isPending ? (
        <span className="flex items-center justify-center gap-2">
          <span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
          {label}
        </span>
      ) : (
        label
      )}
    </button>
  )
}