import { createAppKit }  from '@reown/appkit/react'
import env               from '@/lib/env'

import { wagmiAdapter }                                    from './adapter'
import { PROJECT_ID, APP_URL, WAGMI_CHAINS, DEFAULT_CHAIN } from './constants'

export const modal = createAppKit({
  adapters:            [wagmiAdapter],
  projectId:           PROJECT_ID,
  networks:            WAGMI_CHAINS,
  defaultNetwork:      DEFAULT_CHAIN,
  enableWalletConnect: true,
  enableInjected:      true,
  enableEIP6963:       true,
  metadata: {
    name:        'Ethernal Foundation',
    description: 'Personal retirement fund management protocol',
    url:         APP_URL,
    icons:       [`${APP_URL}/icon-512.png`],
  },
  features: {
    analytics:        env.features?.analytics ?? false,
    email:            false,
    socials:          [],
    emailShowWallets: true,
    allWallets:       true,
  },
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent':               '#1B5E20',
    '--w3m-border-radius-master': '8px',
    '--w3m-font-family':          'Inter, system-ui, -apple-system, sans-serif',
  },
})

if (import.meta.env.DEV) {
  console.group('[web3] Config')
  console.log('Chains  :', WAGMI_CHAINS.map(c => c.name).join(', '))
  console.log('Default :', DEFAULT_CHAIN.name)
  console.log('Alchemy :', env.alchemyApiKey ? '✅ set' : '⚠️  not set (public RPCs)')
  console.log('Infura  :', env.infuraApiKey  ? '✅ set' : '⚠️  not set')
  console.log('App URL :', APP_URL)
  console.groupEnd()
}