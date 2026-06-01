import { useCallback, useEffect, useRef, useState } from 'react'
import { useWalletClient }                          from 'wagmi'
import { useAuthStore }                             from '@/stores/authStore'
import { SiweService, isSiweError }                 from '@/services/siweService'
import type { SiweErrorCode }                       from '@/services/siweService'
import { fundsService }                             from '@/services/fundsService'

// Tipos

export type SiweStatus =
  | 'idle'
  | 'pending'        // esperando firma en la wallet
  | 'verifying'      // esperando respuesta del backend
  | 'authenticated'
  | 'error'

export interface SiweSessionResult {
  status:          SiweStatus
  isAuthenticated: boolean
  /** Código de error tipado; null cuando no hay error activo. */
  errorCode:       SiweErrorCode | null
  login:           () => Promise<void>
  logout:          () => void
}

// Hook

export function useSiweSession(): SiweSessionResult {
  const { data: walletClient }                   = useWalletClient()
  const { setTokens, setAuthenticating, logout } = useAuthStore()
  const isAuthenticated                          = useAuthStore((s) => s.isAuthenticated)

  const [status,    setStatus]    = useState<SiweStatus>(
    isAuthenticated ? 'authenticated' : 'idle'
  )
  const [errorCode, setErrorCode] = useState<SiweErrorCode | null>(null)

  // Previene ejecuciones concurrentes (StrictMode, efectos rápidos, reconexiones)
  const inFlight = useRef(false)

  const login = useCallback(async (): Promise<void> => {
    if (!walletClient)    throw new Error('Wallet not connected')
    if (inFlight.current) return
    if (isAuthenticated)  return

    inFlight.current = true
    setErrorCode(null)
    setAuthenticating(true)

    try {
      const address = walletClient.account.address

      setStatus('pending')
      const { nonce, message } = await SiweService.getNonce(address)

      let signature: string
      try {
        signature = await walletClient.signMessage({ message })
      } catch {
        throw createRejectedError()
      }

      setStatus('verifying')
      const token = await SiweService.verify(address, message, signature, nonce)

      setTokens(token, address)
      setStatus('authenticated')

      // Side effects post-login — fire and forget
      fundsService.retryPendingRegister().catch((err) =>
        console.warn('[useSiweSession] retryPendingRegister:', err),
      )
    } catch (err) {
      const code = isSiweError(err) ? err.code : 'server'
      setStatus('error')
      setErrorCode(code)

      // Rechazos intencionales no son errores reales — no loguear
      if (code !== 'rejected') {
        console.warn('[useSiweSession] login failed:', err)
      }

      throw err
    } finally {
      inFlight.current = false
      setAuthenticating(false)
    }
  }, [walletClient, isAuthenticated, setTokens, setAuthenticating])

  const logoutFn = useCallback((): void => {
    logout()
    setStatus('idle')
    setErrorCode(null)
    inFlight.current = false
  }, [logout])

  useEffect(() => {
    if (isAuthenticated && status !== 'authenticated') setStatus('authenticated')
    if (!isAuthenticated && status === 'authenticated') setStatus('idle')
  }, [isAuthenticated, status])

  return {
    status,
    isAuthenticated: status === 'authenticated',
    errorCode,
    login,
    logout: logoutFn,
  }
}

function createRejectedError() {
  return { isSiweError: true as const, code: 'rejected' as SiweErrorCode, message: 'User rejected signature' }
}