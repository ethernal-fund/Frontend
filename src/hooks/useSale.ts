import { useCallback, useEffect } from 'react'
import {
  useConnection,
  useSwitchChain,
  useReadContract,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi'
import { parseUnits, formatUnits, type Address, type Hash } from 'viem'
import { useQueryClient } from '@tanstack/react-query'
import {
  SALE_ADDRESS,
  SALE_CHAIN_ID,
  USDC_ADDRESS,
  SALE_ABI,
  USDC_ABI,
  parseRound,
  parsePurchase,
  calcTokensOut as calcTokensOutPure,
  needsApproval as needsApprovalPure,
  formatUSDC,
  formatETRF,
} from '@/services/saleService'
import { useSaleStore } from '@/stores/saleStore'
import type { RoundInfo, UserPurchase } from '@/sale/types'

// Re-exports para componentes que no importan saleService directamente
export { formatUSDC, formatETRF, SALE_ABI, SALE_ADDRESS, USDC_ADDRESS }

export interface UseSaleReturn {
  // Estado on-chain
  round:         RoundInfo | null
  purchase:      UserPurchase | null
  usdcBalance:   string                                       // formateado: "1234.56"
  usdcAllowance: string                                       // formateado: "1234.56"
  userAddress:   Address | undefined

  // Chain
  isWrongChain:      boolean
  switchToSaleChain: () => void
  isSwitchingChain:  boolean

  // Helpers puros (sin side effects)
  calcTokensOut: (usdcAmount: string) => string
  needsApproval: (usdcAmount: string) => boolean

  // Estado de la última tx en vuelo
  refetch:      () => void
  txHash:       Hash | undefined
  isPending:    boolean                                         // wallet abierta, esperando firma
  isConfirming: boolean                                         // tx en mempool, esperando confirmación
  isConfirmed:  boolean                                         // tx confirmada on-chain
  error:        Error | null

  // Mutaciones
  approveUSDC:  (usdcAmount: string) => Promise<Hash>
  buyTokens:    (usdcAmount: string) => Promise<Hash>
  claimTokens:  () => Promise<Hash>
}

async function notifyBackend(txHash: Hash, jwt: string | null): Promise<void> {
  const apiUrl = import.meta.env.VITE_API_URL
  if (!apiUrl) return
  try {
    await fetch(`${apiUrl}/api/sale/verify-purchase`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
      },
      body: JSON.stringify({ txHash }),
    })
  } catch {
    // Silencioso: el indexer lo captura en el próximo poll
  }
}

