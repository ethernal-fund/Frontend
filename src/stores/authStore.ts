import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AuthState {
  accessToken:      string | null;  // persiste en sessionStorage (tab-level)
  isAuthenticated:  boolean;
  isAuthenticating: boolean;

  setTokens:         (access: string) => void;
  clearTokens:       () => void;
  setAuthenticating: (loading: boolean) => void;
  logout:            () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken:      null,
      isAuthenticated:  false,
      isAuthenticating: false,

      setTokens: (access) =>
        set({
          accessToken:      access,
          isAuthenticated:  true,
          isAuthenticating: false,
        }),

      clearTokens: () =>
        set({
          accessToken:      null,
          isAuthenticated:  false,
          isAuthenticating: false,
        }),

      setAuthenticating: (loading) =>
        set({ isAuthenticating: loading }),

      logout: () =>
        set({
          accessToken:      null,
          isAuthenticated:  false,
          isAuthenticating: false,
        }),
    }),
    {
      name:    'ethernal-auth',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        accessToken:     state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);