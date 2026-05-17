/**
 * faucet-client.ts — Multichain faucet API client
 *
 * Strategy:
 *  1. If the chain has a first-party faucet, call it through a CORS-safe proxy
 *     route on your own backend (POST /api/v1/faucet/proxy).
 *  2. Otherwise, return a failure response so the UI can redirect to public faucets.
 *
 * CORS: instead of calling the faucet server directly from the browser, the request
 * is forwarded through your backend → POST /api/v1/faucet/proxy → { chainId, address }
 * Your backend calls the faucet server-to-server (no CORS) and returns FaucetResponse.
 *
 * Direct mode: set VITE_FAUCET_DIRECT=true to bypass the proxy (useful during local
 * dev when the faucet server already has CORS configured for your origin).
 *
 * Override per instance: pass a FaucetClientConfig to new FaucetAPIClient({ ... })
 * to override any env-based default without touching global state.
 */

// Types 

export interface FaucetRequest {
  address: string
  chainId?: number
}

export interface FaucetResponse {
  success:      boolean
  message:      string
  tx_hash?:     string
  eth_tx_hash?: string
  amount?:      number
  eth_amount?:  number
  balance?:     number
  wait_time?:   number
}

export interface ChainFaucetConfig {
  apiUrl?:     string
  publicUrls:  string[]
  /** Token symbol this faucet distributes. */
  tokenSymbol: string
  /** Chain name shown in the UI. */
  chainName:   string
  network:     string
}

export interface FaucetClientConfig {
  /** Override VITE_FAUCET_API_URL for first-party faucet calls. */
  apiUrl?:    string
  /** Override the derived proxy URL (VITE_API_URL + /api/v1/faucet/proxy). */
  proxyUrl?:  string
  /** Override VITE_FAUCET_DIRECT. When true, calls the faucet server directly. */
  direct?:    boolean
  /** Request timeout in milliseconds. Default: 30 000. */
  timeoutMs?: number
}

// Per-chain faucet configuration 
// Add/edit entries here as you deploy faucet servers for more chains.

const DEFAULT_FAUCET_URL =
  import.meta.env.VITE_FAUCET_API_URL ?? 'https://mock-usdc-319e.onrender.com'

export const CHAIN_FAUCET_CONFIG: Record<number, ChainFaucetConfig> = {
  // ✅ Arbitrum Sepolia — first-party mock USDC faucet
  421614: {
    apiUrl:      DEFAULT_FAUCET_URL,
    network:     'arbitrum-sepolia',
    tokenSymbol: 'MockUSDC',
    chainName:   'Arbitrum Sepolia',
    publicUrls: [
      'https://faucet.quicknode.com/arbitrum/sepolia',
      'https://www.alchemy.com/faucets/arbitrum-sepolia',
      'https://faucets.chain.link/arbitrum-sepolia',
    ],
  },

  // ✅ Ethereum Sepolia — first-party faucet
  // Set VITE_FAUCET_API_URL_SEPOLIA to point to a separate instance if needed.
  11155111: {
    apiUrl:      import.meta.env.VITE_FAUCET_API_URL_SEPOLIA ?? DEFAULT_FAUCET_URL,
    network:     'ethereum-sepolia',
    tokenSymbol: 'MockUSDC',
    chainName:   'Ethereum Sepolia',
    publicUrls: [
      'https://sepoliafaucet.com',
      'https://faucet.quicknode.com/ethereum/sepolia',
      'https://www.alchemy.com/faucets/ethereum-sepolia',
      'https://faucets.chain.link/sepolia',
    ],
  },

  // ⚠️  Polygon Amoy — no first-party faucet yet, public links only
  80002: {
    network:     'polygon-amoy',
    tokenSymbol: 'MATIC / USDC',
    chainName:   'Polygon Amoy',
    publicUrls: [
      'https://faucets.chain.link/polygon-amoy',
      'https://faucet.polygon.technology/',
      'https://www.alchemy.com/faucets/polygon-amoy',
    ],
  },

  // ⚠️  Base Sepolia — public links only
  84532: {
    network:     'base-sepolia',
    tokenSymbol: 'ETH',
    chainName:   'Base Sepolia',
    publicUrls: [
      'https://www.alchemy.com/faucets/base-sepolia',
      'https://docs.base.org/tools/network-faucets',
      'https://faucets.chain.link/base-sepolia',
    ],
  },

  // ⚠️  Optimism Sepolia — public links only
  11155420: {
    network:     'optimism-sepolia',
    tokenSymbol: 'ETH',
    chainName:   'Optimism Sepolia',
    publicUrls: [
      'https://app.optimism.io/faucet',
      'https://www.alchemy.com/faucets/optimism-sepolia',
      'https://faucets.chain.link/optimism-sepolia',
    ],
  },
}

