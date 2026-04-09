import {
  arbitrum,
  arbitrumSepolia,
  polygon,
  polygonAmoy,
  base,
  baseSepolia,
  optimism,
  optimismSepolia,
  mainnet,
  sepolia,
} from 'wagmi/chains'
import type { Chain } from 'wagmi/chains'
import { http, fallback } from 'wagmi'
import type { Transport } from 'wagmi'

import {
  areMainContractsDeployed,
  isContractDeployed,
} from './addresses'

export interface ChainMetadata {
  /** Derived from addresses.ts — true when all core contracts are deployed. */
  readonly deployed:     boolean
  /** Derived from addresses.ts — true when personalFundFactory is deployed. */
  readonly hasContracts: boolean
  /** Lower = higher priority in chain selector UI. */
  readonly priority:     number
  readonly isTestnet:    boolean
  readonly faucets:      string[]
  readonly bridge?:      string
}

export const SUPPORTED_CHAINS = [
  // Testnets first (priority 1-9)
  arbitrumSepolia,
  polygonAmoy,
  baseSepolia,
  optimismSepolia,
  sepolia,
  // Mainnets (priority 10+)
  arbitrum,
  polygon,
  base,
  optimism,
  mainnet,
] as const satisfies Chain[]

export type SupportedChain   = typeof SUPPORTED_CHAINS[number]
export type SupportedChainId = SupportedChain['id']

export const CHAIN_IDS = {
  ARBITRUM_SEPOLIA:  421614,
  POLYGON_AMOY:       80002,
  BASE_SEPOLIA:       84532,
  OPTIMISM_SEPOLIA: 11155420,
  ETHEREUM_SEPOLIA: 11155111,
  ARBITRUM:          42161,
  POLYGON:             137,
  BASE:               8453,
  OPTIMISM:             10,
  ETHEREUM:              1,
} as const satisfies Record<string, SupportedChainId>

export const CHAIN_METADATA: Record<number, ChainMetadata> = {
  [CHAIN_IDS.ARBITRUM_SEPOLIA]: {
    deployed:     areMainContractsDeployed(CHAIN_IDS.ARBITRUM_SEPOLIA),
    hasContracts: isContractDeployed(CHAIN_IDS.ARBITRUM_SEPOLIA, 'personalFundFactory'),
    priority:     1,
    isTestnet:    true,
    faucets: [
      'https://faucet.quicknode.com/arbitrum/sepolia',
      'https://www.alchemy.com/faucets/arbitrum-sepolia',
      'https://faucets.chain.link/arbitrum-sepolia',
    ],
    bridge: 'https://bridge.arbitrum.io/?destinationChain=arbitrum-sepolia',
  },

  [CHAIN_IDS.POLYGON_AMOY]: {
    deployed:     areMainContractsDeployed(CHAIN_IDS.POLYGON_AMOY),
    hasContracts: isContractDeployed(CHAIN_IDS.POLYGON_AMOY, 'personalFundFactory'),
    priority:     2,
    isTestnet:    true,
    faucets: [
      'https://faucets.chain.link/polygon-amoy',
      'https://faucet.polygon.technology/',
      'https://www.alchemy.com/faucets/polygon-amoy',
    ],
    bridge: 'https://portal.polygon.technology/bridge',
  },

  [CHAIN_IDS.BASE_SEPOLIA]: {
    deployed:     areMainContractsDeployed(CHAIN_IDS.BASE_SEPOLIA),
    hasContracts: isContractDeployed(CHAIN_IDS.BASE_SEPOLIA, 'personalFundFactory'),
    priority:     3,
    isTestnet:    true,
    faucets: [
      'https://www.alchemy.com/faucets/base-sepolia',
      'https://docs.base.org/tools/network-faucets',
      'https://faucets.chain.link/base-sepolia',
    ],
    bridge: 'https://bridge.base.org/deposit',
  },

  [CHAIN_IDS.OPTIMISM_SEPOLIA]: {
    deployed:     areMainContractsDeployed(CHAIN_IDS.OPTIMISM_SEPOLIA),
    hasContracts: isContractDeployed(CHAIN_IDS.OPTIMISM_SEPOLIA, 'personalFundFactory'),
    priority:     4,
    isTestnet:    true,
    faucets: [
      'https://app.optimism.io/faucet',
      'https://www.alchemy.com/faucets/optimism-sepolia',
      'https://faucets.chain.link/optimism-sepolia',
    ],
    bridge: 'https://app.optimism.io/bridge/deposit',
  },

  [CHAIN_IDS.ETHEREUM_SEPOLIA]: {
    deployed:     areMainContractsDeployed(CHAIN_IDS.ETHEREUM_SEPOLIA),
    hasContracts: isContractDeployed(CHAIN_IDS.ETHEREUM_SEPOLIA, 'personalFundFactory'),
    priority:     5,
    isTestnet:    true,
    faucets: [
      'https://sepoliafaucet.com',
      'https://faucet.quicknode.com/ethereum/sepolia',
      'https://www.alchemy.com/faucets/ethereum-sepolia',
      'https://faucets.chain.link/sepolia',
    ],
  },

  [CHAIN_IDS.ARBITRUM]: {
    deployed:     areMainContractsDeployed(CHAIN_IDS.ARBITRUM),
    hasContracts: isContractDeployed(CHAIN_IDS.ARBITRUM, 'personalFundFactory'),
    priority:     10,
    isTestnet:    false,
    faucets:      [],
    bridge:       'https://bridge.arbitrum.io/',
  },

  [CHAIN_IDS.POLYGON]: {
    deployed:     areMainContractsDeployed(CHAIN_IDS.POLYGON),
    hasContracts: isContractDeployed(CHAIN_IDS.POLYGON, 'personalFundFactory'),
    priority:     11,
    isTestnet:    false,
    faucets:      [],
    bridge:       'https://portal.polygon.technology/bridge',
  },

  [CHAIN_IDS.BASE]: {
    deployed:     areMainContractsDeployed(CHAIN_IDS.BASE),
    hasContracts: isContractDeployed(CHAIN_IDS.BASE, 'personalFundFactory'),
    priority:     12,
    isTestnet:    false,
    faucets:      [],
    bridge:       'https://bridge.base.org/',
  },

  [CHAIN_IDS.OPTIMISM]: {
    deployed:     areMainContractsDeployed(CHAIN_IDS.OPTIMISM),
    hasContracts: isContractDeployed(CHAIN_IDS.OPTIMISM, 'personalFundFactory'),
    priority:     13,
    isTestnet:    false,
    faucets:      [],
    bridge:       'https://app.optimism.io/bridge/',
  },

  [CHAIN_IDS.ETHEREUM]: {
    deployed:     areMainContractsDeployed(CHAIN_IDS.ETHEREUM),
    hasContracts: isContractDeployed(CHAIN_IDS.ETHEREUM, 'personalFundFactory'),
    priority:     14,
    isTestnet:    false,
    faucets:      [],
  },
}

