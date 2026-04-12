import { useDisconnect }  from '@reown/appkit/react'
import { useQueryClient } from '@tanstack/react-query'

const WC_STORAGE_KEYS = [
  'wagmi.store',
  'wagmi.connected',
  'wagmi.recentConnectorId',
  'wc@2:client:0.3//session',
  'wc@2:core:0.3//keychain',
  'wc@2:core:0.3//pairing',
]

export function useDisconnectWallet() {
  const { disconnect } = useDisconnect()
  const queryClient    = useQueryClient()

  const handleDisconnect = async () => {
    try {
      await disconnect()
    } catch (err) {
      console.warn('[web3] disconnect error — forcing cleanup:', err)
    } finally {
      queryClient.clear()
      WC_STORAGE_KEYS.forEach(key => localStorage.removeItem(key))
    }
  }

  return { disconnect: handleDisconnect }
}