export { useSale } from './useSale'
export type { UseSaleReturn } from './useSale'

// Tipos de dominio 
export type { RoundInfo, UserPurchase } from './types'

// Funciones y constantes del servicio (solo las que existen)
export {
  formatUSDC,
  formatETRF,
  formatTokenPrice,
  getSaleAddress,
  getUSDCAddress,
  isSaleSupported,
  SALE_ABI,
  USDC_ABI,
  calcTokensOut,
  needsApproval,
} from './saleService'

// Store
export {
  useSaleStore,
  selectRound,
  selectPurchase,
  selectTx,
  selectUsdcBalance,
  selectEtrfBalance,
  selectJwt,
  selectIsBusy,
  selectIsAwaitingSignatures,
  selectCanBuy,
  selectCanClaim,
  selectDefaultTab,
} from './saleStore'
export type { SaleState, TxState, TxStatus } from './saleStore'

// Componentes
export { BuyForm } from './components/BuyForm'
export { ETRFTokenCard } from './components/ETRFTokenCard'
export type { ETRFTokenStatus } from './components/ETRFTokenCard'
export { RoundProgress } from './components/RoundProgress'
export { TokenomicsCard } from './components/TokenomicsCard'
export { TokenomicsModal } from './components/TokenomicsModal'
export { VestingTracker } from './components/VestingTracker'
export { WalletGate } from './components/WalletGate'