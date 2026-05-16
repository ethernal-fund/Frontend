export interface ContractAddresses {
  personalFundFactory:    `0x${string}`
  usdc:                   `0x${string}`
  treasury:               `0x${string}`
  protocolRegistry?:      `0x${string}`
  userPreferences?:       `0x${string}`
  dateTime?:              `0x${string}`
  mockDeFiProtocol?:      `0x${string}`
  mockAaveAdapter?:       `0x${string}`
  mockOndoAdapter?:       `0x${string}`
  mockRWAToken?:          `0x${string}`
  mockUniswapRouter?:     `0x${string}`
  genericOndoRWAAdapter?: `0x${string}`
}

export type ContractName = keyof ContractAddresses
export type SupportedChainId = keyof typeof CONTRACT_ADDRESSES
export const ZERO_ADDRESS: `0x${string}` = '0x0000000000000000000000000000000000000000'

const OFFICIAL_USDC: Record<number, `0x${string}`> = {
  // Testnets
  421614:   '0x0463fb7aD07Eac920D1c3F55c96f22c35D5e9E7D', // Arbitrum Sepolia
  80002:    '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582', // Polygon Amoy
  84532:    '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia
  11155420: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7', // Optimism Sepolia
  11155111: '0x04c92F96F59f11e1E632169952b6C66f6D970b8A', // Ethereum Sepolia
  // Mainnets
  42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // Arbitrum One
  137:   '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', // Polygon
  8453:  '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base
  10:    '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', // Optimism
  1:     '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // Ethereum
}

export const MOCK_USDC: Record<number, `0x${string}`> = {
  421614:   '0x0463fb7aD07Eac920D1c3F55c96f22c35D5e9E7D', // Arbitrum Sepolia
  11155111: '0x04c92F96F59f11e1E632169952b6C66f6D970b8A', // Ethereum Sepolia
  80002:    '0xDA7610fD028bA2958d1Bb3dcB43F2d5d2Fb2A29d', // Polygon Amoy
}

const resolveUSDC = (chainId: number): `0x${string}` =>
  MOCK_USDC[chainId] ?? OFFICIAL_USDC[chainId] ?? ZERO_ADDRESS

export const CONTRACT_ADDRESSES: Record<number, ContractAddresses> = {

  // ✅ ARBITRUM SEPOLIA — deployed 2026-05-13    Block: 268027006
  421614: {
    personalFundFactory:   '0x078D8C19f52B50B6f11CC41C011dD1f55f6505Bf',
    usdc:                  resolveUSDC(421614),
    treasury:              '0x9a6397E5D17d8FDB16f3554e9774c764343C311b',
    protocolRegistry:      '0x5F44eaed859B3b426D02d5E596C16eDF387abB75',
    userPreferences:       '0xB1e707ef70e54c6C51Ba4Cf4368F0e15e2934f88',
    dateTime:              '0xb52a94F91d64cFEDDf220a3C621818c5486Aa046',
    mockDeFiProtocol:      '0x4F799F99248707574962F1453efE571e9dfbAbdA',
    mockAaveAdapter:       '0x80240922de190d299a077fa910B92CA09666aE00',
    mockOndoAdapter:       '0x8fBf9F3b42C36C1b44267F10959cC8A5d6A7C882',
    mockRWAToken:          '0x180d4fA2be4DB2ECF92605aDE7a0E7Ca6E575f92',
    mockUniswapRouter:     '0x4f46F0070B7ef539C1Bb2Ad4206318aafc337EFc',
    genericOndoRWAAdapter: '0xAc0F3ABD37Da531302bB81150532e19bf1aCEfC9',
    // "PersonalFund": "0x25eFFDe780c41C00371315b48534F4E2cB4BD7d0",
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

  // ✅  ETHEREUM SEPOLIA — deployed 2026-05-13    Block: 10845154
  11155111: {
    personalFundFactory:   '0xD346f0e4253251F80A79C8ebA1EF2fe5DBa6559E',
    usdc:                  resolveUSDC(11155111),
    dateTime:              '0xa52c2DDDCFa33DFF916672ccF4f134a6B8cb1239',
    treasury:              '0xaF6C9A8D5524f3Da304A981c428BF0FAbAe26d94',
    protocolRegistry:      '0x680CAd1cFdB5460DbA02591A06C23FFE7716091d',
    userPreferences:       '0xF492d4F462145e90731053C846B6E943302625E0',
    mockDeFiProtocol:      '0x46EF6d63DB6356Bb88E43b5AAbDFfD1e695270Ca',
    mockAaveAdapter:       '0x7772CB1D9C47dF567473557d257656A4BE15aA02',
    mockOndoAdapter:       '0x4cE7B43f4829Ad81C665D372DD937a24EF9dEe5F',
    mockRWAToken:          '0xf963f469FEbB038bFab48176597F7c17F575804a',
    mockUniswapRouter:     '0x91Ee1fFd01D6c9DB1f445A2F09eB5d8cdcEd504F',
    genericOndoRWAAdapter: '0x46f44E5c88707262769B9Dfe3cACeB44BDec6049',
    // personalFund: '0x0aa94eAA827331C0D7a073b693519D851C304325',
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