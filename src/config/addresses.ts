export interface ContractAddresses {
  personalFundFactory: `0x${string}`
  usdc:                `0x${string}`
  treasury:            `0x${string}`
  protocolRegistry?:   `0x${string}`
  userPreferences?:    `0x${string}`
  dateTime?:           `0x${string}`
  mockDeFiProtocol?:   `0x${string}`
  mockAaveAdapter?:    `0x${string}`
  mockOndoAdapter?:    `0x${string}`
}

export type ContractName = keyof ContractAddresses
export type SupportedChainId = keyof typeof CONTRACT_ADDRESSES
export const ZERO_ADDRESS: `0x${string}` = '0x0000000000000000000000000000000000000000'

const OFFICIAL_USDC: Record<number, `0x${string}`> = {
  // Testnets
  421614:   '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d', // Arbitrum Sepolia
  80002:    '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582', // Polygon Amoy
  84532:    '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia
  11155420: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7', // Optimism Sepolia
  11155111: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Ethereum Sepolia
  // Mainnets
  42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // Arbitrum One
  137:   '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', // Polygon
  8453:  '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base
  10:    '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', // Optimism
  1:     '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // Ethereum
}

export const MOCK_USDC: Record<number, `0x${string}`> = {
  421614: '0x62F7FB943348d9e3e238b7043278B6895428E4d9', // Arbitrum Sepolia
  80002:  '0xDA7610fD028bA2958d1Bb3dcB43F2d5d2Fb2A29d', // Polygon Amoy
}

const resolveUSDC = (chainId: number): `0x${string}` =>
  MOCK_USDC[chainId] ?? OFFICIAL_USDC[chainId] ?? ZERO_ADDRESS

export const CONTRACT_ADDRESSES: Record<number, ContractAddresses> = {

  // ✅ ARBITRUM SEPOLIA — deployed 2026-04-02
  421614: {
    personalFundFactory: '0x484E6C3ad67fF018D433e2503343f48002ABD0CA',
    usdc:                resolveUSDC(421614),
    treasury:            '0xdfe1DC5744E56A06e86505e6Bf607C8Aea4F0486',
    protocolRegistry:    '0x7105291d638F4998De24f53e0959432Ba170f41D',
    userPreferences:     '0x0f619474EeCF03a96Cb1eF78C32f940cF0fDe0df',
    dateTime:            '0xfa81514902c50f0af34C543151b9D6aC8660e108',
    // personalFund:        '0xCf02C2cedd9D9884C2306ddBe2611Ea1CB7D6E3c',
    mockDeFiProtocol:    '0x05698Ea1b8523D214D2AfddE55746e88442716E1',
    mockAaveAdapter:     '0x0cb22CD53Ec4D2897b603d304be658d2c1cB22Da',
    mockOndoAdapter:     '0x65681a2094b097Bfa09A3b8cbf80c95A5696BcD7',
  },

  // ✅ POLYGON AMOY — deployed 2026-03-08
  80002: {
    personalFundFactory: '0xf7b6b09F99d37dC1338c75EcC02aeA8b6E9686E5',
    usdc:                resolveUSDC(80002),
    treasury:            '0xFf64f402aaF12f242ebd435656377e5fce30a9E9',
    protocolRegistry:    '0x52240E0A314f538632b9052fB1f3F21dC15E7911',
    userPreferences:     '0x9fa77C672781429f88aD4b8795AC6aa022732f20',
    dateTime:            '0x05c5B4914CF6840f0830feC6D0e1ef828624fB89',
  },

  // 🔴 BASE SEPOLIA — pending
  84532: {
    personalFundFactory: ZERO_ADDRESS,
    usdc:                resolveUSDC(84532),
    treasury:            ZERO_ADDRESS,
    protocolRegistry:    ZERO_ADDRESS,
    userPreferences:     ZERO_ADDRESS,
    dateTime:            ZERO_ADDRESS,
  },

  // 🔴 OPTIMISM SEPOLIA — pending
  11155420: {
    personalFundFactory: ZERO_ADDRESS,
    usdc:                resolveUSDC(11155420),
    treasury:            ZERO_ADDRESS,
    protocolRegistry:    ZERO_ADDRESS,
    userPreferences:     ZERO_ADDRESS,
    dateTime:            ZERO_ADDRESS,
  },

  // 🔴 ETHEREUM SEPOLIA — pending
  11155111: {
    personalFundFactory: ZERO_ADDRESS,
    usdc:                resolveUSDC(11155111),
    treasury:            ZERO_ADDRESS,
    protocolRegistry:    ZERO_ADDRESS,
    userPreferences:     ZERO_ADDRESS,
    dateTime:            ZERO_ADDRESS,
  },

  // 🔴 ARBITRUM ONE — pending
  42161: {
    personalFundFactory: ZERO_ADDRESS,
    usdc:                resolveUSDC(42161),
    treasury:            ZERO_ADDRESS,
    protocolRegistry:    ZERO_ADDRESS,
    userPreferences:     ZERO_ADDRESS,
  },

  // 🔴 POLYGON — pending
  137: {
    personalFundFactory: ZERO_ADDRESS,
    usdc:                resolveUSDC(137),
    treasury:            ZERO_ADDRESS,
    protocolRegistry:    ZERO_ADDRESS,
    userPreferences:     ZERO_ADDRESS,
  },

  // 🔴 BASE — pending
  8453: {
    personalFundFactory: ZERO_ADDRESS,
    usdc:                resolveUSDC(8453),
    treasury:            ZERO_ADDRESS,
    protocolRegistry:    ZERO_ADDRESS,
    userPreferences:     ZERO_ADDRESS,
  },

  // 🔴 OPTIMISM — pending
  10: {
    personalFundFactory: ZERO_ADDRESS,
    usdc:                resolveUSDC(10),
    treasury:            ZERO_ADDRESS,
    protocolRegistry:    ZERO_ADDRESS,
    userPreferences:     ZERO_ADDRESS,
  },

  // 🔴 ETHEREUM — pending
  1: {
    personalFundFactory: ZERO_ADDRESS,
    usdc:                resolveUSDC(1),
    treasury:            ZERO_ADDRESS,
    protocolRegistry:    ZERO_ADDRESS,
    userPreferences:     ZERO_ADDRESS,
  },
}

