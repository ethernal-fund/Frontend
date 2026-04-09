export {
  SUPPORTED_CHAINS,
  ACTIVE_CHAINS,
  ACTIVE_CHAIN_IDS,
  DEFAULT_CHAIN,
  CHAIN_IDS,
  CHAIN_METADATA,
  TRANSPORT_MAP,
  getChainById,
  getChainMetadata,
  isChainSupported,
  isChainActive,
  isTestnetChain,
  hasContracts,
  getFaucets,
  getBridge,
  getExplorerUrl,
  getExplorerAddressUrl,
  getChainName,
  getChainShortName,
  getChainErrorMessage,
} from '@/config/chains'

export type {
  ChainMetadata,
  SupportedChain,
  SupportedChainId,      
} from '@/config/chains'

export {
  wagmiConfig,
  wagmiAdapter,
  modal,
  Web3Provider,
} from '@/config/web3'

export { queryClient } from '@/lib/queryClient'

export {
  ERC20_ABI,
  FACTORY_ABI,
  PERSONAL_FUND_ABI,
  REGISTRY_ABI,
  TREASURY_ABI,
  DEFI_PROTOCOL_ABI,
} from '@/config/abis'

export type {
  FundInfoTuple,
  ProtocolTuple,
  FactoryConfig,
} from '@/config/abis'

export {
  CONTRACT_ADDRESSES,
  ZERO_ADDRESS,
  MOCK_USDC,
  // USDC helpers
  getOfficialUSDC,
  getMockUSDC,
  getUSDCForChain,
  hasMockUSDC,
  getCurrentUSDCType,
  // Contract address resolution
  getContractAddresses,
  getContractAddress,
  isValidAddress,
  isContractDeployed,
  areMainContractsDeployed,
  // Deployment introspection
  getDeployedContracts,
  getPendingContracts,
  getDeploymentProgress,
} from '@/config/addresses'

export type {
  ContractAddresses,
  ContractName,
} from '@/config/addresses'

// ── Named Arbitrum Sepolia addresses ──────────────────────────────────────────
// These are convenience constants derived from CONTRACT_ADDRESSES[421614].
// Admin pages and legacy consumers import them by name.
// Defined inline here to avoid adding noise to addresses.ts.
import { CONTRACT_ADDRESSES as _CA } from '@/config/addresses'

const _arb = _CA[421614]!

export const TREASURY_ADDRESS:          `0x${string}` = _arb.treasury
export const FACTORY_ADDRESS:           `0x${string}` = _arb.personalFundFactory
export const USDC_ADDRESS:              `0x${string}` = _arb.usdc
export const PROTOCOL_REGISTRY_ADDRESS: `0x${string}` = _arb.protocolRegistry    ?? '0x0000000000000000000000000000000000000000'
export const USER_PREFERENCES_ADDRESS:  `0x${string}` = _arb.userPreferences     ?? '0x0000000000000000000000000000000000000000'
export const DATETIME_ADDRESS:          `0x${string}` = _arb.dateTime            ?? '0x0000000000000000000000000000000000000000'
export const MOCK_USDC_ADDRESS:         `0x${string}` = _arb.mockDeFiProtocol    ?? '0x0000000000000000000000000000000000000000'
export const OFFICIAL_USDC_ADDRESS:     `0x${string}` = _arb.usdc

export {
  DEPOSIT_FEE,
  MIN_MONTHLY_USDC,
  MAX_PRINCIPAL_USDC,
  DEFAULT_TIMELOCK_YEARS,
} from '@/config/constants'

export {
  appConfig,
  isValidChain,
  getFaucetUrl,
  isTestnet,
} from '@/config/app'