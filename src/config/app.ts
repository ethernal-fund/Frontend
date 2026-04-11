import { DEFAULT_CHAIN, getFaucets, isChainActive } from './chains'

export const appConfig = {
  env: (import.meta.env.DEV ? 'development' : 'production') as 'development' | 'production',

  chain: {
    id:             DEFAULT_CHAIN.id,
    name:           DEFAULT_CHAIN.name,
    nativeCurrency: DEFAULT_CHAIN.nativeCurrency.symbol,
    explorer:       DEFAULT_CHAIN.blockExplorers?.default?.url ?? '',
    isTestnet:      import.meta.env.VITE_NETWORK === 'testnet' || import.meta.env.DEV,
  },

  urls: {
    website: 'https://ethernal.fund',
    docs:    'https://docs.ethernal.fund',
    twitter: 'https://twitter.com/ethernialfund',
    discord: 'https://discord.gg/ethernal-fund',
  },
} as const

export const isValidChain = (chainId?: number): boolean => {
  if (!chainId) return false
  return isChainActive(chainId)
}

export const getFaucetUrl = (chainId?: number): string | null => {
  const id     = chainId ?? appConfig.chain.id
  const faucets = getFaucets(id)
  return faucets[0] ?? null
}

export const isTestnet =
  import.meta.env.VITE_NETWORK === 'testnet' || import.meta.env.DEV