import { zeroAddress, type Address } from 'viem'

export interface SaleContracts {
  saleETRF: Address    // SaleETRF.vy - Main sale contract
  etrfToken: Address   // ETRF.vy - Token contract
  vestingETRF: Address // VestingETRF.vy - Vesting contract
  usdc: Address        // USDC token (official on each chain)
}

export interface SaleConfig {
  chainId: number
  chainName: string
  isTestnet: boolean
  isProduction: boolean
  contracts: SaleContracts
}

export const SALE_SUPPORTED_CHAINS = {
  SEPOLIA: {
    id: 11155111,
    name: 'Sepolia',
    isTestnet: true,
    isProduction: false,
  },
  MAINNET: {
    id: 1,
    name: 'Ethereum Mainnet',
    isTestnet: false,
    isProduction: true,
  },
} as const

export type SaleChainId = typeof SALE_SUPPORTED_CHAINS[keyof typeof SALE_SUPPORTED_CHAINS]['id']

const SALE_CONTRACTS: Record<SaleChainId, SaleContracts> = {
  // Sepolia (Testnet) — uses the shared contract variables from .env
  [SALE_SUPPORTED_CHAINS.SEPOLIA.id]: {
    saleETRF:    import.meta.env.VITE_SALE_CONTRACT_ADDRESS as Address ?? zeroAddress,
    etrfToken:   import.meta.env.VITE_ETRF_CONTRACT_ADDRESS as Address ?? zeroAddress,
    vestingETRF: import.meta.env.VITE_VESTING_CONTRACT_ADDRESS as Address ?? zeroAddress,
    usdc:        '0xa27dc7dd223a00E89B885CE6968E6379F7146CD3', // Official Sepolia USDC
  },

  // Ethereum Mainnet (Production) — same variables, different deploy addresses
  [SALE_SUPPORTED_CHAINS.MAINNET.id]: {
    saleETRF:    import.meta.env.VITE_SALE_CONTRACT_ADDRESS as Address ?? zeroAddress,
    etrfToken:   import.meta.env.VITE_ETRF_CONTRACT_ADDRESS as Address ?? zeroAddress,
    vestingETRF: import.meta.env.VITE_VESTING_CONTRACT_ADDRESS as Address ?? zeroAddress,
    usdc:        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // Official Mainnet USDC
  },
}

export function getSaleConfig(chainId: number): SaleConfig {
  const config = Object.values(SALE_SUPPORTED_CHAINS).find(c => c.id === chainId)
  
  if (!config) {
    throw new Error(
      `[Sale] Chain ${chainId} is not supported. Sale only available on: ` +
      `${Object.values(SALE_SUPPORTED_CHAINS).map(c => `${c.name} (${c.id})`).join(', ')}`
    )
  }

  const contracts = SALE_CONTRACTS[chainId as SaleChainId]
  
  if (!contracts) {
    throw new Error(`[Sale] No contract addresses configured for chain ${chainId}`)
  }

  return {
    chainId: config.id,
    chainName: config.name,
    isTestnet: config.isTestnet,
    isProduction: config.isProduction,
    contracts,
  }
}

export function isSaleSupported(chainId: number): boolean {
  return Object.values(SALE_SUPPORTED_CHAINS).some(c => c.id === chainId)
}

export function getDefaultSaleChainId(): SaleChainId {
  // Use MAINNET in production, SEPOLIA in development
  if (import.meta.env.PROD && import.meta.env.MODE === 'production') {
    return SALE_SUPPORTED_CHAINS.MAINNET.id
  }
  return SALE_SUPPORTED_CHAINS.SEPOLIA.id
}

export function getContractAddress(chainId: number, contractName: keyof SaleContracts): Address {
  const config = getSaleConfig(chainId)
  const address = config.contracts[contractName]
  
  if (!address || address === zeroAddress) {
    throw new Error(
      `[Sale] Contract "${contractName}" not deployed on ${config.chainName} (${chainId})`
    )
  }
  
  return address
}

if (import.meta.env.DEV) {
  console.log('[Sale] Module initialized')
  console.log('[Sale] Supported chains:', 
    Object.values(SALE_SUPPORTED_CHAINS).map(c => `${c.name} (${c.id})`).join(', ')
  )
  console.log('[Sale] Default chain:', 
    getDefaultSaleChainId() === SALE_SUPPORTED_CHAINS.MAINNET.id ? 'Mainnet' : 'Sepolia'
  )
}

// Validate required addresses at startup — catches missing .env vars early
if (import.meta.env.PROD) {
  const required: Array<{ key: string; value: string | undefined }> = [
    { key: 'VITE_SALE_CONTRACT_ADDRESS',    value: import.meta.env.VITE_SALE_CONTRACT_ADDRESS },
    { key: 'VITE_ETRF_CONTRACT_ADDRESS',    value: import.meta.env.VITE_ETRF_CONTRACT_ADDRESS },
    { key: 'VITE_VESTING_CONTRACT_ADDRESS', value: import.meta.env.VITE_VESTING_CONTRACT_ADDRESS },
  ]
  for (const { key, value } of required) {
    if (!value || value === zeroAddress) {
      console.error(`[Sale] CRITICAL: ${key} is not set — transactions will fail!`)
    }
  }
}