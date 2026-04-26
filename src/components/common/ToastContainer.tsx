import { useEffect, useRef, useState } from 'react'
import { createPortal }                from 'react-dom'
import { useUIStore }                  from '@/stores/uiStore'
import type { Toast, ToastVariant }    from '@/stores/uiStore'
import { cn }                          from '@/lib/cn'

function IconSuccess() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="9" fill="currentColor" fillOpacity=".15" />
      <path
        d="M5.5 9l2.5 2.5 4.5-4.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconError() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="9" fill="currentColor" fillOpacity=".15" />
      <path
        d="M6 6l6 6M12 6l-6 6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconWarning() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="9" fill="currentColor" fillOpacity=".15" />
      <path
        d="M9 5.5v4M9 11.5v1"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconInfo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="9" fill="currentColor" fillOpacity=".15" />
      <path
        d="M9 8v5M9 5.5v1"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconClose() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M2 2l10 10M12 2L2 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

const VARIANT_CONFIG: Record<
  ToastVariant,
  { icon: React.ReactNode; color: string; bar: string }
> = {
  success: {
    icon:  <IconSuccess />,
    color: 'text-emerald-600',
    bar:   'bg-emerald-500',
  },
  error: {
    icon:  <IconError />,
    color: 'text-red-500',
    bar:   'bg-red-500',
  },
  warning: {
    icon:  <IconWarning />,
    color: 'text-amber-500',
    bar:   'bg-amber-400',
  },
  info: {
    icon:  <IconInfo />,
    color: 'text-sky-500',
    bar:   'bg-sky-500',
  },
}

interface ToastItemProps {
  toast:       Toast
  onDismiss:   (id: string) => void
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const { icon, color, bar } = VARIANT_CONFIG[toast.variant]
  const duration             = toast.duration ?? 4_000

  const [paused, setPaused] = useState(false)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function startTimer() {
    timerRef.current = setTimeout(() => onDismiss(toast.id), duration)
  }

  function clearTimer() {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  useEffect(() => {
    startTimer()
    return clearTimer
  }, []) 

  function handleMouseEnter() {
    clearTimer()
    setPaused(true)
  }

  function handleMouseLeave() {
    setPaused(false)
    startTimer()
  }

  return (
    <div
      role="alert"
      aria-live={toast.variant === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        // Base
        'relative flex items-start gap-3 w-full max-w-sm',
        'rounded-xl border border-white/10 bg-white shadow-lg shadow-black/8',
        'px-4 pt-3.5 pb-4 overflow-hidden',
        // Transition
        'transition-all duration-300 ease-out',
        visible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-2',
      )}
    >
      {/* Colored progress bar at the bottom */}
      <span
        className={cn('absolute bottom-0 left-0 h-0.75 rounded-b-xl origin-left', bar)}
        style={{
          animation:       `shrink ${duration}ms linear forwards`,
          animationPlayState: paused ? 'paused' : 'running',
        }}
      />

      {/* Icon */}
      <span className={cn('mt-0.5 shrink-0', color)}>{icon}</span>

      {/* Message */}
      <p className="flex-1 text-sm font-medium text-gray-800 leading-snug pr-1">
        {toast.message}
      </p>

      {/* Dismiss button */}
      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className={cn(
          'mt-0.5 shrink-0 rounded-md p-0.5',
          'text-gray-400 hover:text-gray-600',
          'transition-colors duration-150',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400',
        )}
      >
        <IconClose />
      </button>
      <style>{`
        @keyframes shrink {
          from { transform: scaleX(1); }
          to   { transform: scaleX(0); }
        }
      `}</style>
    </div>
  )
}

export default function ToastContainer() {
  const toasts      = useUIStore((s) => s.toasts)
  const removeToast = useUIStore((s) => s.removeToast)
  return createPortal(
    <div
      aria-label="Notifications"
      className={cn(
        'fixed bottom-5 right-5 z-9999',
        'flex flex-col-reverse gap-2',
        'w-[calc(100vw-2.5rem)] sm:w-auto',
        'pointer-events-none',
      )}
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onDismiss={removeToast} />
        </div>
      ))}
    </div>,
    document.body,
  )
}