import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef }        from 'react'
import { useAuthStore }             from '@/stores/authStore'
import { useWalletStore }           from '@/stores/walletStore'
import { fundsService }             from '@/services/fundsService'
import { useSiweAuth }              from '@/hooks/useSiweAuth'
import type { FundRecord }          from '@/services/fundsService'

export const FUND_QUERY_KEY = ['fund', 'me'] as const
export function useMyFund() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isAuthenticating = useAuthStore((s) => s.isAuthenticating)  
  const isConnected     = useWalletStore((s) => s.isConnected)
  const isReconnecting  = useWalletStore((s) => s.isReconnecting)   
  const queryClient     = useQueryClient()
  const { silentLogin } = useSiweAuth()

  // Ref para no disparar silentLogin más de una vez por sesión de conexión
  const loginAttemptedRef = useRef(false)

  useEffect(() => {
    // No intentar login mientras wagmi reconecta o ya hay uno en vuelo
    if (isReconnecting || isAuthenticating) return
    if (!isConnected) {
      loginAttemptedRef.current = false   // reset al desconectar
      return
    }
    if (isAuthenticated) {
      loginAttemptedRef.current = false   
      return
    }
    if (loginAttemptedRef.current) return  

    loginAttemptedRef.current = true
    void silentLogin()
  }, [isConnected, isAuthenticated, isAuthenticating, isReconnecting, silentLogin])

  useEffect(() => {
    if (!isConnected) {
      queryClient.removeQueries({ queryKey: FUND_QUERY_KEY })
    }
  }, [isConnected, queryClient])

  const query = useQuery<FundRecord | null>({
    queryKey:  FUND_QUERY_KEY,
    queryFn:   () => fundsService.getMyFund(),
    enabled:   isAuthenticated,
    staleTime: 1_000 * 60,
    gcTime:    1_000 * 60 * 5,
    retry: (count, err: unknown) => {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 401 || status === 403) return false
      return count < 2
    },
  })

  return {
    fund:      query.data ?? null,
    hasFund:   query.data !== null && query.data !== undefined,
    isLoading: query.isLoading,
    isError:   query.isError,
    refetch:   query.refetch,
  }
}

export function useInvalidateFund() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: FUND_QUERY_KEY })
}