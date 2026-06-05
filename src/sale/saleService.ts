import axios from 'axios'
import { type Address, parseUnits, formatUnits, zeroAddress } from 'viem'
import { getSaleConfig } from './saleAddresses'
import type { RoundInfo, UserPurchase } from './types'

export type { SaleContracts } from './saleAddresses'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const API_URL  = `${API_BASE}/api/v1`

const apiClient = axios.create({ baseURL: API_URL })

export interface BackendRoundResponse {
  id:             number
  name:           string
  status:         'upcoming' | 'active' | 'ended'
  price:          string
  hard_cap:       string
  raised:         string
  wallet_cap:     string
  start_time:     number
  end_time:       number
  cliff_months:   number
  vesting_months: number
  progress_pct:   number
  buyers:         number
  cached:         boolean
}

export interface BackendPurchaseResponse {
  wallet:          string
  has_purchased:   boolean
  usdc_spent:      string
  tokens_bought:   string
  tokens_vested:   string
  tokens_claimed:  string
  claimable:       string
  start_time:      number
  cliff_ends_at:   number
  vesting_ends_at: number
}

export async function fetchCurrentRoundFromBackend(): Promise<BackendRoundResponse | null> {
  try {
    const response = await apiClient.get<BackendRoundResponse>('/sale/round')
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null // No active round — not an error, just no data
    }
    // Re-throw so TanStack Query sets isError=true and roundError is populated
    throw error
  }
}

export async function fetchUserPurchaseFromBackend(
  jwt: string,
): Promise<BackendPurchaseResponse | null> {
  try {
    const response = await apiClient.get<BackendPurchaseResponse>('/sale/my-purchase', {
      headers: { Authorization: `Bearer ${jwt}` },
    })
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null // User has not purchased yet
    }
    throw error
  }
}

export async function verifyPurchaseOnBackend(txHash: string, jwt: string): Promise<void> {
  try {
    await apiClient.post(
      '/sale/verify-purchase',
      { txHash },
      { headers: { Authorization: `Bearer ${jwt}` } },
    )
  } catch {
    // Intentionally silent
  }
}

export function convertRoundResponse(backendRound: BackendRoundResponse): RoundInfo {
  return {
    id:           backendRound.id,
    name:         backendRound.name,
    price:        parseUnits(backendRound.price, 6),
    hardCap:      parseUnits(backendRound.hard_cap, 6),
    raised:       parseUnits(backendRound.raised, 6),
    walletCap:    parseUnits(backendRound.wallet_cap, 6),
    startTime:    BigInt(backendRound.start_time),
    endTime:      BigInt(backendRound.end_time),
    status:       backendRound.status,
    cliffMonths:  backendRound.cliff_months,
    vestingMonths: backendRound.vesting_months,
  }
}

export function convertPurchaseResponse(backendPurchase: BackendPurchaseResponse): UserPurchase {
  return {
    usdcSpent:     parseUnits(backendPurchase.usdc_spent, 6),
    tokensBought:  parseUnits(backendPurchase.tokens_bought, 18),
    tokensVested:  parseUnits(backendPurchase.tokens_vested, 18),
    tokensClaimed: parseUnits(backendPurchase.tokens_claimed, 18),
    claimable:     parseUnits(backendPurchase.claimable, 18),
    startTime:     BigInt(backendPurchase.start_time),
    hasPurchased:  backendPurchase.has_purchased,
  }
}

export function formatUSDC(value: string | bigint): string {
  const num =
    typeof value === 'bigint'
      ? Number(formatUnits(value, 6))
      : parseFloat(value)
  return new Intl.NumberFormat('en-US', {
    style:                 'currency',
    currency:              'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

export function formatETRF(value: string | bigint): string {
  const num =
    typeof value === 'bigint'
      ? Number(formatUnits(value, 18))
      : parseFloat(value)
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  }).format(num)
}

export function formatTokenPrice(price: string): string {
  return `$${parseFloat(price).toFixed(4)}`
}

export const SALE_ABI = [
  {
    name:            'buy',
    type:            'function',
    stateMutability: 'nonpayable',
    inputs:          [{ name: 'usdc_amount', type: 'uint256' }],
    outputs:         [],
  },
  {
    name:            'claim',
    type:            'function',
    stateMutability: 'nonpayable',
    inputs:          [],
    outputs:         [],
  },
] as const

export const USDC_ABI = [
  {
    name:            'approve',
    type:            'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'value',   type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    name:            'balanceOf',
    type:            'function',
    stateMutability: 'view',
    inputs:  [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name:            'allowance',
    type:            'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner',   type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
] as const

export function getSaleAddress(chainId: number): Address {
  try {
    return getSaleConfig(chainId).contracts.saleETRF
  } catch {
    return zeroAddress
  }
}

export function getUSDCAddress(chainId: number): Address {
  try {
    return getSaleConfig(chainId).contracts.usdc
  } catch {
    return zeroAddress
  }
}

export function getTokenAddress(chainId: number): Address {
  try {
    return getSaleConfig(chainId).contracts.etrfToken
  } catch {
    return zeroAddress
  }
}

export function getVestingAddress(chainId: number): Address {
  try {
    return getSaleConfig(chainId).contracts.vestingETRF
  } catch {
    return zeroAddress
  }
}

// Re-export so consumers only need one import
export { isSaleSupported } from './saleAddresses'
export function calcTokensOut(usdcAmount: string, price: bigint): string {
  if (!usdcAmount || Number(usdcAmount) <= 0 || price === 0n) return '0'
  try {
    const usdc   = parseUnits(usdcAmount, 6)
    const tokens = (usdc * parseUnits('1', 18)) / price
    return formatUnits(tokens, 18)
  } catch {
    return '0'
  }
}

export function needsApproval(usdcAmount: string, currentAllowance: bigint): boolean {
  if (!usdcAmount || Number(usdcAmount) <= 0) return false
  try {
    return parseUnits(usdcAmount, 6) > currentAllowance
  } catch {
    return true
  }
}

if (import.meta.env.DEV) {
  console.log('[SaleService] Backend URL:', API_URL)
}