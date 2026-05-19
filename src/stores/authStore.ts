import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AuthState {
  accessToken:      string | null; 
  walletAddress:    string | null;  
  isAuthenticated:  boolean;
  isAuthenticating: boolean;

  setTokens:         (access: string, address: string) => void;
  clearTokens:       () => void;
  setAuthenticating: (loading: boolean) => void;
  logout:            () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken:      null,
      walletAddress:    null,
      isAuthenticated:  false,
      isAuthenticating: false,

      setTokens: (access, address) =>
        set({
          accessToken:      access,
          walletAddress:    address.toLowerCase(),
          isAuthenticated:  true,
          isAuthenticating: false,
        }),

      clearTokens: () =>
        set({
          accessToken:      null,
          walletAddress:    null,
          isAuthenticated:  false,
          isAuthenticating: false,
        }),

      setAuthenticating: (loading) =>
        set({ isAuthenticating: loading }),

      logout: () =>
        set({
          accessToken:      null,
          walletAddress:    null,
          isAuthenticated:  false,
          isAuthenticating: false,
        }),
    }),
    {
      name:    'ethernal-auth',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        accessToken:     state.accessToken,
        walletAddress:   state.walletAddress,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);