/**
 * useSiweSession.ts - Hook para manejar sesión SIWE con soporte de audience
 * 
 * Características:
 * - Soporta múltiples audiences ('retirement' | 'sale')
 * - Auto-login al conectar wallet
 * - Auto-refresh de token antes de expirar
 * - Manejo de errores tipado
 * - Prevención de ejecuciones concurrentes
 * - Retry de registro de fondo pendiente post-login
 * 
 * Uso:
 *   const { login, logout, isAuthenticated, status, errorCode } = useSiweSession('retirement')
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useWalletClient } from 'wagmi'
import { useAuthStore, authSelectors, type AuthAudience } from '@/stores/authStore'
import {
  SiweService,
  createSiweError,
  isSiweError,
  type SiweErrorCode,
  type VerifyResponse,
} from '@/services/siweService'
import { fundsService } from '@/services/fundsService'

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

export type SiweStatus =
  | 'idle'           // sin iniciar
  | 'pending'        // esperando firma en la wallet
  | 'verifying'      // esperando respuesta del backend
  | 'authenticated'  // autenticado correctamente
  | 'error'          // error en el proceso

export interface SiweSessionResult {
  /** Estado actual del proceso de autenticación */
  status: SiweStatus
  /** True si el usuario está autenticado para este audience */
  isAuthenticated: boolean
  /** Código de error tipado; null cuando no hay error activo */
  errorCode: SiweErrorCode | null
  /** Inicia el flujo de autenticación manualmente */
  login: () => Promise<void>
  /** Cierra la sesión actual para este audience */
  logout: () => void
  /** Refresca el access token usando el refresh token almacenado */
  refresh: () => Promise<void>
  /** Resetea el estado de error (útil para reintentar) */
  resetError: () => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers internos
// ─────────────────────────────────────────────────────────────────────────────

