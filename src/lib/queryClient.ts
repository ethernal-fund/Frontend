import { QueryClient } from '@tanstack/react-query';
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';
import { persistQueryClient } from '@tanstack/react-query-persist-client';

const STORAGE_KEY = 'ETHERNAL_QUERY_CACHE_v1';
const CACHE_TTL   = 1_000 * 60 * 60 * 24; // 24 h

function bigIntReplacer(_key: string, value: unknown): unknown {
  return typeof value === 'bigint' ? { __bigint__: value.toString() } : value;
}

function bigIntReviver(_key: string, value: unknown): unknown {
  if (
    typeof value === 'object' &&
    value !== null &&
    '__bigint__' in value
  ) {
    const raw = (value as Record<string, unknown>).__bigint__;
    if (typeof raw === 'string') {
      return BigInt(raw);
    }
  }
  return value;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1_000 * 60 * 5,
      gcTime: CACHE_TTL,
      retry: (failureCount, error: unknown) => {
        const msg = (error as Error)?.message ?? '';
        if (msg.includes('User rejected'))                   return false;
        if (msg.includes('user rejected'))                   return false;
        if ((error as { status?: number })?.status === 403)  return false;
        if ((error as { status?: number })?.status === 401)  return false;
        return failureCount < 3;
      },
      retryDelay:           (attempt) => Math.min(1_000 * 2 ** attempt, 30_000),
      refetchOnWindowFocus: false,
      refetchOnReconnect:   true,
    },
    mutations: {
      retry: false,
    },
  },
});

function createPersister(): Persister {
  return {
    persistClient: (client: PersistedClient) => {
      try {
        const payload = JSON.stringify(
          { clientState: client.clientState, timestamp: Date.now() },
          bigIntReplacer,
        );
        localStorage.setItem(STORAGE_KEY, payload);
      } catch (err) {
        if (
          err instanceof DOMException &&
          (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED')
        ) {
          localStorage.removeItem(STORAGE_KEY);
        }
        console.warn('[QueryClient] Could not persist cache:', err);
      }
    },

    restoreClient: (): Promise<PersistedClient | undefined> => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return Promise.resolve(undefined);

        const parsed = JSON.parse(raw, bigIntReviver) as {
          clientState: unknown;
          timestamp:   number;
        };

        if (Date.now() - parsed.timestamp > CACHE_TTL) {
          localStorage.removeItem(STORAGE_KEY);
          return Promise.resolve(undefined);
        }

        return Promise.resolve({ clientState: parsed.clientState } as PersistedClient);
      } catch (err) {
        console.warn('[QueryClient] Could not restore cache:', err);
        localStorage.removeItem(STORAGE_KEY);
        return Promise.resolve(undefined);
      }
    },

    removeClient: () => {
      localStorage.removeItem(STORAGE_KEY);
    },
  };
}

if (typeof window !== 'undefined') {
  void persistQueryClient({
    queryClient,
    persister:  createPersister(),
    maxAge:     CACHE_TTL,
    dehydrateOptions: {
      shouldDehydrateQuery: (query) => query.state.status === 'success',
    },
  });
}

export default queryClient;