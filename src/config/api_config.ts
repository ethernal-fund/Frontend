const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

export const buildApiUrl = (path: string): string => `${BASE_URL}${path}`;

export const API_ENDPOINTS = {
  AUTH: {
    NONCE:   '/api/auth/nonce',
    VERIFY:  '/api/auth/verify',
    REFRESH: '/api/auth/refresh',
    LOGOUT:  '/api/auth/logout',
  },
  FUNDS: {
    SYNC: '/api/funds/sync',                                            // lo usa useDeployFund.ts
  },
} as const;