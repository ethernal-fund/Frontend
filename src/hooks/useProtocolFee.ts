/**
 * Single source of truth for the protocol fee percentage.
 *
 * Reads `feePercentage` directly from the Treasury contract so the frontend
 * never hard-codes an assumption that could diverge from what the contract
 * actually charges.
 *
 * Exposes:
 *  - feeBps          → raw basis-points value (e.g. 500 = 5%)
 *  - approveAmount() → given a net USDC amount (bigint, 6 decimals),
 *                      returns the gross amount to approve, including fee
 *                      + a small rounding buffer so the tx never fails due
 *                      to integer-division dust.
 *
 * Usage:
 *   const { feeBps, approveAmount, isLoading } = useProtocolFee()
 *   const toApprove = approveAmount(monthlyAmountWei)
 *
 * Design notes:
 *  - staleTime of 10 min: feePercentage changes only via governance tx,
 *    so polling aggressively would waste RPC quota for no real benefit.
 *  - Falls back to MAX_FEE_BPS (500) if the RPC call fails, which means
 *    the approve will always cover the real fee as long as the fee never
 *    exceeds the configured maximum. If it does, the contract itself will
 *    revert with a clear error.
 *  - The hook does NOT pass feeBps as _maxFeeBP to write calls — that
 *    constant lives in config/constants.ts (MAX_FEE_BPS). They are
 *    different concepts:
 *      · feeBps      = what Treasury *currently charges*  (read from chain)
 *      · MAX_FEE_BPS = what the user *accepts at most*    (product spec)
 */

import { useChainId, useReadContract } from 'wagmi'
import { getContractAddresses }        from '@/config/addresses'
import { MAX_FEE_BPS }                 from '@/config/constants'

// Minimal ABI — only what this hook needs 

const TREASURY_FEE_ABI = [
  {
    stateMutability: 'view',
    type:            'function',
    name:            'feePercentage',
    inputs:          [],
    outputs:         [{ name: '', type: 'uint256' }],
  },
] as const

// Types 

export interface ProtocolFeeResult {
  /** Current fee in basis points as read from Treasury (e.g. 500 = 5%). */
  feeBps: bigint

  /** True while the RPC call is in-flight on first load. */
  isLoading: boolean

  /**
   * Given a net USDC amount in wei (6 decimals), returns the gross amount
   * the user must approve so the contract can deduct the fee and still
   * transfer the intended net amount.
   *
   * Formula: gross = net * 10_000 / (10_000 - feeBps) + DUST_BUFFER
   *
   * Example with feeBps = 500 (5%) and net = 421_180_000n (421.18 USDC):
   *   gross = 421_180_000 * 10_000 / 9_500 = 443_347_368
   *   + 1_000_000 buffer → 444_347_368  (~444.35 USDC)
   */
  approveAmount: (netAmount: bigint) => bigint
}

// Constants 

const FEE_BASE = 10_000n

/**
 * 1 USDC buffer (6 decimals) added on top of the fee-inclusive gross amount.
 * Absorbs integer-division rounding so the allowance is always sufficient.
 */
const DUST_BUFFER = 1_000_000n

// Hook 

export function useProtocolFee(): ProtocolFeeResult {
  const chainId   = useChainId()
  const contracts = getContractAddresses(chainId)

  const { data, isLoading } = useReadContract({
    address:      contracts?.treasury as `0x${string}` | undefined,
    abi:          TREASURY_FEE_ABI,
    functionName: 'feePercentage',
    query: {
      enabled:   !!contracts?.treasury,
      staleTime: 10 * 60 * 1_000, // 10 min — changes only via governance tx
      gcTime:    30 * 60 * 1_000, // 30 min
    },
  })

  // Fall back to MAX_FEE_BPS if the RPC call has not resolved yet or failed.
  // MAX_FEE_BPS (500) equals the expected on-chain value, so in practice this
  // fallback is only active during the first render before the query resolves.
  const feeBps = (data as bigint | undefined) ?? MAX_FEE_BPS

  function approveAmount(netAmount: bigint): bigint {
    // gross = net × 10_000 / (10_000 − feeBps)  (ceiling via integer math)
    const gross = (netAmount * FEE_BASE) / (FEE_BASE - feeBps)
    return gross + DUST_BUFFER
  }

  return { feeBps, isLoading, approveAmount }
}