export const ACTIVE_CHAINS: readonly Chain[] = SUPPORTED_CHAINS.filter(
  chain => CHAIN_METADATA[chain.id]?.deployed,
)

export const ACTIVE_CHAIN_IDS = ACTIVE_CHAINS.map(c => c.id)

export const DEFAULT_CHAIN: Chain =
  ACTIVE_CHAINS.find(c => c.id === CHAIN_IDS.ARBITRUM_SEPOLIA) ??
  ACTIVE_CHAINS.find(c => c.id === CHAIN_IDS.ARBITRUM) ??
  ACTIVE_CHAINS[0] ??
  arbitrumSepolia   // absolute fallback during initial setup

// ─── RPC Transports ───────────────────────────────────────────────────────────
// Defined here (not in web3.tsx) so they travel with the chain definitions.
// web3.tsx reads TRANSPORT_MAP to build wagmi config — no RPC logic there.

const ALCHEMY_KEY = import.meta.env.VITE_ALCHEMY_API_KEY ?? ''
const INFURA_KEY  = import.meta.env.VITE_INFURA_API_KEY  ?? ''

function buildTransport(
  alchemyUrl: string,
  infuraUrl:  string,
  publicUrl:  string,
): Transport {
  const providers: ReturnType<typeof http>[] = []
  if (ALCHEMY_KEY) providers.push(http(`${alchemyUrl}${ALCHEMY_KEY}`, { batch: true }))
  if (INFURA_KEY)  providers.push(http(`${infuraUrl}${INFURA_KEY}`,   { batch: true }))
  providers.push(http(publicUrl))
  return fallback(providers, { retryCount: 3 })
}

export const TRANSPORT_MAP: Record<number, Transport> = {
  [CHAIN_IDS.ARBITRUM_SEPOLIA]:  buildTransport(
    'https://arb-sepolia.g.alchemy.com/v2/',
    'https://arbitrum-sepolia.infura.io/v3/',
    'https://sepolia-rollup.arbitrum.io/rpc',
  ),
  [CHAIN_IDS.POLYGON_AMOY]: buildTransport(
    'https://polygon-amoy.g.alchemy.com/v2/',
    'https://polygon-amoy.infura.io/v3/',
    'https://rpc-amoy.polygon.technology',
  ),
  [CHAIN_IDS.BASE_SEPOLIA]: buildTransport(
    'https://base-sepolia.g.alchemy.com/v2/',
    'https://base-sepolia.infura.io/v3/',
    'https://sepolia.base.org',
  ),
  [CHAIN_IDS.OPTIMISM_SEPOLIA]: buildTransport(
    'https://opt-sepolia.g.alchemy.com/v2/',
    'https://optimism-sepolia.infura.io/v3/',
    'https://sepolia.optimism.io',
  ),
  [CHAIN_IDS.ETHEREUM_SEPOLIA]: buildTransport(
    'https://eth-sepolia.g.alchemy.com/v2/',
    'https://sepolia.infura.io/v3/',
    'https://rpc.sepolia.org',
  ),
  [CHAIN_IDS.ARBITRUM]: buildTransport(
    'https://arb-mainnet.g.alchemy.com/v2/',
    'https://arbitrum-mainnet.infura.io/v3/',
    'https://arb1.arbitrum.io/rpc',
  ),
  [CHAIN_IDS.POLYGON]: buildTransport(
    'https://polygon-mainnet.g.alchemy.com/v2/',
    'https://polygon-mainnet.infura.io/v3/',
    'https://polygon-rpc.com',
  ),
  [CHAIN_IDS.BASE]: buildTransport(
    'https://base-mainnet.g.alchemy.com/v2/',
    'https://base-mainnet.infura.io/v3/',
    'https://mainnet.base.org',
  ),
  [CHAIN_IDS.OPTIMISM]: buildTransport(
    'https://opt-mainnet.g.alchemy.com/v2/',
    'https://optimism-mainnet.infura.io/v3/',
    'https://mainnet.optimism.io',
  ),
  [CHAIN_IDS.ETHEREUM]: buildTransport(
    'https://eth-mainnet.g.alchemy.com/v2/',
    'https://mainnet.infura.io/v3/',
    'https://eth.llamarpc.com',
  ),
}

