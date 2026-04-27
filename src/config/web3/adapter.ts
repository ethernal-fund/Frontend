import { createStorage }                               from 'wagmi'
import { coinbaseWallet, safe }                        from 'wagmi/connectors'
import { WagmiAdapter }                                from '@reown/appkit-adapter-wagmi'
import { PROJECT_ID, WAGMI_CHAINS, ACTIVE_TRANSPORTS } from './constants'

function safeLocalStorage(): Storage | undefined {
  try {
    const key = '__wagmi_storage_test__'
    window.localStorage.setItem(key, '1')
    window.localStorage.removeItem(key)
    return window.localStorage
  } catch {
    console.warn('[web3] localStorage unavailable — falling back to memory storage')
    return undefined
  }
}

export const wagmiAdapter = new WagmiAdapter({
  projectId:  PROJECT_ID,
  networks:   WAGMI_CHAINS,
  transports: ACTIVE_TRANSPORTS,
  storage:    createStorage({ storage: safeLocalStorage() }),
  ssr:        false,
  multiInjectedProviderDiscovery: true,

  connectors: [
    coinbaseWallet({
      appName:    'Ethernal Foundation',
      appLogoUrl: 'https://ethernal.fund/icon-512.png',
    }),
    safe(),
  ],
})

export const wagmiConfig = wagmiAdapter.wagmiConfig