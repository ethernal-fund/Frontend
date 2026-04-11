import { create }  from 'zustand'
import { devtools } from 'zustand/middleware'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id:        string
  message:   string
  variant:   ToastVariant
  duration?: number
}

interface UIState {
  toasts:    Toast[]
  modalOpen: string | null

  addToast:    (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  openModal:   (id: string) => void
  closeModal:  () => void
}

export const useUIStore = create<UIState>()(
  devtools(
    (set) => ({
      toasts:    [],
      modalOpen: null,

      addToast: (toast) => {
        const id = crypto.randomUUID() // ← sin estado mutable global
        set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }), false, 'ui/addToast')
        setTimeout(
          () => set(
            (s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }),
            false,
            'ui/autoRemoveToast',
          ),
          toast.duration ?? 4000,
        )
      },

      removeToast: (id) =>
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }), false, 'ui/removeToast'),

      openModal:  (id) => set({ modalOpen: id },  false, 'ui/openModal'),
      closeModal: ()   => set({ modalOpen: null }, false, 'ui/closeModal'),
    }),
    { name: 'UIStore' },
  ),
)

export function useToast() {
  const addToast = useUIStore((s) => s.addToast)
  return {
    success: (message: string, duration?: number) => addToast({ message, variant: 'success', duration }),
    error:   (message: string, duration?: number) => addToast({ message, variant: 'error',   duration }),
    warning: (message: string, duration?: number) => addToast({ message, variant: 'warning', duration }),
    info:    (message: string, duration?: number) => addToast({ message, variant: 'info',    duration }),
  }
}
