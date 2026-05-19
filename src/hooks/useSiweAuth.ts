// useSiweAuth.ts
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

  // Evita que dos llamadas concurrentes (ej: StrictMode, doble render)
  // abran dos prompts de firma simultáneos
  const signingRef = useRef(false)
  const login = useCallback(async (): Promise<void> => {
    if (!walletClient)    throw new Error('Wallet no conectada')
    if (signingRef.current) return          // ya hay una firma en vuelo
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
    try { await login(); return true } catch { return false }
  }, [walletClient, login])

  return { login, silentLogin, logout }
}