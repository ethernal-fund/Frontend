/**
 * faucet-client.ts
 *
 * Capa de servicio para el faucet de tokens de prueba.
 *
 * CONTRATO PÚBLICO:
 *  - FaucetAPIClient.requestTokens() devuelve FaucetSuccessResponse en caso de éxito.
 *  - En CUALQUIER falla lanza FaucetError con un FaucetErrorCode tipado.
 *  - Nunca devuelve { success: false } — todos los errores son excepciones.
 *
 * CLASIFICACIÓN DE ERRORES (por orden de prioridad, sin string-matching):
 *  1. Chain no existe en CHAIN_FAUCET_CONFIG   → NETWORK_MISMATCH         (pre-fetch, determinístico)
 *  2. Chain sin apiUrl                         → NO_FIRST_PARTY_FAUCET    (pre-fetch, determinístico)
 *  3. AbortController disparó                  → TIMEOUT                  (post-fetch, determinístico)
 *  4. TypeError en fetch()                     → CORS_OR_NETWORK          (post-fetch, determinístico)
 *  5. Cuerpo no parseable como JSON            → SERVER_ERROR             (post-fetch, estructural)
 *  6. HTTP 429                                 → RATE_LIMITED             (post-fetch, determinístico)
 *  7. body.wait_time presente y > 0            → RATE_LIMITED             (post-fetch, campo estructural)
 *  8. Cualquier otro error de servidor         → SERVER_ERROR             (post-fetch, estructural)
 *  9. Excepción no clasificable                → UNKNOWN
 *
 * ⚠️  No se usa string-matching de mensajes de error para clasificar tipos.
 *     Toda clasificación es determinística: código HTTP, tipo de excepción, o campos estructurales.
 */

// Error codes 

/**
 * Identificadores de error tipados.
 * Definidos como `as const` (no enum) para mejor tree-shaking y compatibilidad de módulos.
 */
export const FaucetErrorCode = {
  /** Chain ID no encontrado en CHAIN_FAUCET_CONFIG. */
  NETWORK_MISMATCH:      'NETWORK_MISMATCH',
  /** Chain conocida pero sin faucet propio (apiUrl ausente en config). */
  NO_FIRST_PARTY_FAUCET: 'NO_FIRST_PARTY_FAUCET',
  /** HTTP 429 o servidor indicó tiempo de espera (wait_time > 0 en el body). */
  RATE_LIMITED:          'RATE_LIMITED',
  /** fetch() lanzó TypeError — CORS, backend inaccesible, sin internet. */
  CORS_OR_NETWORK:       'CORS_OR_NETWORK',
  /** AbortController disparó por timeout configurado. */
  TIMEOUT:               'TIMEOUT',
  /** Error de servidor: 4xx/5xx distinto de 429, body.success === false sin wait_time, o JSON inválido. */
  SERVER_ERROR:          'SERVER_ERROR',
  /** Excepción no clasificable en ninguna categoría anterior. */
  UNKNOWN:               'UNKNOWN',
} as const

export type FaucetErrorCode = typeof FaucetErrorCode[keyof typeof FaucetErrorCode]

// FaucetError 

/**
 * Error tipado lanzado por FaucetAPIClient.requestTokens() en cualquier falla.
 * La UI debe manejar errores por `code`, nunca por `message`.
 */
export class FaucetError extends Error {
  /** Código que identifica el tipo de falla. Usar para switch exhaustivo en la UI. */
  readonly code: FaucetErrorCode
  /** Chain ID involucrada en la operación, si aplica. */
  readonly chainId?: number
  /** Segundos hasta poder reintentar. Solo presente en RATE_LIMITED si el servidor lo informa. */
  readonly waitSeconds?: number
  /** HTTP status code de la respuesta del servidor, si hubo respuesta. */
  readonly statusCode?: number

