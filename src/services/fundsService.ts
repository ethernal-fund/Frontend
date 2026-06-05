
import api from '@/lib/axios'
import { buildApiUrl, API_ENDPOINTS, warmupManager } from '@/config/api.config'
import { authSelectors } from '@/stores/authStore'

// Public types 

export interface FundRecord {
  contract_address:                string
  owner_wallet:                    string
  chain_id:                        number
  principal:                       number
  monthly_deposit:                 number
  desired_monthly:                 number
  current_age:                     number
  retirement_age:                  number
  years_payments:                  number
  interest_rate:                   number   
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
  chain_id:               number   
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

// Pending-register queue 
// Used when the network or auth fails during the post-deploy flow.
// The payload is saved to localStorage and retried on the next successful login.

const PENDING_REGISTER_KEY     = 'pendingFundRegister'
const PENDING_REGISTER_VERSION = 2   // bump when payload shape changes

interface PendingRegister {
  version:   number
  payload:   RegisterFundPayload
  attempts:  number
  lastTried: number   // unix ms
  savedAt:   number   // unix ms
}

function savePendingRegister(payload: RegisterFundPayload): void {
  try {
    const pending: PendingRegister = {
      version:   PENDING_REGISTER_VERSION,
      payload,
      attempts:  0,
      lastTried: 0,
      savedAt:   Date.now(),
    }
    localStorage.setItem(PENDING_REGISTER_KEY, JSON.stringify(pending))
    console.info('[fundsService] Saved pending register for', payload.contract_address)
  } catch {
    console.warn('[fundsService] Could not save pending register to localStorage')
  }
}

function loadPendingRegister(): PendingRegister | null {
  try {
    const raw = localStorage.getItem(PENDING_REGISTER_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PendingRegister
    // Discard payloads from an older schema version (e.g. missing chain_id)
    if (parsed.version !== PENDING_REGISTER_VERSION) {
      console.warn('[fundsService] Discarding stale pending register (version mismatch)')
      localStorage.removeItem(PENDING_REGISTER_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function clearPendingRegister(): void {
  try {
    localStorage.removeItem(PENDING_REGISTER_KEY)
  } catch {
    // noop
  }
}

// Retry utility 

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

      // Non-retriable: client errors except 408/429
      if (status === 400 || status === 401 || status === 403 || status === 422) {
        console.warn(`[fundsService] ${label} — non-retriable status (${status})`)
        throw err
      }

      if (attempt < maxAttempts) {
        const delay = Math.min(baseDelay * 2 ** (attempt - 1), 30_000)
        console.warn(
          `[fundsService] ${label} attempt ${attempt}/${maxAttempts} failed — ` +
          `retrying in ${delay}ms`,
        )
        await new Promise((r) => setTimeout(r, delay))
      }
    }
  }

  throw lastError
}

// Service 

export const fundsService = {
  /** Wake up the API server (useful for Render cold-start). */
  async wakeUp(): Promise<void> {
    try {
      await warmupManager.forcePing()
    } catch {
      // noop — failure here is not critical
    }
  },

  /** Fetch the authenticated user's fund record. Returns null on 404. */
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

  /**
   * Register a newly-deployed fund in the database.
   *
   * - Retries up to 5 times with exponential backoff (covers Render cold starts).
   * - On total failure, saves the payload to localStorage for retry on next login.
   * - 409 (already exists) is treated as success.
   */
  async registerFund(payload: RegisterFundPayload): Promise<RegisterResult> {
    const run = () =>
      api
        .post<RegisterResult>(
          buildApiUrl(API_ENDPOINTS.FUNDS.REGISTER),
          payload,
          { timeout: 60_000 },
        )
        .then((r) => r.data)

    try {
      const result = await withRetry(run, 5, 2_000, 'registerFund')
      clearPendingRegister()
      return result
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status
      // 409 = already registered (duplicate deploy or successful prior retry)
      if (status === 409) {
        clearPendingRegister()
        return { success: true, created: false, contract_address: payload.contract_address }
      }
      console.error('[fundsService] registerFund failed after all retries — queuing')
      savePendingRegister(payload)
      throw err
    }
  },

  /** Trigger an on-chain sync for an existing fund record. */
  async syncFund(contractAddress: string): Promise<void> {
    await withRetry(
      () =>
        api.post(
          buildApiUrl(API_ENDPOINTS.FUNDS.SYNC),
          { contract_address: contractAddress },
          { timeout: 60_000 },
        ),
      3,
      3_000,
      'syncFund',
    )
  },

  /** Register and immediately sync. Returns the updated FundRecord or null. */
  async registerAndSync(payload: RegisterFundPayload): Promise<FundRecord | null> {
    await fundsService.registerFund(payload)
    try {
      await fundsService.syncFund(payload.contract_address)
    } catch (err) {
      console.warn('[fundsService] sync after register failed (non-critical):', err)
    }
    return fundsService.getMyFund()
  },

  /**
   * Retry a previously-failed registration saved in localStorage.
   *
   * Called automatically after a successful SIWE login (useSiweAuth.ts).
   *
   * Guards:
   *  - No pending payload → noop
   *  - No valid access token → defer to next login (avoids wasting a 401)
   *  - Payload older than 7 days → discard
   */
  async retryPendingRegister(): Promise<void> {
    const pending = loadPendingRegister()
    if (!pending) return

    const accessToken = authSelectors.saleToken
    if (!accessToken) {
      console.info(
        '[fundsService] retryPendingRegister: no access token — ' +
        'deferring until next login',
      )
      return
    }

    // Age guard 
    const AGE_LIMIT_MS = 7 * 24 * 60 * 60 * 1_000 // 7 days
    if (Date.now() - pending.savedAt > AGE_LIMIT_MS) {
      console.warn('[fundsService] Pending register expired (>7 days) — discarding')
      clearPendingRegister()
      return
    }

    console.info(
      '[fundsService] Retrying pending fund register:',
      pending.payload.contract_address,
      `(chain ${pending.payload.chain_id})`,
    )

    try {
      await fundsService.registerAndSync(pending.payload)
      console.info('[fundsService] Pending register succeeded ✓')
    } catch {
      console.warn('[fundsService] Pending register retry failed — will try again next login')
    }
  },
}