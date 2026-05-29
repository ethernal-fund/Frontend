/**
 * useSIWE.ts
 *
 * Hook de autenticación Sign-In With Ethereum — EIP-4361.
 * Diseñado para montarse SOLO en SalePage, no globalmente.
 *
 * FLUJO:
 *  1. Nonce  → GET  /api/auth/nonce?address=0x...
 *  2. Sign   → signMessageAsync (wagmi) — abre modal de firma en la wallet
 *  3. Verify → POST /api/auth/verify-siwe → devuelve JWT
 *  4. Store  → setJwt() guarda el JWT en saleStore
 *
 * ESCENARIOS CONTEMPLADOS:
 *  a) Usuario entra a /sale sin wallet conectada:
 *       mount → !isConnected → no hace nada
 *       usuario conecta wallet → wagmi emite isConnected=true
 *       useEffect reacciona → signIn() automático
 *
 *  b) Usuario ya tiene wallet conectada y navega a /sale:
 *       mount → isConnected=true && !jwt → signIn() inmediato
 *
 * SCOPE:
 *  - Solo se monta en SalePage → nunca molesta en Landing/Contact/Calculator
 *  - Al desmontar SalePage NO limpia el JWT (el usuario puede volver
 *    sin re-firmar en la misma sesión de browser)
 *  - JWT se limpia solo al desconectar la wallet
 *
 * ERRORES:
 *  - Si el usuario rechaza la firma → error='rejected', no reintenta
 *  - Si el backend falla           → error='server', permite reintentar
 *  - Ambos casos exponen signIn() para reintentar manualmente
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useConnection, useSignMessage } from 'wagmi'
import { useSaleStore } from '@/stores/saleStore'

export type SIWEStatus =
  | 'idle'                               // no autenticado, sin actividad
  | 'pending'                            // esperando firma en la wallet
  | 'verifying'                          // firma enviada, esperando respuesta del backend
  | 'authenticated'
  | 'error'

export type SIWEError = 'rejected' | 'server' | null

export interface UseSIWEReturn {
  status:          SIWEStatus
  isAuthenticated: boolean
  error:           SIWEError
  signIn:          () => Promise<void>   // para reintentos manuales
  signOut:         () => void
}

const API        = import.meta.env.VITE_API_URL as string
const CHAIN_ID   = Number(import.meta.env.VITE_SALE_CHAIN_ID ?? 11155111)

function buildSIWEMessage(address: string, nonce: string): string {
  const domain  = window.location.host
  const origin  = window.location.origin
  const issuedAt = new Date().toISOString()

  return [
    `${domain} wants you to sign in with your Ethereum account:`,
    address,
    '',
    'Sign in to Ethernal Fund to participate in the ETRF token sale.',
    '',
    `URI: ${origin}`,
    'Version: 1',
    `Chain ID: ${CHAIN_ID}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
  ].join('\n')
}

export function useSIWE(): UseSIWEReturn {
  const { address, isConnected } = useConnection()
  const { signMessageAsync }     = useSignMessage()
  const { jwt, setJwt, resetUser } = useSaleStore()

  const [status, setStatus] = useState<SIWEStatus>(
    jwt ? 'authenticated' : 'idle'
  )
  const [error, setError] = useState<SIWEError>(null)

  // Ref para evitar que el auto sign-in dispare dos veces en StrictMode
  // o si el effect se re-ejecuta antes de que la promesa resuelva
  const isSigningIn = useRef(false)

  // signIn 
  const signIn = useCallback(async (): Promise<void> => {
    if (!address || isSigningIn.current) return
    isSigningIn.current = true
    setError(null)

    try {
      // 1. Pedir nonce al backend — previene replay attacks
      setStatus('pending')
      const nonceRes = await fetch(
        `${API}/api/auth/nonce?address=${address.toLowerCase()}`
      )
      if (!nonceRes.ok) throw new Error('server')
      const { nonce } = await nonceRes.json()

      // 2. Construir mensaje EIP-4361 y pedir firma a la wallet
      const message   = buildSIWEMessage(address, nonce)
      let signature: string
      try {
        signature = await signMessageAsync({ message })
      } catch {
        // Usuario rechazó la firma en la wallet
        setStatus('error')
        setError('rejected')
        return
      }

      // 3. Verificar firma en el backend → recibir JWT
      setStatus('verifying')
      const verifyRes = await fetch(`${API}/api/auth/verify-siwe`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message, signature }),
      })
      if (!verifyRes.ok) throw new Error('server')
      const { token } = await verifyRes.json()

      // 4. Guardar JWT en el store
      setJwt(token)
      setStatus('authenticated')

    } catch {
      setStatus('error')
      setError('server')
    } finally {
      isSigningIn.current = false
    }
  }, [address, signMessageAsync, setJwt])

  // signOut 
  const signOut = useCallback((): void => {
    resetUser()   // limpia jwt + todo el estado de sale en el store
    setStatus('idle')
    setError(null)
    isSigningIn.current = false
  }, [resetUser])

  // Auto sign-in 
  // Se ejecuta cuando:
  //   - SalePage monta con wallet ya conectada  (isConnected=true, !jwt)
  //   - Usuario conecta wallet desde WalletGate (isConnected cambia a true)
  //
  // NO se ejecuta si:
  //   - Ya hay un JWT válido en el store (sesión activa)
  //   - El usuario rechazó la firma antes (status='error', error='rejected')
  //     → requiere acción manual para no ser intrusivo
  useEffect(() => {
    const shouldAutoSign =
      isConnected &&
      !!address &&
      !jwt &&
      status !== 'pending' &&
      status !== 'verifying' &&
      // No reintentar automáticamente si el usuario rechazó la firma
      !(status === 'error' && error === 'rejected')

    if (shouldAutoSign) {
      signIn().catch(console.error)
    }
  }, [isConnected, address, jwt, status, error, signIn])

  // Limpiar JWT al desconectar wallet 
  useEffect(() => {
    if (!isConnected && jwt) {
      signOut()
    }
  }, [isConnected, jwt, signOut])

  // Sincronizar status con el store 
  // Si el JWT llega desde otra fuente (ej: otra tab via localStorage sync)
  useEffect(() => {
    if (jwt && status !== 'authenticated') {
      setStatus('authenticated')
    }
  }, [jwt, status])

  return {
    status,
    isAuthenticated: status === 'authenticated',
    error,
    signIn,
    signOut,
  }
}