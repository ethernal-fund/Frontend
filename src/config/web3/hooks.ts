import { useDisconnect }  from '@reown/appkit/react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate }    from 'react-router-dom'
import { useAuthStore }   from '@/stores/authStore'
import { ROUTES }         from '@/router/routes'

function clearWeb3Storage(): void {
  try {
    Object.keys(localStorage)
      .filter(k =>
        k.startsWith('wc@')      ||   // WalletConnect v2 sessions, keychain, pairing
        k.startsWith('wagmi.')   ||   // wagmi store, connected, recentConnectorId
        k.startsWith('@appkit/') ||   // AppKit wallet state
        k.startsWith('@web3modal/'),  // legacy Web3Modal (por si migración)
      )
      .forEach(k => localStorage.removeItem(k))
  } catch (err) {
    console.warn('[web3] Could not clear storage:', err)
  }
}

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
      clearWeb3Storage()
      navigate(ROUTES.HOME, { replace: true })
    }
  }

  return { disconnect: handleDisconnect }
}