  constructor(
    code:    FaucetErrorCode,
    message: string,
    opts?:   { chainId?: number; waitSeconds?: number; statusCode?: number; cause?: unknown },
  ) {
    super(message, { cause: opts?.cause })
    this.name        = 'FaucetError'
    this.code        = code
    this.chainId     = opts?.chainId
    this.waitSeconds = opts?.waitSeconds
    this.statusCode  = opts?.statusCode
  }
}
// Public types 

export interface FaucetRequest {
  address:  string
  chainId?: number
}

/**
 * Datos de una solicitud exitosa.
 * requestTokens() SOLO devuelve esto — cualquier falla lanza FaucetError.
 */
export interface FaucetSuccessResponse {
  message:      string
  tx_hash?:     string
  eth_tx_hash?: string
  amount?:      number
  eth_amount?:  number
  balance?:     number
}

export interface ChainFaucetConfig {
  apiUrl?:     string
  publicUrls:  string[]
  tokenSymbol: string
  chainName:   string
  network:     string
}

export interface FaucetClientConfig {
  apiUrl?:    string
  proxyUrl?:  string
  direct?:    boolean
  timeoutMs?: number
}

// Shape interno del JSON crudo del servidor.
interface RawServerBody {
  success:      boolean
  message?:     string
  detail?:      string   // formato FastAPI
  tx_hash?:     string
  eth_tx_hash?: string
  amount?:      number
  eth_amount?:  number
  balance?:     number
  wait_time?:   number
}

const DEFAULT_FAUCET_URL =
  import.meta.env.VITE_FAUCET_API_URL ?? 'https://mock-usdc-319e.onrender.com'

