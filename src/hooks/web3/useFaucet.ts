import { useState, useCallback, useMemo } from 'react';
import type { FaucetRequest, FaucetResponse } from '@/services/faucet/faucet-client';
import { FaucetAPIClient } from '@/services/faucet/faucet-client';

export function useFaucet(backendUrl?: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const client = useMemo(() => new FaucetAPIClient(backendUrl), [backendUrl]);
  const requestTokens = useCallback(async (data: FaucetRequest): Promise<FaucetResponse> => {
    setLoading(true);
    setError(null);
    try {
      const response = await client.requestTokens(data);
      return response;
    } catch (err) {
      let errorMessage = 'Unknown error';

      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        const url =
          backendUrl ||
          (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_FAUCET_API_URL) ||
          'http://localhost:8000';
        errorMessage =
          `No se pudo conectar con el servidor del faucet (${url}). ` +
          `Verifica que VITE_FAUCET_API_URL esté configurado correctamente y que el servidor esté activo.`;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [client, backendUrl]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    requestTokens,
    loading,
    error,
    clearError,
  };
}