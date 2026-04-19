import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore }   from '@/stores/authStore';
import { fundsService }   from '@/services/fundsService';
import type { FundRecord } from '@/services/fundsService';

export const FUND_QUERY_KEY = ['fund', 'me'] as const;
export function useMyFund() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const query = useQuery<FundRecord | null>({
    queryKey:  FUND_QUERY_KEY,
    queryFn:   () => fundsService.getMyFund(),
    enabled:   isAuthenticated,
    staleTime: 1_000 * 60,       // 1 min — los balances no cambian tan rápido
    retry:     (count, err: unknown) => {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401 || status === 403) return false;
      return count < 2;
    },
  });

  return {
    fund:        query.data ?? null,
    hasFund:     query.data !== null && query.data !== undefined,
    isLoading:   query.isLoading,
    isError:     query.isError,
    refetch:     query.refetch,
  };
}

export function useInvalidateFund() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: FUND_QUERY_KEY });
}