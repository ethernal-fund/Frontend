import axios from 'axios'
import { type Address, parseUnits, formatUnits, zeroAddress } from 'viem'
import { getSaleConfig } from './saleAddresses'
import type { RoundInfo, UserPurchase } from './types'

export type { SaleContracts } from './saleAddresses'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const API_URL  = `${API_BASE}/api/v1`

const saleApiClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

saleApiClient.interceptors.request.use((config) => {
  // El token se pasa por parámetro, no se lee del store global
  // Esto evita conflictos con el audience de retirement
  return config
})

export function setSaleAuthToken(jwt: string | null) {
  if (jwt) {
    saleApiClient.defaults.headers.common['Authorization'] = `Bearer ${jwt}`
  } else {
    delete saleApiClient.defaults.headers.common['Authorization']
  }
}

export interface BackendRoundResponse {
  id: number
  name: string
  status: 'upcoming' | 'active' | 'ended'
  price: string
  hard_cap: string
  raised: string
  wallet_cap: string
  start_time: number
  end_time: number
  cliff_months: number
  vesting_months: number
  progress_pct: number
  buyers: number
  cached: boolean
}

export interface BackendPurchaseResponse {
  wallet: string
  has_purchased: boolean
  usdc_spent: string
  tokens_bought: string
  tokens_vested: string
  tokens_claimed: string
  claimable: string
  start_time: number
  cliff_ends_at: number
  vesting_ends_at: number
}

export interface SiweNonceResponse {
  nonce: string
  message: string
}

export interface SiweVerifyRequest {
  message: string
  signature: string
}

export interface AuthResponse {
  access_token: string
  refresh_token: string
  token_type: string
  wallet_address: string
  expires_in: number
  refresh_expires_in: number
  is_new_user: boolean
}

const APP_DOMAIN = import.meta.env.VITE_APP_DOMAIN || 'ethernal.fund'
const APP_URL = import.meta.env.VITE_APP_URL || 'https://ethernal.fund'
const SALE_CHAIN_ID = Number(import.meta.env.VITE_SALE_CHAIN_ID) || 11155111 // Sepolia por defecto

export function buildSiweMessage(
  walletAddress: string,
  nonce: string,
  audience: 'retirement' | 'sale',
): string {
  const issuedAt = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
  const chainId = audience === 'sale' ? SALE_CHAIN_ID : Number(import.meta.env.VITE_CHAIN_ID) || 421614

  const audienceDisplay = {
    retirement: 'Retirement Protocol',
    sale: 'Token Sale',
  }[audience]

  return (
    `${APP_DOMAIN} wants you to sign in with your Ethereum account:\n` +
    `${walletAddress}\n` +
    `\n` +
    `Sign in to Ethernal Fund (${audienceDisplay})\n` +
    `\n` +
    `URI: ${APP_URL}\n` +
    `Version: 1\n` +
    `Chain ID: ${chainId}\n` +
    `Nonce: ${nonce}\n` +
    `Audience: ${audience}\n` +
    `Issued At: ${issuedAt}`
  )
}

export async function fetchSiweNonce(
  address: string,
  audience: 'retirement' | 'sale' = 'sale',
): Promise<SiweNonceResponse> {
  const response = await saleApiClient.get<SiweNonceResponse>('/auth/nonce', {
    params: { address, audience },
  })
  return response.data
}

export async function verifySiwe(
  message: string,
  signature: string,
): Promise<AuthResponse> {
  const response = await saleApiClient.post<AuthResponse>('/auth/verify-siwe', {
    message,
    signature,
  })
  return response.data
}

export async function refreshAccessToken(refreshToken: string): Promise<AuthResponse> {
  const response = await saleApiClient.post<AuthResponse>('/auth/refresh', {
    refresh_token: refreshToken,
  })
  return response.data
}

export async function logout(refreshToken?: string): Promise<void> {
  await saleApiClient.post('/auth/logout', { refresh_token: refreshToken })
}

/**
 * Revoca todos los tokens del wallet.
 */
export async function revokeAll(): Promise<void> {
  await saleApiClient.post('/auth/revoke-all')
}

/**
 * Verifica el estado del token actual.
 */
export async function getAuthStatus(): Promise<{
  authenticated: boolean
  wallet_address?: string
  audience?: string
  expires_at?: string
}> {
  const response = await saleApiClient.get('/auth/status')
  return response.data
}

export async function fetchCurrentRoundFromBackend(): Promise<BackendRoundResponse | null> {
  try {
    const response = await saleApiClient.get<BackendRoundResponse>('/sale/round')
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null // No active round
    }
    throw error
  }
}

export async function fetchUserPurchaseFromBackend(): Promise<BackendPurchaseResponse | null> {
  try {
    const response = await saleApiClient.get<BackendPurchaseResponse>('/sale/my-purchase')
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null // User has not purchased yet
    }
    throw error
  }
}

export async function verifyPurchaseOnBackend(txHash: string): Promise<void> {
  await saleApiClient.post('/sale/verify-purchase', { tx_hash: txHash })
}

export async function fetchVestingSchedule(wallet?: string): Promise<any> {
  const params = wallet ? { wallet } : {}
  const response = await saleApiClient.get('/sale/vesting/schedule', { params })
  return response.data
}

export async function fetchRoundVestingInfo(roundId: number): Promise<any> {
  const response = await saleApiClient.get('/sale/vesting/round-info', {
    params: { round_id: roundId },
  })
  return response.data
}

export function convertRoundResponse(backendRound: BackendRoundResponse): RoundInfo {
  return {
    id: backendRound.id,
    name: backendRound.name,
    price: parseUnits(backendRound.price, 6),
    hardCap: parseUnits(backendRound.hard_cap, 6),
    raised: parseUnits(backendRound.raised, 6),
    walletCap: parseUnits(backendRound.wallet_cap, 6),
    startTime: BigInt(backendRound.start_time),
    endTime: BigInt(backendRound.end_time),
    status: backendRound.status,
    cliffMonths: backendRound.cliff_months,
    vestingMonths: backendRound.vesting_months,
  }
}

export function convertPurchaseResponse(backendPurchase: BackendPurchaseResponse): UserPurchase {
  return {
    usdcSpent: parseUnits(backendPurchase.usdc_spent, 6),
    tokensBought: parseUnits(backendPurchase.tokens_bought, 18),
    tokensVested: parseUnits(backendPurchase.tokens_vested, 18),
    tokensClaimed: parseUnits(backendPurchase.tokens_claimed, 18),
    claimable: parseUnits(backendPurchase.claimable, 18),
    startTime: BigInt(backendPurchase.start_time),
    hasPurchased: backendPurchase.has_purchased,
  }
}

export function formatUSDC(value: string | bigint): string {
  const num =
    typeof value === 'bigint'
      ? Number(formatUnits(value, 6))
      : parseFloat(value)
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
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
    name: 'buy',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'usdc_amount', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'claim',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
] as const

export const USDC_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'value', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
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

export { isSaleSupported } from './saleAddresses'

export function calcTokensOut(usdcAmount: string, price: bigint): string {
  if (!usdcAmount || Number(usdcAmount) <= 0 || price === 0n) return '0'
  try {
    const usdc = parseUnits(usdcAmount, 6)
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
  console.log('[SaleService] Sale chain ID:', SALE_CHAIN_ID)
}