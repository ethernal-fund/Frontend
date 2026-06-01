export { useSale }                            from './useSale'
export type { UseSaleReturn }                 from './useSale'

// Tipos de dominio 
export type { RoundInfo, UserPurchase }       from './types'

export {
  formatUSDC,
  formatETRF,
  formatTokenPrice,
  calcRoundProgress,
  SALE_CHAIN_ID,
  SALE_ADDRESS,
  USDC_ADDRESS,
  ETRF_ADDRESS,
  SALE_ABI,
}                                             from './saleService'

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
}                                            from './saleStore'
export type { SaleState, TxState, TxStatus } from './saleStore'

export { BuyForm }                           from './components/BuyForm'
export { ETRFTokenCard }                     from './components/ETRFTokenCard'
export type { ETRFTokenStatus }              from './components/ETRFTokenCard'
export { RoundProgress }                     from './components/RoundProgress'
export { TokenomicsCard }                    from './components/TokenomicsCard'
export { TokenomicsModal }                   from './components/TokenomicsModal'
export { VestingTracker }                    from './components/VestingTracker'
export { WalletGate }                        from './components/WalletGate'