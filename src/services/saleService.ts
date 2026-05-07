/**
 * saleService.ts
 *
 * Única fuente de verdad para:
 *  - Direcciones de contratos (con fallback a env)
 *  - ABIs completos y tipados (as const para inferencia de tipos wagmi/viem)
 *  - Funciones puras de parsing: parseRound(), parsePurchase()
 *  - Funciones puras de cálculo: calcTokensOut(), needsApproval(), calcRoundProgress()
 *  - Funciones puras de formato: formatUSDC(), formatETRF(), formatTokenPrice()
 *  - Cliente viem standalone (para scripts, SSR, tests fuera de React)
 *
 * ⚠️  Este módulo NO importa nada de React, wagmi, Zustand ni otros módulos del proyecto.
 *     Es puro TypeScript/viem. Cualquier cosa que dependa de hooks o estado React vive en useSale.ts.
 *
 * Convención de nombres on-chain → dominio:
 *   hard_cap      → hardCap
 *   wallet_cap    → walletCap
 *   is_active     → status ('active' | 'ended')
 *   cliff_months  → cliffMonths
 *   usdc_spent    → usdcSpent
 *   etc.
 */

import {
  createPublicClient,
  http,
  parseUnits,
  formatUnits,
  type Address,
  type PublicClient,
  type Chain,
} from 'viem'
import { base } from 'viem/chains'
import type { RoundInfo, UserPurchase } from '@/sale/types'

// ─── Direcciones ──────────────────────────────────────────────────────────────

export const SALE_ADDRESS = (import.meta.env.VITE_SALE_CONTRACT_ADDRESS    ?? '') as Address
export const ETRF_ADDRESS = (import.meta.env.VITE_ETRF_CONTRACT_ADDRESS    ?? '') as Address
export const USDC_ADDRESS = (import.meta.env.VITE_USDC_CONTRACT_ADDRESS    ?? '') as Address
export const VESTING_ADDRESS = (import.meta.env.VITE_VESTING_CONTRACT_ADDRESS ?? '') as Address

export const TARGET_CHAIN: Chain = base

// ─── ABIs ─────────────────────────────────────────────────────────────────────
// Todos los ABIs viven ÚNICAMENTE aquí. useSale.ts los importa.
// Tipados con "as const" para que wagmi/viem infieran los tipos de args y retorno.

/**
 * ABI del contrato SaleETRF.vy
 * Expone: getCurrentRound, getUserPurchase, totalRaised, buy, claim
 * Eventos: TokensPurchased, TokensClaimed
 */
