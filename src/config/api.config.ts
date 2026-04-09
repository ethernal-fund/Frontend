const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  TIMEOUT:  30_000,
} as const;

export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept':       'application/json',
} as const;

export const API_ENDPOINTS = {

  AUTH: {
    NONCE: '/users/nonce',
    LOGIN: '/users/auth',
  },

  USERS: {
    ME:     '/users/me',
    SURVEY: '/users/survey',
  },

  FUNDS: {
    ME:           '/funds/me',
    TRANSACTIONS: '/funds/me/transactions',
    SYNC:         '/funds/sync',
    BY_ADDRESS:   (address: string) => `/funds/${address}`,
  },

  TREASURY: {
    STATS:                    '/treasury/stats',
    FEES_ME:                  '/treasury/fees/me',
    EARLY_RETIREMENT_REQUEST: '/treasury/early-retirement/request',
    EARLY_RETIREMENT_ME:      '/treasury/early-retirement/me',
    EARLY_RETIREMENT_PENDING: '/treasury/early-retirement/pending',
    EARLY_RETIREMENT_PROCESS: '/treasury/early-retirement/process',
  },

  PROTOCOLS: {
    LIST:       '/protocols/',
    STATS:      '/protocols/stats',
    BY_ADDRESS: (address: string) => `/protocols/${address}`,
    SYNC:       '/protocols/sync',
  },

  CONTACT: {
    BASE: '/contact',        
  },

  SURVEY: {
    BASE:     '/surveys',
    FOLLOWUP: '/surveys/follow-up',  
  },

  ADMIN: {
    STATS:        '/admin/stats',
    USERS:        '/admin/users',
    FUNDS:        '/admin/funds',
    TRANSACTIONS: '/admin/transactions',
    CONTACTS:     '/admin/contacts',
    SURVEYS:      '/admin/surveys',
    CONTACT_READ: (id: number) => `/admin/contacts/${id}/read`,
    INDEXER_RUN:  '/admin/indexer/run',
  },

} as const;

export const buildApiUrl = (endpoint: string): string => {
  const base = API_CONFIG.BASE_URL.replace(/\/$/, '');
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}/api/v1${path}`; 
};

export const getHealthUrl = (): string =>
  `${API_CONFIG.BASE_URL.replace(/\/$/, '')}/health`;

export type BackendStatus = 'unknown' | 'healthy' | 'warming_up' | 'unavailable';

const WARMUP = {
  PING_INTERVAL:  600_000,
  TIMEOUT:         15_000,
  INITIAL_PINGS:        3,
  INITIAL_DELAY:    5_000,
} as const;

class WarmupManager {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private status: BackendStatus = 'unknown';
  private listeners = new Set<(s: BackendStatus) => void>();

  async start(immediate = true): Promise<void> {
    if (this.intervalId) return;
    if (immediate) await this.initialWarmup();
    this.intervalId = setInterval(() => void this.ping(), WARMUP.PING_INTERVAL);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  onStatusChange(cb: (s: BackendStatus) => void): () => void {
    this.listeners.add(cb);
    cb(this.status);
    return () => this.listeners.delete(cb);
  }

  getStatus():   BackendStatus { return this.status; }
  isHealthy():   boolean       { return this.status === 'healthy'; }
  async forcePing(): Promise<boolean> { return this.ping(); }

  private async initialWarmup(): Promise<void> {
    this.setStatus('warming_up');
    for (let i = 1; i <= WARMUP.INITIAL_PINGS; i++) {
      if (await this.ping()) return;
      if (i < WARMUP.INITIAL_PINGS) {
        await new Promise(r => setTimeout(r, WARMUP.INITIAL_DELAY));
      }
    }
    this.setStatus('unavailable');
  }

  private async ping(): Promise<boolean> {
    try {
      const ctrl = new AbortController();
      const tid  = setTimeout(() => ctrl.abort(), WARMUP.TIMEOUT);
      const res  = await fetch(getHealthUrl(), { signal: ctrl.signal });
      clearTimeout(tid);
      if (res.ok) { this.setStatus('healthy'); return true; }
      this.setStatus('unavailable');
      return false;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      this.setStatus(msg.includes('abort') ? 'warming_up' : 'unavailable');
      return false;
    }
  }

  private setStatus(s: BackendStatus): void {
    if (this.status === s) return;
    this.status = s;
    this.listeners.forEach(cb => { try { cb(s); } catch { /* noop */ } });
  }
}

export const warmupManager = new WarmupManager();

if (typeof window !== 'undefined') {
  warmupManager.start();
  window.addEventListener('beforeunload', () => warmupManager.stop());
}

if (import.meta.env.DEV) {
  console.log('[api] BASE_URL:', API_BASE_URL);
}