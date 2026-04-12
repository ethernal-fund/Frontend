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
  getOfficialUSDC,
  getMockUSDC,
  getUSDCForChain,
  hasMockUSDC,
  getCurrentUSDCType,
  getContractAddresses,
  getContractAddress,
  isValidAddress,
  isContractDeployed,
  areMainContractsDeployed,
  getDeployedContracts,
  getPendingContracts,
  getDeploymentProgress,
} from '@/config/addresses'

export type {
  ContractAddresses,
  ContractName,
} from '@/config/addresses'

import { CONTRACT_ADDRESSES as _CA, ZERO_ADDRESS as _ZERO } from '@/config/addresses'

const _arb = _CA[421614]
if (!_arb) {
  throw new Error(
    '[config/index] Missing CONTRACT_ADDRESSES entry for Arbitrum Sepolia (421614).',
  )
}

// Core contracts
export const TREASURY_ADDRESS:           `0x${string}` = _arb.treasury
export const FACTORY_ADDRESS:            `0x${string}` = _arb.personalFundFactory
export const PROTOCOL_REGISTRY_ADDRESS:  `0x${string}` = _arb.protocolRegistry ?? _ZERO
export const USER_PREFERENCES_ADDRESS:   `0x${string}` = _arb.userPreferences  ?? _ZERO
export const DATETIME_ADDRESS:           `0x${string}` = _arb.dateTime         ?? _ZERO

// USDC — resolveUSDC already selects MockUSDC on testnet chains
export const USDC_ADDRESS:               `0x${string}` = _arb.usdc
export const OFFICIAL_USDC_ADDRESS:      `0x${string}` = _arb.usdc
export const MOCK_USDC_ADDRESS:          `0x${string}` = _arb.usdc  

// Mock protocol contracts (testnet DeFi simulators)
export const MOCK_DEFI_PROTOCOL_ADDRESS: `0x${string}` = _arb.mockDeFiProtocol ?? _ZERO
export const MOCK_AAVE_ADAPTER_ADDRESS:  `0x${string}` = _arb.mockAaveAdapter  ?? _ZERO
export const MOCK_ONDO_ADAPTER_ADDRESS:  `0x${string}` = _arb.mockOndoAdapter  ?? _ZERO

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