import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type AuthAudience = 'retirement' | 'sale'
export interface AuthSession {
  accessToken: string
  refreshToken: string
  walletAddress: string
  audience: AuthAudience
  expiresIn: number
  refreshExpiresIn: number
  expiresAt: number
  createdAt: number
}

interface AuthState {
  accessToken: string | null
  walletAddress: string | null
  isAuthenticated: boolean
  isAuthenticating: boolean
  refreshToken: string | null
  expiresIn: number | null

  sessions: {
    retirement: AuthSession | null
    sale: AuthSession | null
  }

  setTokens: (
    accessToken: string,
    refreshToken: string,
    walletAddress: string,
    audience: AuthAudience,
    expiresIn: number,
    refreshExpiresIn: number,
  ) => void

  setAuthenticating: (loading: boolean) => void
  clearTokens: (audience?: AuthAudience) => void
  logout: () => void
  logoutAudience: (audience: AuthAudience) => void

  getToken: (audience?: AuthAudience) => string | null
  getRefreshToken: (audience?: AuthAudience) => string | null
  getWalletAddress: (audience?: AuthAudience) => string | null
  getExpiresIn: (audience?: AuthAudience) => number | null
  getExpiresAt: (audience?: AuthAudience) => number | null
  isTokenExpired: (audience?: AuthAudience) => boolean
  getActiveAudiences: () => AuthAudience[]
}

const getExpiresAt = (expiresIn: number): number => Date.now() + expiresIn * 1000

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      walletAddress: null,
      isAuthenticated: false,
      isAuthenticating: false,
      refreshToken: null,
      expiresIn: null,

      sessions: {
        retirement: null,
        sale: null,
      },

      setTokens: (accessToken, refreshToken, walletAddress, audience, expiresIn, refreshExpiresIn) => {
        const walletLower        = walletAddress.toLowerCase()
        const expiresAt          = getExpiresAt(expiresIn)
        const shouldUpdateLegacy = audience === 'retirement' || get().sessions.retirement === null

        set((state) => ({
          sessions: {
            ...state.sessions,
            [audience]: {
              accessToken,
              refreshToken,
              walletAddress: walletLower,
              audience,
              expiresIn,
              refreshExpiresIn,
              expiresAt,
              createdAt: Date.now(),
            },
          },
          // Actualizar legacy props
          ...(shouldUpdateLegacy && {
            accessToken,
            refreshToken,
            walletAddress: walletLower,
            isAuthenticated: true,
            expiresIn,
          }),
          isAuthenticating: false,
        }))
      },

      setAuthenticating: (loading) => set({ isAuthenticating: loading }),
      clearTokens: (audience) =>
        set((state) => {
          if (audience) {
            const newSessions = {
              ...state.sessions,
              [audience]: null,
            }

            // Si el audience eliminado era retirement, limpiar también legacy props
            const shouldClearLegacy = audience === 'retirement'
            const legacyUpdate = shouldClearLegacy
              ? {
                  accessToken: null,
                  walletAddress: null,
                  isAuthenticated: false,
                  refreshToken: null,
                  expiresIn: null,
                }
              : {}

            return {
              sessions: newSessions,
              ...legacyUpdate,
              isAuthenticating: false,
            }
          }

          // Limpiar todo
          return {
            sessions: { retirement: null, sale: null },
            accessToken: null,
            walletAddress: null,
            isAuthenticated: false,
            refreshToken: null,
            expiresIn: null,
            isAuthenticating: false,
          }
        }),

      logout: () =>
        set({
          sessions: { retirement: null, sale: null },
          accessToken: null,
          walletAddress: null,
          isAuthenticated: false,
          refreshToken: null,
          expiresIn: null,
          isAuthenticating: false,
        }),

      logoutAudience: (audience) =>
        set((state) => {
          const newSessions = {
            ...state.sessions,
            [audience]: null,
          }

          const shouldClearLegacy = audience === 'retirement'
          const legacyUpdate = shouldClearLegacy
            ? {
                accessToken: null,
                walletAddress: null,
                isAuthenticated: false,
                refreshToken: null,
                expiresIn: null,
              }
            : {}

          return {
            sessions: newSessions,
            ...legacyUpdate,
            isAuthenticating: false,
          }
        }),
      getToken: (audience) => {
        if (audience) {
          return get().sessions[audience]?.accessToken ?? null
        }
        return get().accessToken
      },
      getRefreshToken: (audience) => {
        if (audience) {
          return get().sessions[audience]?.refreshToken ?? null
        }
        return get().refreshToken
      },
      getWalletAddress: (audience) => {
        if (audience) {
          return get().sessions[audience]?.walletAddress ?? null
        }
        return get().walletAddress
      },
      getExpiresIn: (audience) => {
        if (audience) {
          const session = get().sessions[audience]
          if (!session) return null
          return Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000))
        }
        return get().expiresIn
      },
      getExpiresAt: (audience) => {
        if (audience) {
          return get().sessions[audience]?.expiresAt ?? null
        }
        return get().expiresIn ? getExpiresAt(get().expiresIn!) : null
      },
      isTokenExpired: (audience) => {
        if (audience) {
          const expiresAt = get().getExpiresAt(audience)
          if (!expiresAt) return true
          return Date.now() >= expiresAt
        }
        const { accessToken, expiresIn } = get()
        if (!accessToken || !expiresIn) return true
        return Date.now() >= getExpiresAt(expiresIn)
      },
      getActiveAudiences: () => {
        const { sessions } = get()
        const active: AuthAudience[] = []
        if (sessions.retirement?.accessToken && !get().isTokenExpired('retirement')) {
          active.push('retirement')
        }
        if (sessions.sale?.accessToken && !get().isTokenExpired('sale')) {
          active.push('sale')
        }
        return active
      },
    }),
    {
      name: 'ethernal-auth',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        // Persistir legacy props
        accessToken: state.accessToken,
        walletAddress: state.walletAddress,
        isAuthenticated: state.isAuthenticated,
        refreshToken: state.refreshToken,
        expiresIn: state.expiresIn,
        // Persistir sesiones completas
        sessions: {
          retirement: state.sessions.retirement
            ? {
                accessToken: state.sessions.retirement.accessToken,
                refreshToken: state.sessions.retirement.refreshToken,
                walletAddress: state.sessions.retirement.walletAddress,
                audience: state.sessions.retirement.audience,
                expiresAt: state.sessions.retirement.expiresAt,
                createdAt: state.sessions.retirement.createdAt,
              }
            : null,
          sale: state.sessions.sale
            ? {
                accessToken: state.sessions.sale.accessToken,
                refreshToken: state.sessions.sale.refreshToken,
                walletAddress: state.sessions.sale.walletAddress,
                audience: state.sessions.sale.audience,
                expiresAt: state.sessions.sale.expiresAt,
                createdAt: state.sessions.sale.createdAt,
              }
            : null,
        },
      }),
    },
  ),
)

