import { useDisconnect }  from '@reown/appkit/react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate }    from 'react-router-dom'
import { useAuthStore }   from '@/stores/authStore'
import { ROUTES }         from '@/router/routes'

const WC_STORAGE_KEYS = [
  'wagmi.store',
  'wagmi.connected',
  'wagmi.recentConnectorId',
  'wc@2:client:0.3//session',
  'wc@2:core:0.3//keychain',
  'wc@2:core:0.3//pairing',
  '@appkit/wallet',
  '@appkit/connected-wallet-image-url',
]

export function useDisconnectWallet() {
  const { disconnect } = useDisconnect()
  const queryClient    = useQueryClient()
  const navigate       = useNavigate()
  const logout         = useAuthStore((s) => s.logout)

  const handleDisconnect = async () => {
    try {
      await disconnect()
    } catch (err) {
      console.warn('[web3] disconnect error — forcing cleanup:', err)
    } finally {
      logout()
      queryClient.clear()
      WC_STORAGE_KEYS.forEach(key => localStorage.removeItem(key))
      navigate(ROUTES.HOME, { replace: true })
    }
  }

  return { disconnect: handleDisconnect }
}