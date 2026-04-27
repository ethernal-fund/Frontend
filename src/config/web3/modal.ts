import { createAppKit }  from '@reown/appkit/react'
import env               from '@/lib/env'

import { wagmiAdapter }                                      from './adapter'
import { PROJECT_ID, APP_URL, WAGMI_CHAINS, DEFAULT_CHAIN }  from './constants'

export const modal = createAppKit({
  adapters:       [wagmiAdapter],
  projectId:      PROJECT_ID,
  networks:       WAGMI_CHAINS,
  defaultNetwork: DEFAULT_CHAIN,
  enableWalletConnect: true,
  enableInjected:      false,
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

const IGNORED_ERROR_CODES = new Set([
  4001,  // User rejected the request
  4100,  // Unauthorized (wallet locked / no accounts)
  4902,  // Chain not added yet
])

modal.subscribeEvents(({ data }) => {
  switch (data.event) {
    case 'CONNECT_ERROR': {
      const code: number | undefined = (data as any).properties?.cause?.code
      if (code !== undefined && IGNORED_ERROR_CODES.has(code)) break
      console.error('[web3] CONNECT_ERROR', (data as any).properties)
      break
    }
    case 'DISCONNECT_ERROR': {
      console.warn('[web3] DISCONNECT_ERROR', (data as any).properties)
      break
    }
    case 'CONNECT_SUCCESS': {
      if (import.meta.env.DEV) {
        console.log('[web3] CONNECT_SUCCESS', (data as any).properties)
      }
      break
    }
  }
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