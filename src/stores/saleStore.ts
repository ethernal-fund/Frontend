/**
 * saleStore.ts
 *
 * Store global de Zustand para la página de venta de ETRF.
 *
 * RESPONSABILIDADES:
 *  - Caché de datos on-chain parseados (round, purchase, balances)
 *  - Estado de la última transacción en vuelo (tx)
 *
 * NO RESPONSABILIDADES (extraídos a componentes locales):
 *  - tokenomicsOpen → useState local en SalePage (UI efímera, no necesita persistencia)
 *  - activeTab      → useState local en SalePage (se puede derivar de round.status + hasPurchased)
 *
 * SINCRONIZACIÓN:
 *  useSale.ts escribe en el store via useEffect después de cada lectura on-chain
 *  y después de cada transacción confirmada. Los componentes pueden leer del store
 *  con selectores para evitar re-renders innecesarios, o directamente de useSale()
 *  si ya están suscritos a ese hook.
 *
 * PATRÓN: immer para mutations seguras + devtools solo en DEV.
 */

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { devtools } from 'zustand/middleware'
import type { Hash } from 'viem'
import type { RoundInfo, UserPurchase } from '@/sale/types'

export type TxStatus = 'idle' | 'pending' | 'confirming' | 'confirmed' | 'error'
export interface TxState {
  status: TxStatus
  hash:   Hash | undefined
  error:  string | null
}

export interface SaleState {
  round:         RoundInfo | null
  purchase:      UserPurchase | null
  usdcBalance:   string   // formateado: "1234.56"
  usdcAllowance: string   // formateado: "1234.56"
  etrfBalance:   string   // formateado: "50000.00"

  tx: TxState
  setRound:        (round: RoundInfo | null)      => void
  setPurchase:     (purchase: UserPurchase | null) => void
  setBalances:     (usdc: string, allowance: string, etrf: string) => void

  setTxPending:    (hash?: Hash)   => void
  setTxConfirming: (hash: Hash)    => void
  setTxConfirmed:  (hash: Hash)    => void
  setTxError:      (error: string) => void
  resetTx:         ()              => void
  resetUser: () => void
}

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
      tx:            INITIAL_TX,

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

      setTxError: (error) =>
        set((s) => {
          s.tx = { status: 'error', hash: s.tx.hash, error }
        }),

      resetTx: () =>
        set((s) => {
          s.tx = INITIAL_TX
        }),

      resetUser: () =>
        set((s) => {
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

export const selectRound        = (s: SaleState) => s.round
export const selectPurchase     = (s: SaleState) => s.purchase
export const selectTx           = (s: SaleState) => s.tx
export const selectUsdcBalance  = (s: SaleState) => s.usdcBalance
export const selectEtrfBalance  = (s: SaleState) => s.etrfBalance

export const selectIsBusy = (s: SaleState) =>
  s.tx.status === 'pending' || s.tx.status === 'confirming'

export const selectCanBuy = (s: SaleState) =>
  s.round?.status === 'active' && !selectIsBusy(s)

export const selectCanClaim = (s: SaleState) =>
  (s.purchase?.claimable ?? 0n) > 0n && !selectIsBusy(s)

export const selectDefaultTab = (s: SaleState): 'buy' | 'vesting' => {
  if (s.purchase?.hasPurchased && s.round?.status !== 'active') return 'vesting'
  return 'buy'
}