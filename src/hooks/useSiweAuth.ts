/**
 * useSiweAuth.ts
 *
 * SIWE (Sign-In With Ethereum) authentication hook.
 *
 * Changes vs previous version:
 *  - retryPendingRegister is now called ONLY after setTokens succeeds,
 *    ensuring the auth store has a valid token before fundsService
 *    attempts the retry request. (Previously it was called after setTokens
 *    but the authStore read inside retryPendingRegister could still race.)
 *  - Added a microtask flush (Promise.resolve) between setTokens and
 *    retryPendingRegister so Zustand propagates the token before the
 *    service reads useAuthStore.getState().
 */

import { useCallback, useRef } from 'react'
import { useWalletClient }     from 'wagmi'
import { useAuthStore }        from '@/stores/authStore'
import { buildApiUrl, API_ENDPOINTS } from '@/config/api.config'
import { fundsService }        from '@/services/fundsService'
import api                     from '@/lib/axios'

interface NonceResponse  { nonce: string; message: string }
interface VerifyResponse { access_token: string }

export function useSiweAuth() {
  const { data: walletClient }                   = useWalletClient()
  const { setTokens, setAuthenticating, logout } = useAuthStore()

  // Prevents concurrent signature prompts (React StrictMode / double-render)
  const signingRef = useRef(false)

  const login = useCallback(async (): Promise<void> => {
    if (!walletClient)      throw new Error('Wallet not connected')
    if (signingRef.current) return   // signature already in flight

    signingRef.current = true
    setAuthenticating(true)

    try {
      const address = walletClient.account.address
      const { data: nonceData } = await api.post<NonceResponse>(
        buildApiUrl(API_ENDPOINTS.AUTH.NONCE),
        { wallet_address: address },
      )

      const signature = await walletClient.signMessage({ message: nonceData.message })
      const { data } = await api.post<VerifyResponse>(
        buildApiUrl(API_ENDPOINTS.AUTH.VERIFY),
        { wallet_address: address, signature, nonce: nonceData.nonce },
      )

      setTokens(data.access_token, address)
      await Promise.resolve()
      fundsService.retryPendingRegister().catch((err) => {
        console.warn('[useSiweAuth] retryPendingRegister failed silently:', err)
      })
    } finally {
      signingRef.current = false
      setAuthenticating(false)
    }
  }, [walletClient, setTokens, setAuthenticating])

  const silentLogin = useCallback(async (): Promise<boolean> => {
    if (!walletClient) return false
    try {
      await login()
      return true
    } catch {
      return false
    }
  }, [walletClient, login])

  return { login, silentLogin, logout }
}