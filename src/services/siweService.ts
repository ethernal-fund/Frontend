 import api from '@/lib/axios'
import { buildApiUrl, API_ENDPOINTS } from '@/config/api.config'

export type SiweErrorCode =
  | 'rejected'                                     // usuario canceló la firma (code 4001/4100)
  | 'server'                                       // backend down o respuesta inesperada
  | 'expired'                                      // nonce expirado o inválido (401 del backend)
  | 'network'                                      // sin conexión / timeout

export interface SiweError {
  readonly isSiweError: true
  readonly code:        SiweErrorCode
  readonly message:     string
}

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

export interface NonceResponse  { nonce: string; message: string }
interface VerifyResponse { access_token: string }

function httpErrorCode(err: unknown): number | undefined {
  return (err as { response?: { status?: number } })?.response?.status
}

export const SiweService = {
  async getNonce(walletAddress: string): Promise<NonceResponse> {
    try {
      const { data } = await api.post<NonceResponse>(
        buildApiUrl(API_ENDPOINTS.AUTH.NONCE),
        { wallet_address: walletAddress },
      )
      return data
    } catch (err) {
      const status = httpErrorCode(err)
      if (status === 401) throw createSiweError('expired', 'Nonce request unauthorized')
      if (!status)        throw createSiweError('network', 'No network connection')
                          throw createSiweError('server',  `Nonce request failed (${status})`)
    }
  },

  async verify(
    walletAddress: string,
    message:       string,
    signature:     string,
    nonce:         string,
  ): Promise<string> {
    try {
      const { data } = await api.post<VerifyResponse>(
        buildApiUrl(API_ENDPOINTS.AUTH.VERIFY),
        { wallet_address: walletAddress, message, signature, nonce },
      )
      return data.access_token
    } catch (err) {
      const status = httpErrorCode(err)
      if (status === 401) throw createSiweError('expired', 'Invalid or expired nonce')
      if (!status)        throw createSiweError('network', 'No network connection')
                          throw createSiweError('server',  `Verification failed (${status})`)
    }
  },
}