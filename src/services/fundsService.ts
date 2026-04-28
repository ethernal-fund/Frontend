import api from '@/lib/axios'
import { buildApiUrl, API_ENDPOINTS, warmupManager } from '@/config/api.config'

export interface FundRecord {
  contract_address:                string
  owner_wallet:                    string
  principal:                       number
  monthly_deposit:                 number
  desired_monthly:                 number
  current_age:                     number
  retirement_age:                  number
  years_payments:                  number
  interest_rate:                   number   // basis points
  timelock_years:                  number
  timelock_end:                    string
  selected_protocol:               string | null
  total_gross_deposited:           number
  total_fees_paid:                 number
  total_net_to_fund:               number
  total_balance:                   number
  available_balance:               number
  total_invested:                  number
  total_withdrawn:                 number
  monthly_deposit_count:           number
  extra_deposit_count:             number
  withdrawal_count:                number
  auto_withdrawal_execution_count: number
  is_active:                       boolean
  retirement_started:              boolean
  early_retirement_approved:       boolean
  auto_withdrawal_enabled:         boolean
  created_at:                      string
  last_synced_at:                  string | null
}

export interface RegisterFundPayload {
  contract_address:       string
  principal:              number
  monthly_deposit:        number
  desired_monthly_income: number
  current_age:            number
  retirement_age:         number
  payment_years:          number
  apy_percent:            number
  protocol_address:       string
}

interface RegisterResult {
  success:          boolean
  created:          boolean
  contract_address: string
  owner_wallet?:    string
}

const PENDING_REGISTER_KEY = 'pendingFundRegister'

interface PendingRegister {
  payload:    RegisterFundPayload
  attempts:   number
  lastTried:  number   // unix ms
  savedAt:    number   // unix ms
}

function savePendingRegister(payload: RegisterFundPayload): void {
  try {
    const pending: PendingRegister = {
      payload,
      attempts:  0,
      lastTried: 0,
      savedAt:   Date.now(),
    }
    localStorage.setItem(PENDING_REGISTER_KEY, JSON.stringify(pending))
  } catch {
    console.warn('[fundsService] Could not save pending register to localStorage')
  }
}

function loadPendingRegister(): PendingRegister | null {
  try {
    const raw = localStorage.getItem(PENDING_REGISTER_KEY)
    return raw ? (JSON.parse(raw) as PendingRegister) : null
  } catch {
    return null
  }
}

function clearPendingRegister(): void {
  try {
    localStorage.removeItem(PENDING_REGISTER_KEY)
  } catch { /* noop */ }
}

async function withRetry<T>(
  fn:          () => Promise<T>,
  maxAttempts: number = 5,
  baseDelay:   number = 2_000,
  label:       string = 'request',
): Promise<T> {
  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 400 || status === 401 || status === 403) {
        console.warn(`[fundsService] ${label} — non-retryable error (${status})`)
        throw err
      }

      if (attempt < maxAttempts) {
        const delay = Math.min(baseDelay * 2 ** (attempt - 1), 30_000)
        console.warn(`[fundsService] ${label} attempt ${attempt} failed — retrying in ${delay}ms`)
        await new Promise(r => setTimeout(r, delay))
      }
    }
  }

  throw lastError
}

export const fundsService = {
  async wakeUp(): Promise<void> {
    try {
      await warmupManager.forcePing()
    } catch { /* noop */ }
  },
  async getMyFund(): Promise<FundRecord | null> {
    try {
      const { data } = await api.get<FundRecord>(
        buildApiUrl(API_ENDPOINTS.FUNDS.ME),
        { timeout: 15_000 },
      )
      return data
    } catch (err: unknown) {
      if ((err as { response?: { status?: number } })?.response?.status === 404) return null
      throw err
    }
  },
  async registerFund(payload: RegisterFundPayload): Promise<RegisterResult> {
    const run = () =>
      api.post<RegisterResult>(
        buildApiUrl(API_ENDPOINTS.FUNDS.REGISTER),
        payload,
        { timeout: 60_000 }, // 60s — cubre cold start de Render
      ).then(r => r.data)

    try {
      const result = await withRetry(run, 5, 2_000, 'registerFund')
      clearPendingRegister()
      return result
    } catch (err) {
      console.error('[fundsService] registerFund failed after all retries — saving to pending queue')
      savePendingRegister(payload)
      throw err
    }
  },

  async syncFund(contractAddress: string): Promise<void> {
    await withRetry(
      () => api.post(
        buildApiUrl(API_ENDPOINTS.FUNDS.SYNC),
        { contract_address: contractAddress },
        { timeout: 60_000 },
      ),
      3,
      3_000,
      'syncFund',
    )
  },

  async registerAndSync(payload: RegisterFundPayload): Promise<FundRecord | null> {
    await fundsService.registerFund(payload)
    try {
      await fundsService.syncFund(payload.contract_address)
    } catch (err) {
      console.warn('[fundsService] sync after register failed (non-critical):', err)
    }
    return fundsService.getMyFund()
  },

  async retryPendingRegister(): Promise<void> {
    const pending = loadPendingRegister()
    if (!pending) return

    const AGE_LIMIT_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
    if (Date.now() - pending.savedAt > AGE_LIMIT_MS) {
      console.warn('[fundsService] Pending register expired — clearing')
      clearPendingRegister()
      return
    }

    console.info('[fundsService] Retrying pending fund register:', pending.payload.contract_address)
    try {
      await fundsService.registerAndSync(pending.payload)
      console.info('[fundsService] Pending register succeeded')
    } catch {
      console.warn('[fundsService] Pending register retry failed — will try again next login')
    }
  },
}