function createRejectedError(): ReturnType<typeof createSiweError> {
  return createSiweError('rejected', 'El usuario rechazó la firma en la wallet.')
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook principal
// ─────────────────────────────────────────────────────────────────────────────

export function useSiweSession(
  audience: AuthAudience = 'retirement',
): SiweSessionResult {
  const { data: walletClient } = useWalletClient()

  // Usar selectores del store
  const sessions = useAuthStore((state) => state.sessions)
  const setTokens = useAuthStore((state) => state.setTokens)
  const clearTokens = useAuthStore((state) => state.clearTokens)
  const setAuthenticating = useAuthStore((state) => state.setAuthenticating)
  const isTokenExpired = useAuthStore((state) => state.isTokenExpired)

  // Determinar si está autenticado para este audience específico
  const session = sessions[audience]
  const isAuthenticated = !!session?.accessToken && !isTokenExpired(audience)

  // Estado local del hook
  const [status, setStatus] = useState<SiweStatus>(
    isAuthenticated ? 'authenticated' : 'idle',
  )
  const [errorCode, setErrorCode] = useState<SiweErrorCode | null>(null)

  // Previene ejecuciones concurrentes (StrictMode, efectos rápidos, reconexiones)
  const inFlight = useRef(false)

  // Obtener refresh token para este audience
  const getRefreshTokenForAudience = useCallback((): string | null => {
    if (audience === 'retirement') {
      return authSelectors.retirementRefreshToken
    }
    return authSelectors.saleRefreshToken
  }, [audience])

  // ─── Reset error ──────────────────────────────────────────────────────────
  const resetError = useCallback(() => {
    setErrorCode(null)
    if (status === 'error') {
      setStatus('idle')
    }
  }, [status])

  // ─── Login ──────────────────────────────────────────────────────────────────
  const login = useCallback(async (): Promise<void> => {
    // Validaciones previas
    if (!walletClient) {
      throw createSiweError('network', 'Wallet no conectada. Conectá tu wallet primero.')
    }
    if (inFlight.current) {
      throw createSiweError('server', 'Ya hay una autenticación en curso.')
    }
    if (isAuthenticated) {
      return // ya autenticado
    }

    inFlight.current = true
    setErrorCode(null)
    setStatus('pending')
    setAuthenticating(true)

    try {
      const address = walletClient.account.address

      // 1. Obtener nonce con audience específico
      const { message } = await SiweService.getNonce(address, audience)

      // 2. Firmar mensaje en la wallet
      let signature: string
      try {
        signature = await walletClient.signMessage({ message })
      } catch (signErr) {
        // Errores específicos de rechazo del usuario
        if ((signErr as { code?: number })?.code === 4001) {
          throw createRejectedError()
        }
        throw createSiweError(
          'rejected',
          'No se pudo firmar el mensaje. Verificá tu wallet e intentá de nuevo.',
        )
      }

      setStatus('verifying')

      // 3. Verificar firma con el backend (SOLO message + signature)
      const response: VerifyResponse = await SiweService.verify(message, signature)

      // 4. Guardar tokens en el store
      setTokens(
        response.access_token,
        response.refresh_token,
        response.wallet_address,
        audience,
        response.expires_in,
        response.refresh_expires_in,
      )

      setStatus('authenticated')
      setErrorCode(null)

      // 5. Side effects post-login - reintentar registro pendiente
      // Solo para retirement (el fondo se registra en ese contexto)
      if (audience === 'retirement') {
        try {
          await fundsService.retryPendingRegister()
        } catch (err) {
          console.warn('[useSiweSession] retryPendingRegister error:', err)
        }
      }
    } catch (err) {
      const code = isSiweError(err) ? err.code : 'server'
      setStatus('error')
      setErrorCode(code)

      // Solo loguear errores que no sean rechazo intencional del usuario
      if (code !== 'rejected') {
        console.warn('[useSiweSession] login failed:', err)
      }

      throw err
    } finally {
      inFlight.current = false
      setAuthenticating(false)
    }
  }, [walletClient, isAuthenticated, audience, setTokens, setAuthenticating])

  // ─── Logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback((): void => {
    const currentRefreshToken = getRefreshTokenForAudience()

    // Limpiar estado local inmediatamente
    clearTokens(audience)
    setStatus('idle')
    setErrorCode(null)
    inFlight.current = false

    // Notificar al backend (fire-and-forget, no bloquea)
    if (currentRefreshToken) {
      SiweService.logout(currentRefreshToken).catch(() => {
        // Error silencioso - el logout local ya ocurrió
      })
    }
  }, [clearTokens, audience, getRefreshTokenForAudience])

  // ─── Refresh token ─────────────────────────────────────────────────────────
  const refresh = useCallback(async (): Promise<void> => {
    const currentRefreshToken = getRefreshTokenForAudience()

    if (!currentRefreshToken) {
      throw createSiweError('expired', 'No hay refresh token disponible.')
    }

    // Verificar que no expiró el refresh token (7 días por defecto)
    const session = sessions[audience]
    if (session) {
      const refreshExpired = Date.now() >= (session.createdAt + session.refreshExpiresIn * 1000)
      if (refreshExpired) {
        throw createSiweError('expired', 'Refresh token expirado. Iniciá sesión nuevamente.')
      }
    }

    try {
      const response = await SiweService.refreshToken(currentRefreshToken)

      // Actualizar tokens en el store
      setTokens(
        response.access_token,
        response.refresh_token,
        response.wallet_address,
        audience,
        response.expires_in,
        response.refresh_expires_in,
      )

      setStatus('authenticated')
      setErrorCode(null)
    } catch (err) {
      const code = isSiweError(err) ? err.code : 'server'
      setStatus('error')
      setErrorCode(code)
      
      // Si el refresh falló por expiración, hacer logout
      if (code === 'expired') {
        clearTokens(audience)
      }
      
      throw err
    }
  }, [audience, sessions, getRefreshTokenForAudience, setTokens, clearTokens])

  // ─── Auto-login reactivo ───────────────────────────────────────────────────
  // Se ejecuta cuando:
  //   - La wallet se conecta y no hay autenticación activa
  //   - El usuario cambia de cuenta
  useEffect(() => {
    // No auto-login si ya hay una sesión activa
    if (isAuthenticated) return

    // No auto-login si ya hay un proceso en curso
    if (inFlight.current) return

    // Solo auto-login si hay wallet conectada
    if (!walletClient) return

    // No reintentar automáticamente si el error fue rechazo del usuario
    if (status === 'error' && errorCode === 'rejected') return

    // Ejecutar login automático
    login().catch(() => {
      // Errores ya manejados internamente en login()
    })
  }, [walletClient, isAuthenticated, status, errorCode, login])

  // ─── Auto-refresh cuando el token está por expirar ─────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return

    const session = sessions[audience]
    if (!session) return

    const expiresAt = session.expiresAt
    const timeUntilExpiry = expiresAt - Date.now()
    
    // Refresh 2 minutos antes de la expiración (o inmediatamente si falta menos)
    const refreshDelay = Math.max(timeUntilExpiry - 120_000, 0)

    // Si ya expiró o está por expirar (menos de 30 segundos), refrescar inmediatamente
    if (refreshDelay <= 30_000) {
      const timer = setTimeout(() => {
        refresh().catch((err) => {
          console.warn('[useSiweSession] immediate refresh failed:', err)
        })
      }, 1000) // Esperar 1 segundo para no bloquear
      return () => clearTimeout(timer)
    }

    // Programar refresh para 2 minutos antes de la expiración
    const timer = setTimeout(() => {
      refresh().catch((err) => {
        console.warn('[useSiweSession] auto-refresh failed:', err)
      })
    }, refreshDelay)

    return () => clearTimeout(timer)
  }, [isAuthenticated, sessions, audience, refresh])

  // ─── Sincronizar estado del store con el estado local ──────────────────────
  useEffect(() => {
    if (isAuthenticated && status !== 'authenticated') {
      setStatus('authenticated')
      setErrorCode(null)
    }
    if (!isAuthenticated && status === 'authenticated') {
      setStatus('idle')
    }
  }, [isAuthenticated, status])

  // ─── Limpiar estado al desmontar ───────────────────────────────────────────
  useEffect(() => {
    return () => {
      inFlight.current = false
    }
  }, [])

  return {
    status,
    isAuthenticated: status === 'authenticated',
    errorCode,
    login,
    logout,
    refresh,
    resetError,
  }
}