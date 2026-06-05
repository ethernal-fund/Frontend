/**
 * siweService.ts - Servicio de autenticación Sign-In With Ethereum (EIP-4361)
 *
 * Cambios realizados:
 * 1. Endpoints corregidos: /auth/nonce (GET) y /auth/verify-siwe (POST)
 * 2. verify() ahora SOLO envía { message, signature } como espera el backend
 * 3. getNonce() ahora es GET con query params, incluye audience
 * 4. Soporte para múltiples audiences ('retirement' | 'sale')
 *
 * Flujo completo:
 *   1. GET /auth/nonce?address=0x...&audience=retirement
 *   2. Usuario firma el mensaje con su wallet
 *   3. POST /auth/verify-siwe { message, signature }
 *   4. Recibe access_token + refresh_token
 */

import api from '@/lib/axios'
import { buildApiUrl, API_ENDPOINTS } from '@/config/api.config'

// ─────────────────────────────────────────────────────────────────────────────
// Tipos exportados
// ─────────────────────────────────────────────────────────────────────────────

export type SiweErrorCode =
  | 'rejected'        // usuario canceló la firma (code 4001/4100)
  | 'server'          // backend down o respuesta inesperada
  | 'expired'         // nonce expirado o inválido (401 del backend)
  | 'network'         // sin conexión / timeout
  | 'invalid_message' // mensaje SIWE mal formado

export interface SiweError {
  readonly isSiweError: true
  readonly code: SiweErrorCode
  readonly message: string
}

export interface NonceResponse {
  nonce: string
  message: string
}

export interface VerifyResponse {
  access_token: string
  refresh_token: string
  wallet_address: string
  expires_in: number
  refresh_expires_in: number
  is_new_user: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Constructores y type guards
// ─────────────────────────────────────────────────────────────────────────────

export function createSiweError(code: SiweErrorCode, message: string): SiweError {
  return { isSiweError: true, code, message }
}

export function isSiweError(err: unknown): err is SiweError {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as SiweError).isSiweError === true
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers internos
// ─────────────────────────────────────────────────────────────────────────────

function httpErrorCode(err: unknown): number | undefined {
  return (err as { response?: { status?: number } })?.response?.status
}

// ─────────────────────────────────────────────────────────────────────────────
// Servicio principal
// ─────────────────────────────────────────────────────────────────────────────

export const SiweService = {
  /**
   * Obtiene un nonce y un mensaje SIWE listo para firmar.
   *
   * GET /auth/nonce?address=0x...&audience=retirement|sale
   *
   * @param walletAddress - Dirección Ethereum del usuario
   * @param audience - Contexto de autenticación ('retirement' o 'sale')
   * @returns { nonce, message }
   */
  async getNonce(
    walletAddress: string,
    audience: 'retirement' | 'sale' = 'retirement',
  ): Promise<NonceResponse> {
    try {
      const { data } = await api.get<NonceResponse>(
        buildApiUrl(API_ENDPOINTS.AUTH.NONCE),
        {
          params: {
            address: walletAddress,
            audience,
          },
        },
      )
      return data
    } catch (err) {
      const status = httpErrorCode(err)

      if (status === 400) {
        throw createSiweError(
          'invalid_message',
          'Dirección Ethereum inválida. Verificá que sea correcta.',
        )
      }
      if (status === 401) {
        throw createSiweError('expired', 'Sesión expirada. Solicitá un nuevo nonce.')
      }
      if (!status) {
        throw createSiweError('network', 'Sin conexión al servidor. Verificá tu internet.')
      }
      throw createSiweError('server', `Error al obtener nonce (${status}). Intentá de nuevo.`)
    }
  },

  /**
   * Verifica la firma SIWE y emite tokens JWT.
   *
   * POST /auth/verify-siwe
   * Body: { message, signature }
   *
   * @param message - Mensaje SIWE completo que fue firmado
   * @param signature - Firma ECDSA (0x + 130 hex chars)
   * @returns { access_token, refresh_token, wallet_address, expires_in, refresh_expires_in, is_new_user }
   */
  async verify(message: string, signature: string): Promise<VerifyResponse> {
    // Validación básica antes de enviar
    if (!message || message.length < 50) {
      throw createSiweError('invalid_message', 'El mensaje SIWE es inválido o está vacío.')
    }

    if (!signature || !signature.startsWith('0x') || signature.length !== 132) {
      throw createSiweError(
        'invalid_message',
        'La firma debe ser una cadena hex de 65 bytes con prefijo 0x.',
      )
    }

    try {
      const { data } = await api.post<VerifyResponse>(
        buildApiUrl(API_ENDPOINTS.AUTH.VERIFY),
        { message, signature }, // ← SOLO message y signature
      )
      return data
    } catch (err) {
      const status = httpErrorCode(err)

      if (status === 400) {
        throw createSiweError(
          'invalid_message',
          'El mensaje SIWE está mal formado. Solicitá un nuevo nonce.',
        )
      }
      if (status === 401) {
        throw createSiweError('expired', 'Nonce inválido o expirado. Reintentá la autenticación.')
      }
      if (!status) {
        throw createSiweError('network', 'Sin conexión al servidor. Verificá tu internet.')
      }
      throw createSiweError('server', `Error al verificar firma (${status}). Intentá de nuevo.`)
    }
  },

  /**
   * Verifica la firma y obtiene el token (versión simplificada).
   * Útil cuando solo necesitas el access_token.
   */
  async verifyAndGetToken(message: string, signature: string): Promise<string> {
    const response = await this.verify(message, signature)
    return response.access_token
  },

  /**
   * Obtiene información del wallet autenticado.
   * GET /auth/me
   */
  async getMe(): Promise<{ wallet_address: string; is_admin: boolean; audience: string }> {
    try {
      const { data } = await api.get(buildApiUrl(API_ENDPOINTS.AUTH.ME))
      return data
    } catch (err) {
      const status = httpErrorCode(err)
      if (status === 401) {
        throw createSiweError('expired', 'Sesión expirada. Iniciá sesión nuevamente.')
      }
      throw createSiweError('server', 'No se pudo obtener la información del usuario.')
    }
  },

  /**
   * Verifica el estado del token actual.
   * GET /auth/status
   */
  async getStatus(): Promise<{ authenticated: boolean; wallet_address?: string; expires_at?: string }> {
    try {
      const { data } = await api.get(buildApiUrl(API_ENDPOINTS.AUTH.STATUS))
      return data
    } catch {
      return { authenticated: false }
    }
  },

  /**
   * Cierra la sesión actual.
   * POST /auth/logout
   */
  async logout(refreshToken?: string): Promise<void> {
    try {
      await api.post(buildApiUrl(API_ENDPOINTS.AUTH.LOGOUT), { refresh_token: refreshToken })
    } catch (err) {
      // Logout falla silenciosamente - no afecta la UX
      console.warn('[siweService] logout error:', err)
    }
  },

  /**
   * Refresca el access token usando un refresh token.
   * POST /auth/refresh
   */
  async refreshToken(refreshToken: string): Promise<VerifyResponse> {
    try {
      const { data } = await api.post<VerifyResponse>(
        buildApiUrl(API_ENDPOINTS.AUTH.REFRESH),
        { refresh_token: refreshToken },
      )
      return data
    } catch (err) {
      const status = httpErrorCode(err)
      if (status === 401) {
        throw createSiweError('expired', 'Refresh token inválido o expirado.')
      }
      throw createSiweError('server', 'No se pudo renovar la sesión.')
    }
  },
}

// Re-exportación de tipos para facilitar el consumo
export type { SiweErrorCode as SiweErrorCodeType, SiweError as SiweErrorType }