export function useSale(): UseSaleReturn {
  const {
    address,
    isConnected,
    chainId: connectedChainId,
  } = useConnection()

  const switchChain  = useSwitchChain()
  const queryClient  = useQueryClient()

  // Store
  const {
    setRound,
    setPurchase,
    setBalances,
    setTxPending,
    setTxConfirming,
    setTxConfirmed,
    setTxError,
    resetUser,
    jwt,
  } = useSaleStore()

  // Validación de chain
  // connectedChainId puede ser undefined mientras el conector está inicializando.
  // En ese caso no forzamos wrong-chain para evitar un flash del banner de error.
  const isWrongChain = isConnected && connectedChainId !== undefined && connectedChainId !== SALE_CHAIN_ID

  const switchToSaleChain = useCallback(() => {
    switchChain.mutate({ chainId: SALE_CHAIN_ID })
  }, [switchChain])

  // ── Lectura pública de la ronda — siempre habilitada, sin wallet ──────────
  // getCurrentRound es una función view pública del contrato. No requiere
  // wallet conectada ni chain correcta del usuario: usamos la chain de la sale
  // directamente vía wagmi con chainId explícito.
  const { data: rawRoundPublic, refetch: refetchRound } = useReadContract({
    address:      SALE_ADDRESS,
    abi:          SALE_ABI,
    functionName: 'getCurrentRound',
    chainId:      SALE_CHAIN_ID,
    query: {
      enabled:         true,          // siempre activo, incluso sin wallet
      staleTime:       10_000,
      refetchInterval: 30_000,
    },
  })

  // ── Lecturas que requieren wallet conectada (datos del usuario) ───────────
  // enabled = false sin wallet o en wrong chain: evita RPC errors y
  // llamadas innecesarias cuando el usuario no está listo para operar.
  const { data: userReads, refetch: refetchUser } = useReadContracts({
    contracts: [
      {
        address:      SALE_ADDRESS,
        abi:          SALE_ABI,
        functionName: 'getUserPurchase',
        args:         address ? [address] : undefined,
      },
      {
        address:      USDC_ADDRESS,
        abi:          USDC_ABI,
        functionName: 'balanceOf',
        args:         address ? [address] : undefined,
      },
      {
        address:      USDC_ADDRESS,
        abi:          USDC_ABI,
        functionName: 'allowance',
        args:         address ? [address, SALE_ADDRESS] : undefined,
      },
    ],
    query: {
      enabled:         Boolean(isConnected && address && !isWrongChain),
      staleTime:       10_000,
      refetchInterval: 30_000,
    },
  })

  const refetch = useCallback(() => {
    void refetchRound()
    void refetchUser()
  }, [refetchRound, refetchUser])

  // Parseo de resultados on-chain
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawRound     = rawRoundPublic as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawPurchase  = userReads?.[0]?.status === 'success' ? (userReads[0].result as any) : undefined
  const rawUsdcBal   = userReads?.[1]?.status === 'success' ? (userReads[1].result as bigint) : undefined
  const rawAllowance = userReads?.[2]?.status === 'success' ? (userReads[2].result as bigint) : undefined

  const round:    RoundInfo | null    = rawRound    ? parseRound(rawRound)       : null
  const purchase: UserPurchase | null = rawPurchase ? parsePurchase(rawPurchase) : null
  const usdcBalance   = rawUsdcBal   !== undefined ? formatUnits(rawUsdcBal,   6) : '0'
  const usdcAllowance = rawAllowance !== undefined ? formatUnits(rawAllowance,  6) : '0'

  // Sync al store
  useEffect(() => { setRound(round)       }, [round,    setRound])
  useEffect(() => { setPurchase(purchase) }, [purchase, setPurchase])
  useEffect(() => {
    setBalances(usdcBalance, usdcAllowance, '0') // etrfBalance: leer si se necesita en UI
  }, [usdcBalance, usdcAllowance, setBalances])

  // Reset completo del store al desconectar wallet
  useEffect(() => {
    if (!isConnected) resetUser()
  }, [isConnected, resetUser])

  // Mutaciones
  // Tres instancias separadas para que approve / buy / claim
  // tengan isPending / error independientes y no se mezclen en la UI.
  const approve = useWriteContract()
  const buy     = useWriteContract()
  const claim   = useWriteContract()

  // txHash refleja la última tx activa en orden de prioridad: buy > approve > claim
  const txHash    = buy.data ?? approve.data ?? claim.data
  const isPending = approve.isPending || buy.isPending || claim.isPending
  const error     = approve.error     || buy.error     || claim.error

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash: txHash })

  // Sync estado de tx al store
  useEffect(() => {
    if (isPending && txHash) setTxConfirming(txHash)
    else if (isPending)      setTxPending()
  }, [isPending, txHash, setTxPending, setTxConfirming])

  useEffect(() => {
    if (isConfirmed && txHash) setTxConfirmed(txHash)
  }, [isConfirmed, txHash, setTxConfirmed])

  useEffect(() => {
    if (error) setTxError(error.message)
  }, [error, setTxError])

  // Helpers puros
  const calcTokensOut = useCallback(
    (usdcAmount: string) => calcTokensOutPure(usdcAmount, round?.price ?? 0n),
    [round?.price],
  )

  const needsApproval = useCallback(
    (usdcAmount: string) => needsApprovalPure(usdcAmount, rawAllowance ?? 0n),
    [rawAllowance],
  )

  // Mutaciones tipadas
  const approveUSDC = useCallback(async (usdcAmount: string): Promise<Hash> => {
    const hash = await approve.mutateAsync({
      address:      USDC_ADDRESS,
      abi:          USDC_ABI,
      functionName: 'approve',
      args:         [SALE_ADDRESS, parseUnits(usdcAmount, 6)],
    })
    // Refrescar allowance inmediatamente para que el BuyForm refleje el nuevo estado
    await queryClient.invalidateQueries()
    return hash
  }, [approve, queryClient])

  const buyTokens = useCallback(async (usdcAmount: string): Promise<Hash> => {
    const hash = await buy.mutateAsync({
      address:      SALE_ADDRESS,
      abi:          SALE_ABI,
      functionName: 'buy',
      args:         [parseUnits(usdcAmount, 6)],
    })
    await queryClient.invalidateQueries()
    // Notificar backend para indexado inmediato — fire-and-forget
    void notifyBackend(hash, jwt ?? null)
    return hash
  }, [buy, queryClient, jwt])

  const claimTokens = useCallback(async (): Promise<Hash> => {
    const hash = await claim.mutateAsync({
      address:      SALE_ADDRESS,
      abi:          SALE_ABI,
      functionName: 'claim',
      args:         [],
    })
    await queryClient.invalidateQueries()
    // Notificar claim para actualizar claim_events en el backend
    void notifyBackend(hash, jwt ?? null)
    return hash
  }, [claim, queryClient, jwt])

  return {
    round,
    purchase,
    usdcBalance,
    usdcAllowance,
    userAddress:       address,
    isWrongChain,
    switchToSaleChain,
    isSwitchingChain:  switchChain.isPending,
    calcTokensOut,
    needsApproval,
    refetch,
    txHash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
    approveUSDC,
    buyTokens,
    claimTokens,
  }
}