export const getChainById = (chainId: number): Chain | undefined =>
  SUPPORTED_CHAINS.find(c => c.id === chainId)

export const getChainMetadata = (chainId: number): ChainMetadata | undefined =>
  CHAIN_METADATA[chainId]

export const isChainSupported = (chainId: number): boolean =>
  SUPPORTED_CHAINS.some(c => c.id === chainId)

/** True only when the chain is fully deployed. Use this for user-facing chain guards. */
export const isChainActive = (chainId: number): boolean =>
  ACTIVE_CHAINS.some(c => c.id === chainId)

export const isTestnetChain = (chainId: number): boolean =>
  CHAIN_METADATA[chainId]?.isTestnet ?? false

export const hasContracts = (chainId: number): boolean =>
  CHAIN_METADATA[chainId]?.hasContracts ?? false

export const getFaucets = (chainId: number): string[] =>
  CHAIN_METADATA[chainId]?.faucets ?? []

export const getBridge = (chainId: number): string | undefined =>
  CHAIN_METADATA[chainId]?.bridge

export const getChainName = (chainId: number): string =>
  getChainById(chainId)?.name ?? `Unknown (${chainId})`

export const getChainShortName = (chainId: number): string => {
  const SHORT: Record<number, string> = {
    421614:   'Arb Sepolia',
    80002:    'Amoy',
    84532:    'Base Sepolia',
    11155420: 'OP Sepolia',
    11155111: 'Sepolia',
    42161:    'Arbitrum',
    137:      'Polygon',
    8453:     'Base',
    10:       'Optimism',
    1:        'Ethereum',
  }
  return SHORT[chainId] ?? getChainName(chainId)
}

export const getExplorerUrl = (chainId: number, txHash?: string): string => {
  const base = getChainById(chainId)?.blockExplorers?.default?.url ?? ''
  return txHash ? `${base}/tx/${txHash}` : base
}

export const getExplorerAddressUrl = (chainId: number, address: string): string => {
  const base = getChainById(chainId)?.blockExplorers?.default?.url ?? ''
  return `${base}/address/${address}`
}

export const getChainErrorMessage = (currentChainId?: number): string => {
  const activeNames = ACTIVE_CHAINS.map(c => c.name).join(', ')
  if (!currentChainId) return `Connect to one of: ${activeNames}`
  const current = getChainName(currentChainId)
  return `Wrong network (${current}). Switch to: ${activeNames}`
}

if (import.meta.env.DEV) {
  const errors: string[] = []

  ACTIVE_CHAINS.forEach(chain => {
    // Every active chain must have a transport
    if (!TRANSPORT_MAP[chain.id]) {
      errors.push(`[chains] ❌ No transport for active chain: ${chain.name} (${chain.id})`)
    }
    // Every active chain must have full contract deployment
    if (!CHAIN_METADATA[chain.id]?.deployed) {
      errors.push(`[chains] ❌ Chain in ACTIVE_CHAINS but metadata.deployed=false: ${chain.name}`)
    }
  })

  SUPPORTED_CHAINS.forEach(chain => {
    // Every supported chain must have metadata
    if (!CHAIN_METADATA[chain.id]) {
      errors.push(`[chains] ❌ Missing metadata for supported chain: ${chain.name} (${chain.id})`)
    }
    // Every supported chain must have a transport (even if not active yet)
    if (!TRANSPORT_MAP[chain.id]) {
      errors.push(`[chains] ⚠️ No transport for supported chain: ${chain.name} (${chain.id})`)
    }
  })

  if (errors.length > 0) {
    errors.forEach(e => console.error(e))
  } else {
    console.log(
      `[chains] ✅ Config valid — ${ACTIVE_CHAINS.length} active chain(s): ` +
      ACTIVE_CHAINS.map(c => c.name).join(', ')
    )
  }
}