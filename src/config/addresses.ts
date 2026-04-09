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
  421614: '0x6e1371974D923397ecE9eE7525ac50ad7087c77f', // Arbitrum Sepolia
  80002:  '0xDA7610fD028bA2958d1Bb3dcB43F2d5d2Fb2A29d', // Polygon Amoy
}

const resolveUSDC = (chainId: number): `0x${string}` =>
  MOCK_USDC[chainId] ?? OFFICIAL_USDC[chainId] ?? ZERO_ADDRESS

export const CONTRACT_ADDRESSES: Record<number, ContractAddresses> = {

  // ✅ ARBITRUM SEPOLIA — deployed 2026-04-02
  421614: {
    personalFundFactory: '0x467CFb98Ce2429EB5dEBF6960B48a3C87A2D5a5A',
    usdc:                resolveUSDC(421614),
    treasury:            '0x0a743430067AFC5B69B0F8fF542fdbdAD206A748',
    protocolRegistry:    '0xa76322A970EA80B0ebbB9c5213a2F3A1ee53118f',
    userPreferences:     '0x1c3d7f6C47C7d8EA4bc29864fFB966F2B5896704',
    dateTime:            '0xe4A76Bc0CbEC3F4B1297C754985Aed9Fb9b2AaE9',
    // personalFund:        '0xb9357c7c7938f2336eA2A01063cb1C6EDB697F9E',
    mockDeFiProtocol:    '0xc02998E722173eC07c7697Dd0EBe66dEd527Fd71',
    mockAaveAdapter:     '0x3833088891bEcE92e2c492Fd459Cd025dc7b849D',
    mockOndoAdapter:     '0x9177D9BCbE0e6c3aD4ad9361c7CAe69FAd439198',
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