export type RoundStatus = 'upcoming' | 'active' | 'ended'
export interface RoundInfo {
  id:          number
  name:        string
  price:       bigint        // USDC por token (6 decimales)
  hardCap:     bigint        // máximo USDC a recaudar
  raised:      bigint        // USDC recaudado hasta ahora
  walletCap:   bigint        // máximo USDC por wallet
  startTime:   bigint
  endTime:     bigint
  status:      RoundStatus
  cliffMonths: number        // meses de cliff para compradores
  vestingMonths: number      // meses de vesting lineal post-cliff
}

export interface UserPurchase {
  usdcSpent:    bigint       // USDC total invertido
  tokensBought: bigint       // ETRF total comprado (18 decimales)
  tokensVested: bigint       // ETRF ya vested
  tokensClaimed: bigint      // ETRF ya reclamados
  claimable:    bigint       // ETRF disponibles para reclamar ahora
  startTime:    bigint       // timestamp de la compra
  hasPurchased: boolean
}

export interface BuyFormValues {
  usdcAmount: string
}