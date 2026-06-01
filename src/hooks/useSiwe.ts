
import { useEffect }              from 'react'
import { useConnection }          from 'wagmi'
import { useSiweSession }         from '@/hooks/useSiweSession'
import type { SiweError }         from '@/services/siweService'

export type SIWEStatus =
  | 'idle'
  | 'pending'
  | 'verifying'
  | 'authenticated'
  | 'error'

export type SIWEError = SiweError['code'] | null

export interface UseSIWEReturn {
  status:          SIWEStatus
  isAuthenticated: boolean
  /** Código de error tipado; null cuando no hay error activo. */
  error:           SIWEError
  /** Para reintentos manuales desde la UI (botón "Intentar de nuevo"). */
  signIn:          () => Promise<void>
  signOut:         () => void
}

export function useSIWE(): UseSIWEReturn {
  const { address, isConnected } = useConnection()
  const session                  = useSiweSession()

  // Auto sign-in reactivo
  //
  // Se ejecuta cuando cambia cualquiera de las condiciones que determinan
  // si corresponde iniciar sesión. useSiweSession.login() es idempotente:
  // si ya hay autenticación activa retorna sin hacer nada.
  //
  // NO reintenta automáticamente si el usuario rechazó la firma ('rejected')
  // para no abrir la wallet sin acción explícita del usuario.
  useEffect(() => {
    const shouldAutoSign =
      isConnected                                               &&
      !!address                                                 &&
      !session.isAuthenticated                                  &&
      session.status !== 'pending'                              &&
      session.status !== 'verifying'                            &&
      !(session.status === 'error' && session.errorCode === 'rejected')

    if (shouldAutoSign) {
      session.login().catch(() => {
        // Errores ya manejados internamente en useSiweSession.
        // El catch aquí solo previene unhandled promise rejection.
      })
    }
  }, [isConnected, address, session.isAuthenticated, session.status, session.errorCode])

  return {
    status:          session.status,
    isAuthenticated: session.isAuthenticated,
    error:           session.errorCode,
    signIn:          session.login,
    signOut:         session.logout,
  }
}