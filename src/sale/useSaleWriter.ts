/**
 * useSaleWriter
 *
 * Single-instance wagmi writer for the Sale feature.
 * Replaces the triple-useWriteContract pattern with one state machine
 * and an activeOp ref that prevents double-submit and eliminates
 * cross-operation error contamination.
 *
 * Domain-agnostic: knows nothing about ETRF, USDC, or contract ABIs.
 * useSale owns that knowledge and passes concrete args to `write()`.
 */

import { useRef, useCallback, useState }                   from 'react'
import { useWriteContract, useWaitForTransactionReceipt }  from 'wagmi'
import type { Hash }                                        from 'viem'
import type { WriteContractParameters }                     from 'wagmi/actions'

// ─── Public types ─────────────────────────────────────────────────────────────

/** Identifies which contract operation is in flight. */
export type SaleOp = 'approve' | 'buy' | 'claim'

export interface SaleWriterReturn {
  /** Which operation is currently executing (null when idle). */
  activeOp:     SaleOp | null

  /** Hash of the last submitted transaction. */
  txHash:       Hash | undefined

  /** True while the wallet modal is open / user is signing. */
  isPending:    boolean

  /** True while waiting for on-chain confirmation. */
  isConfirming: boolean

  /** True once the tx has been confirmed by the node. */
  isConfirmed:  boolean

  /** Last error from wagmi (wallet rejection, on-chain revert, etc.). */
  error:        Error | null

  /**
   * Submit a contract write.
   * Throws if called while another op is already in progress.
   * The caller (useSale) is responsible for any post-tx side-effects
   * (query invalidation, backend notification, etc.).
   */
  write: (op: SaleOp, args: WriteContractParameters) => Promise<Hash>

  /** Clear all state — call from BuyForm's "buy more" reset flow. */
  reset: () => void
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSaleWriter(): SaleWriterReturn {
  const writer = useWriteContract()

  /**
   * Ref for the guard check — síncrono, no genera re-renders.
   * State para que los componentes puedan leer `activeOp`.
   */
  const activeOpRef                   = useRef<SaleOp | null>(null)
  const [activeOp, setActiveOp]       = useState<SaleOp | null>(null)
  const [txHash,   setTxHash]         = useState<Hash | undefined>()

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash: txHash })

  const write = useCallback(async (
    op:   SaleOp,
    args: WriteContractParameters,
  ): Promise<Hash> => {
    if (activeOpRef.current !== null) {
      throw new Error(
        `[SaleWriter] Cannot start "${op}" — "${activeOpRef.current}" is already in progress`,
      )
    }

    activeOpRef.current = op
    setActiveOp(op)

    try {
      const hash = await writer.mutateAsync(args)
      setTxHash(hash)
      return hash
    } catch (err) {
      // Re-throw so useSale / BuyForm can handle it.
      // writer.error is already set by wagmi; we don't duplicate it.
      throw err
    } finally {
      // Always clear the guard so the user can retry after a rejection.
      activeOpRef.current = null
      setActiveOp(null)
    }
  }, [writer])

  const reset = useCallback(() => {
    activeOpRef.current = null
    setActiveOp(null)
    setTxHash(undefined)
    writer.reset()
  }, [writer])

  return {
    activeOp,
    txHash,
    isPending:    writer.isPending,
    isConfirming,
    isConfirmed,
    error:        writer.error,
    write,
    reset,
  }
}