// Helpers

export const hasFirstPartyFaucet = (chainId: number): boolean =>
  !!CHAIN_FAUCET_CONFIG[chainId]?.apiUrl

export const getChainFaucetConfig = (chainId: number): ChainFaucetConfig | undefined =>
  CHAIN_FAUCET_CONFIG[chainId]

// FaucetAPIClient 

/**
 * Resolved, immutable config used internally after merging env vars and overrides.
 */
interface ResolvedConfig {
  apiUrl:    string
  proxyUrl:  string
  direct:    boolean
  timeoutMs: number
}

export class FaucetAPIClient {
  private readonly cfg: ResolvedConfig

  constructor(overrides: FaucetClientConfig = {}) {
    const defaultBase = (
      import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
    ).replace(/\/$/, '')

    this.cfg = {
      apiUrl:    overrides.apiUrl    ?? DEFAULT_FAUCET_URL,
      proxyUrl:  overrides.proxyUrl  ?? `${defaultBase}/api/v1/routers/faucet`,
      direct:    overrides.direct    ?? import.meta.env.VITE_FAUCET_DIRECT === 'true',
      timeoutMs: overrides.timeoutMs ?? 30_000,
    }
  }

  async requestTokens(req: FaucetRequest): Promise<FaucetResponse> {
    const { address, chainId = 421614 } = req
    const chainCfg = CHAIN_FAUCET_CONFIG[chainId]

    if (!chainCfg?.apiUrl) {
      return {
        success: false,
        message: 'No hay faucet propio para esta red. Usá uno de los faucets públicos listados.',
      }
    }

    const url  = this.cfg.direct
      ? `${chainCfg.apiUrl}/faucet`
      : this.cfg.proxyUrl

    const body = this.cfg.direct
      ? JSON.stringify({ address, network: chainCfg.network })
      : JSON.stringify({ address, chainId, faucetUrl: chainCfg.apiUrl, network: chainCfg.network })

    const controller = new AbortController()
    const timeout    = setTimeout(() => controller.abort(), this.cfg.timeoutMs)

    try {
      const res = await fetch(url, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal:  controller.signal,
      })
      clearTimeout(timeout)
      if (!res.ok) {
        let detail = `HTTP ${res.status}`
        try {
          const json = await res.json() as { detail?: string; message?: string }
          detail = json.detail ?? json.message ?? detail
        } catch { /* ignore — non-JSON error body */ }
        throw new Error(detail)
      }
      return (await res.json()) as FaucetResponse

    } catch (err) {
      clearTimeout(timeout)

      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(
          `La solicitud al faucet tardó más de ${this.cfg.timeoutMs / 1_000} s. Intentá de nuevo.`,
        )
      }

      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        throw new Error(
          this.cfg.direct
            ? `No se pudo conectar con el faucet (${chainCfg.apiUrl}). ` +
              `El servidor puede estar caído o bloquear CORS desde tu origen.`
            : `No se pudo conectar con el proxy del backend (${this.cfg.proxyUrl}). ` +
              `Verificá que VITE_API_URL esté configurado y el backend esté activo.`,
        )
      }

      throw err
    }
  }
}

export const faucetClient = new FaucetAPIClient()