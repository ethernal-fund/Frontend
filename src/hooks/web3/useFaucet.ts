import { useState, useCallback, useMemo } from 'react';
import type { FaucetRequest, FaucetResponse, FaucetClientConfig } from '@/services/faucet/faucet-client';
import { FaucetAPIClient } from '@/services/faucet/faucet-client';

export function useFaucet(config?: FaucetClientConfig) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const client = useMemo(
    () => new FaucetAPIClient(config),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config?.apiUrl, config?.proxyUrl, config?.direct, config?.timeoutMs],
  );

  const requestTokens = useCallback(
    async (data: FaucetRequest): Promise<FaucetResponse> => {
      setLoading(true);
      setError(null);
      try {
        return await client.requestTokens(data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [client],
  );

  const clearError = useCallback(() => setError(null), []);

  return { requestTokens, loading, error, clearError };
}