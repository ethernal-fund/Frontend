const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  TIMEOUT:  30_000,
  VERSION:  'v1',
} as const

export const API_ENDPOINTS = {
  AUTH: {
    NONCE:   '/users/nonce',
    VERIFY:  '/users/auth',
    REFRESH: '/auth/refresh',
    LOGOUT:  '/auth/logout',
  },

  USERS: {
    ME:     '/users/me',
    SURVEY: '/users/survey',
  },

  FUNDS: {
    ME:           '/funds/me',
    TRANSACTIONS: '/funds/me/transactions',
    SYNC:         '/funds/sync',
    REGISTER:     '/funds/register',
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
} as const

export const buildApiUrl = (endpoint: string): string => {
  const base = API_CONFIG.BASE_URL.replace(/\/$/, '')
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  return `${base}/api/${API_CONFIG.VERSION}${path}`
}

export const getHealthUrl = (): string =>
  `${API_CONFIG.BASE_URL.replace(/\/$/, '')}/health`

export type BackendStatus = 'unknown' | 'healthy' | 'warming_up' | 'unavailable'

const WARMUP = {
  PING_INTERVAL: 600_000,  // 10 min
  TIMEOUT:        15_000,  // 15 s
  INITIAL_PINGS:       3,
  INITIAL_DELAY:   5_000,  // 5 s entre reintentos iniciales
} as const

class WarmupManager {
  private intervalId: ReturnType<typeof setInterval> | null = null
  private status: BackendStatus = 'unknown'
  private listeners = new Set<(status: BackendStatus) => void>()

  async start(immediate = true): Promise<void> {
    if (this.intervalId) return
    if (immediate) await this.initialWarmup()
    this.intervalId = setInterval(() => void this.ping(), WARMUP.PING_INTERVAL)
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  onStatusChange(cb: (status: BackendStatus) => void): () => void {
    this.listeners.add(cb)
    cb(this.status)
    return () => this.listeners.delete(cb)
  }

  getStatus   = (): BackendStatus => this.status
  isHealthy   = (): boolean       => this.status === 'healthy'
  forcePing   = (): Promise<boolean> => this.ping()

  private async initialWarmup(): Promise<void> {
    this.setStatus('warming_up')
    for (let i = 1; i <= WARMUP.INITIAL_PINGS; i++) {
      if (await this.ping()) return
      if (i < WARMUP.INITIAL_PINGS)
        await new Promise(r => setTimeout(r, WARMUP.INITIAL_DELAY))
    }
    this.setStatus('unavailable')
  }

  private async ping(): Promise<boolean> {
    try {
      const controller = new AbortController()
      const id = setTimeout(() => controller.abort(), WARMUP.TIMEOUT)
      const res = await fetch(getHealthUrl(), { signal: controller.signal })
      clearTimeout(id)
      this.setStatus(res.ok ? 'healthy' : 'unavailable')
      return res.ok
    } catch (err) {
      const isAbort = err instanceof Error && err.name === 'AbortError'
      this.setStatus(isAbort ? 'warming_up' : 'unavailable')
      return false
    }
  }

  private setStatus(next: BackendStatus): void {
    if (this.status === next) return
    this.status = next
    this.listeners.forEach(cb => { try { cb(next) } catch { /* noop */ } })
  }
}

export const warmupManager = new WarmupManager()

if (typeof window !== 'undefined') {
  warmupManager.start()
  window.addEventListener('beforeunload', () => warmupManager.stop())
}

if (import.meta.env.DEV) {
  console.log('[api] BASE_URL:', API_BASE_URL)
  console.log('[api] Version:', API_CONFIG.VERSION)
}