export const authSelectors = {
  get token() {
    return useAuthStore.getState().accessToken
  },
  /** Refresh token actual */
  get refreshToken() {
    return useAuthStore.getState().refreshToken
  },
  /** Wallet address actual */
  get walletAddress() {
    return useAuthStore.getState().walletAddress
  },
  /** Estado de autenticación */
  get isAuthenticated() {
    return useAuthStore.getState().isAuthenticated
  },
  /** Tiempo restante del token en segundos */
  get expiresIn() {
    return useAuthStore.getState().expiresIn
  },

  get retirementToken() {
    return useAuthStore.getState().sessions.retirement?.accessToken ?? null
  },
  /** Refresh token de retirement */
  get retirementRefreshToken() {
    return useAuthStore.getState().sessions.retirement?.refreshToken ?? null
  },
  /** Wallet address de retirement */
  get retirementWalletAddress() {
    return useAuthStore.getState().sessions.retirement?.walletAddress ?? null
  },
  /** True si retirement está autenticado y el token no expiró */
  get isRetirementAuthenticated() {
    const token = useAuthStore.getState().sessions.retirement?.accessToken
    const expired = useAuthStore.getState().isTokenExpired('retirement')
    return !!token && !expired
  },

  get saleToken() {
    return useAuthStore.getState().sessions.sale?.accessToken ?? null
  },
  /** Refresh token de sale */
  get saleRefreshToken() {
    return useAuthStore.getState().sessions.sale?.refreshToken ?? null
  },
  /** Wallet address de sale */
  get saleWalletAddress() {
    return useAuthStore.getState().sessions.sale?.walletAddress ?? null
  },
  /** True si sale está autenticado y el token no expiró */
  get isSaleAuthenticated() {
    const token = useAuthStore.getState().sessions.sale?.accessToken
    const expired = useAuthStore.getState().isTokenExpired('sale')
    return !!token && !expired
  },

  get activeAudiences() {
    return useAuthStore.getState().getActiveAudiences()
  },
}