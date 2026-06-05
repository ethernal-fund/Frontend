export type RoundStatus = 'upcoming' | 'active' | 'ended'

export interface RoundInfo {
  id:          number
  name:        string
  price:       bigint
  hardCap:     bigint
  raised:      bigint
  walletCap:   bigint
  startTime:   bigint
  endTime:     bigint
  status:      RoundStatus
  cliffMonths: number
  vestingMonths: number
}

export interface UserPurchase {
  usdcSpent:    bigint
  tokensBought: bigint
  tokensVested: bigint
  tokensClaimed: bigint
  claimable:    bigint
  startTime:    bigint
  hasPurchased: boolean
}

export interface BuyFormValues {
  usdcAmount: string
}