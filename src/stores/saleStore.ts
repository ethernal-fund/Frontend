import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { devtools } from 'zustand/middleware'
import type { Hash } from 'viem'
import type { RoundInfo, UserPurchase } from '@/sale/types'

export type TxStatus = 'idle' | 'pending' | 'confirming' | 'confirmed' | 'error' | 'awaiting_signatures'

export interface TxState {
  status: TxStatus
  hash:   Hash | undefined
  error:  string | null
}

export interface SaleState {
  // ── On-chain data ──
  round:         RoundInfo | null
  purchase:      UserPurchase | null
  usdcBalance:   string                  // formateado: "1234.56"
  usdcAllowance: string                  // formateado: "1234.56"
  etrfBalance:   string                  // formateado: "50000.00"

  // ── Auth (SIWE) ──
  jwt: string | null

  // ── Tx state ──
  tx: TxState

  // ── Setters on-chain ──
  setRound:    (round: RoundInfo | null)       => void
  setPurchase: (purchase: UserPurchase | null) => void
  setBalances: (usdc: string, allowance: string, etrf: string) => void

  // ── Setters auth ──
  setJwt: (token: string) => void

  // ── Setters tx ──
  setTxPending:            (hash?: Hash)   => void
  setTxConfirming:         (hash: Hash)    => void
  setTxConfirmed:          (hash: Hash)    => void
  setTxAwaitingSignatures: (hash?: Hash)   => void
  setTxError:              (error: string) => void
  resetTx:                 ()              => void

  // ── Reset ──
  resetUser: () => void   // limpia jwt + estado de usuario al desconectar wallet
}

// ─────────────────────────────────────────────────────────────────────────────

const INITIAL_TX: TxState = {
  status: 'idle',
  hash:   undefined,
  error:  null,
}

export const useSaleStore = create<SaleState>()(
  devtools(
    immer((set) => ({
      // ── Estado inicial ──
      round:         null,
      purchase:      null,
      usdcBalance:   '0',
      usdcAllowance: '0',
      etrfBalance:   '0',
      jwt:           null,
      tx:            INITIAL_TX,

      // ── On-chain ──
      setRound: (round) =>
        set((s) => {
          s.round = round
        }),

      setPurchase: (purchase) =>
        set((s) => {
          s.purchase = purchase
        }),

      setBalances: (usdc, allowance, etrf) =>
        set((s) => {
          s.usdcBalance   = usdc
          s.usdcAllowance = allowance
          s.etrfBalance   = etrf
        }),

      // ── Auth ──
      setJwt: (token) =>
        set((s) => {
          s.jwt = token
        }),

      // ── Tx ──
      setTxPending: (hash) =>
        set((s) => {
          s.tx = { status: 'pending', hash, error: null }
        }),

      setTxConfirming: (hash) =>
        set((s) => {
          s.tx = { status: 'confirming', hash, error: null }
        }),

      setTxConfirmed: (hash) =>
        set((s) => {
          s.tx = { status: 'confirmed', hash, error: null }
        }),

      // Called when the connected wallet is a Safe multisig signer and the tx
      // has been submitted to the queue but not yet reached threshold signatures.
      // UI should show a "waiting for co-signers" message instead of a spinner.
      setTxAwaitingSignatures: (hash) =>
        set((s) => {
          s.tx = { status: 'awaiting_signatures', hash: hash ?? s.tx.hash, error: null }
        }),

      setTxError: (error) =>
        set((s) => {
          s.tx = { status: 'error', hash: s.tx.hash, error }
        }),

      resetTx: () =>
        set((s) => {
          s.tx = INITIAL_TX
        }),

      // ── Reset completo al desconectar wallet ──
      // Limpia jwt + todo el estado de usuario. El estado de la ronda (round)
      // se conserva ya que es público y no depende del usuario conectado.
      resetUser: () =>
        set((s) => {
          s.jwt           = null
          s.purchase      = null
          s.usdcBalance   = '0'
          s.usdcAllowance = '0'
          s.etrfBalance   = '0'
          s.tx            = INITIAL_TX
        }),
    })),
    { name: 'SaleStore', enabled: import.meta.env.DEV },
  ),
)

// ─── Selectors ───────────────────────────────────────────────────────────────

export const selectRound        = (s: SaleState) => s.round
export const selectPurchase     = (s: SaleState) => s.purchase
export const selectTx           = (s: SaleState) => s.tx
export const selectUsdcBalance  = (s: SaleState) => s.usdcBalance
export const selectEtrfBalance  = (s: SaleState) => s.etrfBalance
export const selectJwt          = (s: SaleState) => s.jwt

// "Busy" = wallet modal open or tx in flight.
// awaiting_signatures is NOT busy: the user can navigate away while co-signers approve.
export const selectIsBusy = (s: SaleState) =>
  s.tx.status === 'pending' || s.tx.status === 'confirming'

export const selectIsAwaitingSignatures = (s: SaleState) =>
  s.tx.status === 'awaiting_signatures'

export const selectCanBuy = (s: SaleState) =>
  s.round?.status === 'active' && !selectIsBusy(s)

export const selectCanClaim = (s: SaleState) =>
  (s.purchase?.claimable ?? 0n) > 0n && !selectIsBusy(s)

export const selectDefaultTab = (s: SaleState): 'buy' | 'vesting' => {
  if (s.purchase?.hasPurchased && s.round?.status !== 'active') return 'vesting'
  return 'buy'
}