export const SALE_ABI = [
  {
    name: 'getCurrentRound',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'id',             type: 'uint256' },
      { name: 'price',          type: 'uint256' },
      { name: 'hard_cap',       type: 'uint256' },
      { name: 'raised',         type: 'uint256' },
      { name: 'wallet_cap',     type: 'uint256' },
      { name: 'start_time',     type: 'uint256' },
      { name: 'end_time',       type: 'uint256' },
      { name: 'is_active',      type: 'bool'    },
      { name: 'cliff_months',   type: 'uint256' },
      { name: 'vesting_months', type: 'uint256' },
    ],
  },
  {
    name: 'getUserPurchase',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [
      { name: 'usdc_spent',     type: 'uint256' },
      { name: 'tokens_bought',  type: 'uint256' },
      { name: 'tokens_vested',  type: 'uint256' },
      { name: 'tokens_claimed', type: 'uint256' },
      { name: 'claimable',      type: 'uint256' },
      { name: 'start_time',     type: 'uint256' },
    ],
  },
  {
    name: 'totalRaised',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
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
  {
    name: 'TokensPurchased',
    type: 'event',
    inputs: [
      { name: 'buyer',        type: 'address', indexed: true  },
      { name: 'usdc_amount',  type: 'uint256', indexed: false },
      { name: 'token_amount', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'TokensClaimed',
    type: 'event',
    inputs: [
      { name: 'claimer', type: 'address', indexed: true  },
      { name: 'amount',  type: 'uint256', indexed: false },
    ],
  },
] as const

/**
 * ABI del contrato ETRF.vy (ERC-20 + burn + pause)
 * Solo las funciones que la UI necesita leer/llamar.
 */
export const ETRF_ABI = [
  { name: 'name',        type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { name: 'symbol',      type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { name: 'decimals',    type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8'   }] },
  { name: 'totalSupply', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'paused',      type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'bool'    }] },
  {
    name: 'balanceOf',
    type: 'function', stateMutability: 'view',
    inputs:  [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'allowance',
    type: 'function', stateMutability: 'view',
    inputs:  [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'approve',
    type: 'function', stateMutability: 'nonpayable',
    inputs:  [{ name: 'spender', type: 'address' }, { name: 'value', type: 'uint256' }],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'transfer',
    type: 'function', stateMutability: 'nonpayable',
    inputs:  [{ name: 'to', type: 'address' }, { name: 'value', type: 'uint256' }],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'burn',
    type: 'function', stateMutability: 'nonpayable',
    inputs:  [{ name: 'amount', type: 'uint256' }],
    outputs: [],
  },
] as const

/**
 * ABI del contrato VestingETRF.vy
 * Solo para el equipo — vesting 1 año cliff + 4 años lineal.
 * La UI lo usa para leer schedules y permitir claim del equipo.
 */
export const VESTING_ABI = [
  {
    name: 'schedules',
    type: 'function', stateMutability: 'view',
    inputs:  [{ name: 'beneficiary', type: 'address' }],
    outputs: [
      { name: 'total_amount', type: 'uint256' },
      { name: 'released',     type: 'uint256' },
      { name: 'start_time',   type: 'uint256' },
      { name: 'revoked',      type: 'bool'    },
    ],
  },
  {
    name: 'claimable',
    type: 'function', stateMutability: 'view',
    inputs:  [{ name: 'beneficiary', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'vested_amount',
    type: 'function', stateMutability: 'view',
    inputs:  [{ name: 'beneficiary', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'time_until_cliff',
    type: 'function', stateMutability: 'view',
    inputs:  [{ name: 'beneficiary', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'claim',
    type: 'function', stateMutability: 'nonpayable',
    inputs:  [],
    outputs: [],
  },
] as const

/**
 * ABI ERC-20 mínimo para USDC (balanceOf, allowance, approve).
 * USDC en Base es un ERC-20 estándar; no necesitamos más funciones.
 */
export const USDC_ABI = [
  {
    name: 'balanceOf',
    type: 'function', stateMutability: 'view',
    inputs:  [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'allowance',
    type: 'function', stateMutability: 'view',
    inputs:  [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'approve',
    type: 'function', stateMutability: 'nonpayable',
    inputs:  [{ name: 'spender', type: 'address' }, { name: 'value', type: 'uint256' }],
    outputs: [{ type: 'bool' }],
  },
] as const

// ─── Cliente viem standalone ──────────────────────────────────────────────────
// Para uso fuera de React: scripts, tests, SSR.
// En componentes React usá usePublicClient() de wagmi en su lugar.

let _publicClient: PublicClient | null = null

export function getPublicClient(): PublicClient {
  if (!_publicClient) {
    _publicClient = createPublicClient({
      chain:     TARGET_CHAIN,
      transport: http(import.meta.env.VITE_RPC_URL ?? undefined),
    })
  }
  return _publicClient
}

// ─── Parsers on-chain → dominio ───────────────────────────────────────────────
// Usan `any` solo en el boundary de entrada del contrato (output crudo de viem).
// El resultado siempre está tipado con RoundInfo / UserPurchase.

export function parseRound(raw: any): RoundInfo {
  return {
    id:            Number(raw.id),
    name:          getRoundName(Number(raw.id)),
    price:         raw.price         as bigint,
    hardCap:       raw.hard_cap      as bigint,
    raised:        raw.raised        as bigint,
    walletCap:     raw.wallet_cap    as bigint,
    startTime:     raw.start_time    as bigint,
    endTime:       raw.end_time      as bigint,
    status:        raw.is_active ? 'active' : 'ended',
    cliffMonths:   Number(raw.cliff_months),
    vestingMonths: Number(raw.vesting_months),
  }
}

export function parsePurchase(raw: any): UserPurchase {
  return {
    usdcSpent:     raw.usdc_spent     as bigint,
    tokensBought:  raw.tokens_bought  as bigint,
    tokensVested:  raw.tokens_vested  as bigint,
    tokensClaimed: raw.tokens_claimed as bigint,
    claimable:     raw.claimable      as bigint,
    startTime:     raw.start_time     as bigint,
    hasPurchased:  (raw.usdc_spent    as bigint) > 0n,
  }
}

// ─── Cálculos puros ───────────────────────────────────────────────────────────

/**
 * Calcula ETRF a recibir dado un monto en USDC (string) y el precio de la ronda.
 * price está en USDC con 6 decimales (mismo formato que el contrato).
 * Retorna '0' si el input es inválido o el precio es cero.
 */
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

/**
 * Devuelve true si el contrato de sale todavía no tiene suficiente allowance
 * para gastar `usdcAmount` USDC en nombre del usuario.
 */
export function needsApproval(usdcAmount: string, currentAllowance: bigint): boolean {
  if (!usdcAmount || Number(usdcAmount) <= 0) return false
  try {
    return parseUnits(usdcAmount, 6) > currentAllowance
  } catch {
    return true
  }
}

/** Porcentaje de la hard cap recaudado. Siempre entre 0 y 100. */
export function calcRoundProgress(raised: bigint, hardCap: bigint): number {
  if (hardCap === 0n) return 0
  return Math.min(
    (Number(formatUnits(raised, 6)) / Number(formatUnits(hardCap, 6))) * 100,
    100,
  )
}

/**
 * Segundos hasta el fin del cliff para un usuario.
 * Usa 30 días/mes como aproximación (mismo criterio que el contrato de sale).
 * Para VestingETRF (equipo) el cliff es exactamente 365 días — no usar esta función.
 */
export function secondsToCliff(startTime: bigint, cliffMonths: number): number {
  const cliffSec = cliffMonths * 30 * 24 * 3600
  const cliffEnd = Number(startTime) + cliffSec
  return Math.max(0, cliffEnd - Date.now() / 1000)
}

// ─── Formatters ───────────────────────────────────────────────────────────────

/** bigint USDC (6 decimales) → "$1,234.56" */
export function formatUSDC(value: bigint): string {
  return new Intl.NumberFormat('en-US', {
    style:                 'currency',
    currency:              'USD',
    maximumFractionDigits: 2,
  }).format(Number(formatUnits(value, 6)))
}

/** bigint ETRF (18 decimales) → "50,000.00" */
export function formatETRF(value: bigint): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
  }).format(Number(formatUnits(value, 18)))
}

/** bigint precio USDC → "$0.0100" */
export function formatTokenPrice(price: bigint): string {
  return `$${Number(formatUnits(price, 6)).toFixed(4)}`
}

// ─── Helpers de UI ────────────────────────────────────────────────────────────

export function getRoundName(id: number): string {
  const names: Record<number, string> = {
    1: 'Seed Round',
    2: 'Private Round',
    3: 'Public Round',
  }
  return names[id] ?? `Round ${id}`
}

// ─── Reads standalone (fuera de React) ───────────────────────────────────────

export async function fetchCurrentRound(): Promise<RoundInfo | null> {
  try {
    const raw = await getPublicClient().readContract({
      address:      SALE_ADDRESS,
      abi:          SALE_ABI,
      functionName: 'getCurrentRound',
    })
    return parseRound(raw)
  } catch {
    return null
  }
}

export async function fetchUserPurchase(user: Address): Promise<UserPurchase | null> {
  try {
    const raw = await getPublicClient().readContract({
      address:      SALE_ADDRESS,
      abi:          SALE_ABI,
      functionName: 'getUserPurchase',
      args:         [user],
    })
    return parsePurchase(raw)
  } catch {
    return null
  }
}

export async function estimateBuyGas(
  user:       Address,
  usdcAmount: string,
): Promise<bigint | undefined> {
  try {
    return await getPublicClient().estimateContractGas({
      address:      SALE_ADDRESS,
      abi:          SALE_ABI,
      functionName: 'buy',
      args:         [parseUnits(usdcAmount, 6)],
      account:      user,
    })
  } catch {
    return undefined
  }
}