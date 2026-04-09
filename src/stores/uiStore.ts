import { create }  from 'zustand';
import { devtools } from 'zustand/middleware';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';
export interface Toast {
  id:        string;
  message:   string;
  variant:   ToastVariant;
  duration?: number;
}

interface UIState {
  toasts:      Toast[];
  modalOpen:   string | null;   // modal id or null

  addToast:    (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  openModal:   (id: string) => void;
  closeModal:  () => void;
}

let _toastId = 0;

export const useUIStore = create<UIState>()(
  devtools(
    (set) => ({
      toasts:    [],
      modalOpen: null,

      addToast: (toast) => {
        const id = `toast-${++_toastId}`;
        set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }), false, 'ui/addToast');
        setTimeout(
          () => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }), false, 'ui/autoRemoveToast'),
          toast.duration ?? 4000,
        );
      },

      removeToast: (id) =>
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }), false, 'ui/removeToast'),

      openModal:  (id) => set({ modalOpen: id },   false, 'ui/openModal'),
      closeModal: ()   => set({ modalOpen: null },  false, 'ui/closeModal'),
    }),
    { name: 'UIStore' },
  ),
);

export function useToast() {
  const addToast = useUIStore((s) => s.addToast);
  return {
    success: (message: string) => addToast({ message, variant: 'success' }),
    error:   (message: string) => addToast({ message, variant: 'error' }),
    warning: (message: string) => addToast({ message, variant: 'warning' }),
    info:    (message: string) => addToast({ message, variant: 'info' }),
  };
}
