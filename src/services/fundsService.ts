import api from '@/lib/axios';
import { buildApiUrl, API_ENDPOINTS } from '@/config/api.config';

export interface FundRecord {
  contract_address:          string;
  owner_wallet:              string;
  principal:                 number;
  monthly_deposit:           number;
  desired_monthly:           number;
  current_age:               number;
  retirement_age:            number;
  years_payments:            number;
  interest_rate:             number;   // basis points
  timelock_years:            number;
  timelock_end:              string;
  selected_protocol:         string | null;
  total_gross_deposited:     number;
  total_fees_paid:           number;
  total_net_to_fund:         number;
  total_balance:             number;
  available_balance:         number;
  total_invested:            number;
  total_withdrawn:           number;
  monthly_deposit_count:     number;
  is_active:                 boolean;
  retirement_started:        boolean;
  early_retirement_approved: boolean;
  created_at:                string;
  last_synced_at:            string;
}

export const fundsService = {
  async getMyFund(): Promise<FundRecord | null> {
    try {
      const { data } = await api.get<FundRecord>(buildApiUrl(API_ENDPOINTS.FUNDS.ME));
      return data;
    } catch (err: unknown) {
      if ((err as { response?: { status?: number } })?.response?.status === 404) return null;
      throw err;
    }
  },

  async syncFund(contractAddress: string): Promise<void> {
    await api.post(buildApiUrl(API_ENDPOINTS.FUNDS.SYNC), {
      contract_address: contractAddress,
    });
  },
};