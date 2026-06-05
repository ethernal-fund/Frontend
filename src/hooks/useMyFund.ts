import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useCallback } from 'react'
import { authSelectors } from '@/stores/authStore'
import { useWalletStore } from '@/stores/walletStore'
import { fundsService } from '@/services/fundsService'
import type { FundRecord } from '@/services/fundsService'

export const FUND_QUERY_KEY = ['fund', 'me'] as const
export function useMyFund() {
  const isAuthenticated = authSelectors.isAuthenticated
  const isConnected = useWalletStore((s) => s.isConnected)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!isConnected) {
      queryClient.removeQueries({ queryKey: FUND_QUERY_KEY })
    }
  }, [isConnected, queryClient])

  const query = useQuery<FundRecord | null>({
    queryKey: FUND_QUERY_KEY,
    queryFn: async () => {
      // Validación adicional antes de la llamada
      if (!isAuthenticated) {
        return null
      }
      return fundsService.getMyFund()
    },
    // Solo ejecutar si el usuario está autenticado
    enabled: isAuthenticated,
    // Cachear por 1 minuto, luego considerar stale
    staleTime: 1_000 * 60, // 60 segundos
    // Mantener en caché por 5 minutos después de inactivar
    gcTime: 1_000 * 60 * 5, // 5 minutos
    // Reintentar solo errores transitorios
    retry: (failureCount, error: unknown) => {
      const status = (error as { response?: { status?: number } })?.response?.status
      // No reintentar errores de autenticación o permiso
      if (status === 401 || status === 403) return false
      // Reintentar hasta 2 veces para errores de red
      return failureCount < 2
    },
    // Retry delay con backoff exponencial
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    // No refetch al recuperar el foco (evita llamadas innecesarias)
    refetchOnWindowFocus: false,
    // Refetch al reconectar
    refetchOnReconnect: true,
  })

  const hasFund = query.data !== null && query.data !== undefined

  return {
    /** Datos del fondo o null si no existe o hay error */
    fund: query.data ?? null,
    /** True si el usuario tiene un fondo registrado */
    hasFund,
    /** True si está cargando por primera vez */
    isLoading: query.isLoading,
    /** True si hay un error en la consulta */
    isError: query.isError,
    /** Error específico si ocurrió */
    error: query.error,
    /** Refetch manual de los datos */
    refetch: query.refetch,
  }
}
export function useInvalidateFund() {
  const queryClient = useQueryClient()
    return useCallback(() => {
    return queryClient.invalidateQueries({ queryKey: FUND_QUERY_KEY })
  }, [queryClient])
}
export async function getMyFundServer(): Promise<FundRecord | null> {
  return fundsService.getMyFund()
}