export const CHAIN_FAUCET_CONFIG: Record<number, ChainFaucetConfig> = {
  // ✅ Arbitrum Sepolia — faucet propio de MockUSDC
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

  // ✅ Ethereum Sepolia — faucet propio 
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

  // ⚠️ Polygon Amoy — solo links públicos
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

  // ⚠️ Base Sepolia — solo links públicos
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

  // ⚠️ Optimism Sepolia — solo links públicos
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

export const hasFirstPartyFaucet = (chainId: number): boolean =>
  !!CHAIN_FAUCET_CONFIG[chainId]?.apiUrl

export const getChainFaucetConfig = (chainId: number): ChainFaucetConfig | undefined =>
  CHAIN_FAUCET_CONFIG[chainId]

// FaucetAPIClient 

interface ResolvedConfig {
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
      proxyUrl:  overrides.proxyUrl  ?? `${defaultBase}/api/v1/faucet/proxy`,
      direct:    overrides.direct    ?? import.meta.env.VITE_FAUCET_DIRECT === 'true',
      timeoutMs: overrides.timeoutMs ?? 30_000,
    }
  }

  /**
   * Solicita tokens al faucet para `address` en `chainId`.
   *
   * @returns FaucetSuccessResponse cuando el faucet confirma el envío.
   * @throws  FaucetError con código tipado en cualquier otro caso.
   *
   * Garantías:
   *  - Nunca devuelve { success: false }.
   *  - El campo `code` del error es siempre uno de FaucetErrorCode.
   *  - Si code === RATE_LIMITED, `waitSeconds` puede estar presente.
   *  - Si code === NETWORK_MISMATCH | NO_FIRST_PARTY_FAUCET, el throw ocurre
   *    ANTES de cualquier llamada de red.
   */
  async requestTokens(req: FaucetRequest): Promise<FaucetSuccessResponse> {
    const { address, chainId = 421614 } = req

    // 1. Pre-flight: validación de chain (sin I/O) 
    const chainCfg = CHAIN_FAUCET_CONFIG[chainId]

    if (!chainCfg) {
      throw new FaucetError(
        FaucetErrorCode.NETWORK_MISMATCH,
        `Chain ID ${chainId} no está soportada. Cambiá de red en tu wallet.`,
        { chainId },
      )
    }

    if (!chainCfg.apiUrl) {
      throw new FaucetError(
        FaucetErrorCode.NO_FIRST_PARTY_FAUCET,
        `${chainCfg.chainName} no tiene faucet propio. Usá uno de los links públicos.`,
        { chainId },
      )
    }

    // 2. Build request 
    const url  = this.cfg.direct
      ? `${chainCfg.apiUrl}/faucet`
      : this.cfg.proxyUrl

    const body = this.cfg.direct
      ? JSON.stringify({ address, network: chainCfg.network })
      : JSON.stringify({ address, chainId, faucetUrl: chainCfg.apiUrl, network: chainCfg.network })

    const controller = new AbortController()
    const timerId    = setTimeout(() => controller.abort(), this.cfg.timeoutMs)

    // 3. Fetch 
    let rawResponse: Response
    try {
      rawResponse = await fetch(url, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal:  controller.signal,
      })
    } catch (fetchErr) {
      clearTimeout(timerId)

      if (fetchErr instanceof Error && fetchErr.name === 'AbortError') {
        throw new FaucetError(
          FaucetErrorCode.TIMEOUT,
          `La solicitud tardó más de ${this.cfg.timeoutMs / 1_000} s. Intentá de nuevo.`,
          { chainId, cause: fetchErr },
        )
      }

      if (fetchErr instanceof TypeError) {
        // "Failed to fetch" — CORS, backend caído, sin conexión
        throw new FaucetError(
          FaucetErrorCode.CORS_OR_NETWORK,
          this.cfg.direct
            ? `No se pudo conectar con el faucet (${chainCfg.apiUrl}). El servidor puede estar caído o bloquear CORS.`
            : `No se pudo conectar con el proxy del backend (${this.cfg.proxyUrl}). Verificá VITE_API_URL y que el backend esté activo.`,
          { chainId, cause: fetchErr },
        )
      }

      throw new FaucetError(
        FaucetErrorCode.UNKNOWN,
        `Error inesperado al contactar el faucet.`,
        { chainId, cause: fetchErr },
      )
    }

    clearTimeout(timerId)

    // 4. Parse body 
    let serverBody: RawServerBody
    try {
      serverBody = (await rawResponse.json()) as RawServerBody
    } catch {
      // Respuesta no-JSON (ej. HTML de nginx 502)
      throw new FaucetError(
        FaucetErrorCode.SERVER_ERROR,
        `El servidor devolvió una respuesta inválida (HTTP ${rawResponse.status}).`,
        { chainId, statusCode: rawResponse.status },
      )
    }

    // 5. Classify non-ok HTTP 
    if (!rawResponse.ok) {
      throw this.classifyServerError(serverBody, rawResponse.status, chainId)
    }

    // 6. Application-level failure (success: false del servidor del faucet) 
    if (!serverBody.success) {
      throw this.classifyServerError(serverBody, rawResponse.status, chainId)
    }

    // 7. Success
    return {
      message:     serverBody.message     ?? 'Tokens enviados correctamente.',
      tx_hash:     serverBody.tx_hash,
      eth_tx_hash: serverBody.eth_tx_hash,
      amount:      serverBody.amount,
      eth_amount:  serverBody.eth_amount,
      balance:     serverBody.balance,
    }
  }

  private classifyServerError(
    body:    RawServerBody,
    status:  number,
    chainId: number,
  ): FaucetError {
    const message = body.message ?? body.detail ?? `Error del servidor (HTTP ${status}).`

    // HTTP 429 — señal definitiva de rate limit
    if (status === 429) {
      return new FaucetError(FaucetErrorCode.RATE_LIMITED, message, {
        chainId,
        waitSeconds: body.wait_time,
        statusCode:  status,
      })
    }

    // El servidor indicó explícitamente cuánto esperar → también es rate limit
    if (body.wait_time != null && body.wait_time > 0) {
      return new FaucetError(FaucetErrorCode.RATE_LIMITED, message, {
        chainId,
        waitSeconds: body.wait_time,
        statusCode:  status,
      })
    }

    // Cualquier otro error del servidor
    return new FaucetError(FaucetErrorCode.SERVER_ERROR, message, {
      chainId,
      statusCode: status,
    })
  }
}
// Singleton 

export const faucetClient = new FaucetAPIClient()