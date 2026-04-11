import React                                           from 'react'
import { WagmiProvider, cookieStorage, createStorage } from 'wagmi'
import type { Transport }                              from 'wagmi'
import { WagmiAdapter }                                from '@reown/appkit-adapter-wagmi'
import { createAppKit }                                from '@reown/appkit/react'
import { QueryClientProvider }                         from '@tanstack/react-query'
import type { Chain }                                  from 'wagmi/chains'
import { queryClient }                                 from '@/lib/queryClient'
import env                                             from '@/lib/env'

import {
  ACTIVE_CHAINS,
  DEFAULT_CHAIN,
  TRANSPORT_MAP,
  isChainActive,
  getChainById,
} from './chains'

if (!env.walletConnectProjectId) {
  throw new Error(
    '[web3] VITE_WALLETCONNECT_PROJECT_ID is required — https://cloud.reown.com',
  )
}

if (!env.alchemyApiKey && import.meta.env.PROD) {
  throw new Error('[web3] VITE_ALCHEMY_API_KEY is required in production.')
}

if (!env.alchemyApiKey && import.meta.env.DEV) {
  console.warn('[web3] VITE_ALCHEMY_API_KEY not set — using public RPCs (rate-limited).')
}

if (ACTIVE_CHAINS.length === 0) {
  throw new Error(
    '[web3] No active chains configured — check addresses.ts deployments.',
  )
}

const projectId    = env.walletConnectProjectId
const wagmiChains  = ACTIVE_CHAINS as unknown as [Chain, ...Chain[]]
const activeTransports = Object.fromEntries(
  ACTIVE_CHAINS
    .filter(c => TRANSPORT_MAP[c.id] !== undefined)
    .map(c => [c.id, TRANSPORT_MAP[c.id]!]),
) as Record<number, Transport>

export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks:   wagmiChains,
  transports: activeTransports,
  storage:    createStorage({ storage: cookieStorage }),
  ssr:        false,
})

export const wagmiConfig = wagmiAdapter.wagmiConfig

const APP_URL = import.meta.env.VITE_APP_URL ?? 'https://ethernal.fund'

export const modal = createAppKit({
  adapters:       [wagmiAdapter],
  projectId,
  networks:       wagmiChains,
  defaultNetwork: DEFAULT_CHAIN,
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

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export { isChainActive, getChainById, ACTIVE_CHAINS, DEFAULT_CHAIN }

if (import.meta.env.DEV) {
  console.group('[web3] Config')
  console.log('Chains  :', ACTIVE_CHAINS.map(c => c.name).join(', '))
  console.log('Default :', DEFAULT_CHAIN.name)
  console.log('Alchemy :', env.alchemyApiKey ? '✅ set' : '⚠️  not set (public RPCs)')
  console.log('Infura  :', env.infuraApiKey  ? '✅ set' : '⚠️  not set')
  console.groupEnd()
}