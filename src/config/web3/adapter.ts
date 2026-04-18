import { createStorage }                               from 'wagmi'
import { injected, metaMask, coinbaseWallet, safe }    from 'wagmi/connectors'
import { WagmiAdapter }                                from '@reown/appkit-adapter-wagmi'
import { PROJECT_ID, WAGMI_CHAINS, ACTIVE_TRANSPORTS } from './constants'

export const wagmiAdapter = new WagmiAdapter({
  projectId:  PROJECT_ID,
  networks:   WAGMI_CHAINS,
  transports: ACTIVE_TRANSPORTS,
  storage:    createStorage({ storage: window.localStorage }),
  ssr:        false,

  multiInjectedProviderDiscovery: true,

  connectors: [
    injected(),
    metaMask({
      dapp: {
        name:    'Ethernal Foundation',
        url:     'https://ethernal.fund',
        iconUrl: 'https://ethernal.fund/icon-512.png',
      },
    }),

    coinbaseWallet({
      appName: 'Ethernal Foundation',
      appLogoUrl: 'https://ethernal.fund/icon-512.png',
    }),

    safe(),
  ],
})

export const wagmiConfig = wagmiAdapter.wagmiConfig