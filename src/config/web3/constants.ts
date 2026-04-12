import type { Transport } from 'wagmi'
import type { Chain }     from 'wagmi/chains'
import env                from '@/lib/env'

import {
  ACTIVE_CHAINS,
  DEFAULT_CHAIN,
  TRANSPORT_MAP,
} from '@/config/chains'

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

export const APP_URL: string =
  import.meta.env.VITE_APP_URL ??
  (typeof window !== 'undefined' ? window.location.origin : 'https://ethernal.fund')

export const PROJECT_ID = env.walletConnectProjectId
export const WAGMI_CHAINS = ACTIVE_CHAINS as unknown as [Chain, ...Chain[]]
export const ACTIVE_TRANSPORTS = Object.fromEntries(
  ACTIVE_CHAINS
    .filter(c => TRANSPORT_MAP[c.id] !== undefined)
    .map(c    => [c.id, TRANSPORT_MAP[c.id]!]),
) as Record<number, Transport>

export { ACTIVE_CHAINS, DEFAULT_CHAIN }