export const getContractAddresses = (chainId: number): ContractAddresses | undefined =>
  CONTRACT_ADDRESSES[chainId]

export const getContractAddress = (
  chainId:  number,
  contract: ContractName,
): `0x${string}` | undefined => CONTRACT_ADDRESSES[chainId]?.[contract]

export const isValidAddress = (address: string | undefined): address is `0x${string}` =>
  !!address && address !== ZERO_ADDRESS && /^0x[a-fA-F0-9]{40}$/.test(address)

export const isContractDeployed = (chainId: number, contract: ContractName): boolean =>
  isValidAddress(CONTRACT_ADDRESSES[chainId]?.[contract])

export const areMainContractsDeployed = (chainId: number): boolean => {
  const a = CONTRACT_ADDRESSES[chainId]
  if (!a) return false
  const core: ContractName[] = ['personalFundFactory', 'usdc', 'treasury', 'protocolRegistry', 'userPreferences']
  return core.every((c) => isValidAddress(a[c]))
}

export const getOfficialUSDC = (chainId: number): `0x${string}` | undefined => OFFICIAL_USDC[chainId]
export const getMockUSDC     = (chainId: number): `0x${string}` | undefined => MOCK_USDC[chainId]
export const getUSDCForChain = (chainId: number): `0x${string}` | undefined => CONTRACT_ADDRESSES[chainId]?.usdc
export const hasMockUSDC     = (chainId: number): boolean => chainId in MOCK_USDC

export const getCurrentUSDCType = (chainId: number): 'mock' | 'official' | 'unknown' => {
  const addr = CONTRACT_ADDRESSES[chainId]?.usdc
  if (!addr)                           return 'unknown'
  if (addr === MOCK_USDC[chainId])     return 'mock'
  if (addr === OFFICIAL_USDC[chainId]) return 'official'
  return 'unknown'
}

export const getDeployedContracts = (chainId: number): ContractName[] => {
  const a = CONTRACT_ADDRESSES[chainId]
  if (!a) return []
  return (Object.keys(a) as ContractName[]).filter((c) => isValidAddress(a[c]))
}

export const getPendingContracts = (chainId: number): ContractName[] => {
  const a = CONTRACT_ADDRESSES[chainId]
  if (!a) return []
  return (Object.keys(a) as ContractName[]).filter((c) => !isValidAddress(a[c]))
}

export const getDeploymentProgress = (chainId: number): number => {
  const a = CONTRACT_ADDRESSES[chainId]
  if (!a) return 0
  const total    = Object.keys(a).length
  const deployed = getDeployedContracts(chainId).length
  return Math.round((deployed / total) * 100)
}

if (import.meta.env.DEV) {
  const warnings: string[] = []

  Object.entries(CONTRACT_ADDRESSES).forEach(([id, a]) => {
    const chainId = Number(id)
    if (!a.usdc || a.usdc === ZERO_ADDRESS)
      warnings.push(`Chain ${chainId}: missing USDC address`)
    const hasFactory  = isValidAddress(a.personalFundFactory)
    const hasTreasury = isValidAddress(a.treasury)
    if (hasFactory !== hasTreasury)
      warnings.push(`Chain ${chainId}: partial deploy — factory=${hasFactory} treasury=${hasTreasury}`)
  })

  if (warnings.length > 0) console.warn('[addresses] ⚠️ Config warnings:', warnings)

  ;[421614, 80002].forEach((chainId) => {
    const type = getCurrentUSDCType(chainId)
    if (type !== 'mock')
      console.error(`[addresses] ❌ Chain ${chainId} should use MockUSDC but is using: ${type}`)
    else
      console.log(`[addresses] ✅ Chain ${chainId}: correctly using MockUSDC`)
  })
}