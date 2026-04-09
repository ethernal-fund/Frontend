import { createClient } from '@supabase/supabase-js';
import env from './env';

const isConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);

if (!isConfigured && env.isProd) {
  throw new Error('[supabase] VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required in production.');
}

if (!isConfigured && env.isDev) {
  console.warn('[supabase] Supabase not configured — contactAPI, protocolsAPI, userPreferencesAPI and realtimeAPI will be unavailable.');
}

export const supabase = isConfigured
  ? createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        persistSession:   false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
        timeout: 20_000,
      },
      global: {
        headers: {
          'x-app-name': 'ethernal-fund',
        },
      },
    })
  : null;

export interface ContactMessage {
  id?:             number;
  name:            string;
  email:           string;
  subject:         string;
  message:         string;
  wallet_address?: string | null;
  created_at?:     string;
  read?:           boolean;
}

export interface DeFiProtocol {
  id:               number;
  protocol_address: string;
  name:             string;
  apy:              number;
  risk_level:       number;        // 1=Low, 2=Medium, 3=High
  is_active:        boolean;
  is_verified:      boolean;
  total_deposited:  number;
  protocol_type?:   string;
  description?:     string;
  website_url?:     string;
  added_timestamp:  string;
  last_updated:     string;
  verified_at?:     string;
  verified_by?:     string;
}

export interface UserPreferenceDB {
  id:                      number;
  user_address:            string;
  selected_protocol?:      string;
  auto_compound:           boolean;
  risk_tolerance:          number;  // 1=Low, 2=Medium, 3=High
  strategy_type:           number;  // 0=Manual, 1=BestAPY, 2=RiskAdjusted, 3=Diversified
  diversification_percent: number;
  rebalance_threshold:     number;
  total_deposited:         number;
  total_withdrawn:         number;
  lifetime_earnings:       number;
  last_config_update:      string;
}

export interface UserProtocolDeposit {
  id:               number;
  user_address:     string;
  protocol_address: string;
  total_deposited:  number;
  total_withdrawn:  number;
  current_balance:  number;
  earned_interest:  number;
  first_deposit_at?: string;
  last_deposit_at?:  string;
}

export interface RoutingHistory {
  id:                    number;
  user_address:          string;
  protocol_address:      string;
  amount:                number;
  transaction_hash:      string;
  block_number?:         number;
  strategy_used?:        number;
  protocol_apy_at_time?: number;
  status:                'pending' | 'confirmed' | 'failed';
  routed_at:             string;
  confirmed_at?:         string;
}

export interface GlobalProtocolStats {
  total_protocols:   number;
  active_protocols:  number;
  verified_protocols: number;
  total_tvl:         number;
  average_apy:       number;
}

function requireSupabase(caller: string) {
  if (!supabase) {
    throw new Error(
      `[supabase] ${caller} called but Supabase is not configured. ` +
      'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.',
    );
  }
  return supabase;
}

export const getSupabase = () => requireSupabase('getSupabase');
export const contactAPI = {
  async create(data: Omit<ContactMessage, 'id' | 'created_at' | 'read'>) {
    const client = requireSupabase('contactAPI.create');
    const { data: result, error } = await client
      .from('contact_messages')
      .insert([data])
      .select()
      .single();
    if (error) throw error;
    return result as ContactMessage;
  },

  async getAll(unreadOnly = false) {
    const client = requireSupabase('contactAPI.getAll');
    let query = client
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false });
    if (unreadOnly) query = query.eq('read', false);
    const { data, error } = await query;
    if (error) throw error;
    return data as ContactMessage[];
  },

  async markAsRead(id: number) {
    const client = requireSupabase('contactAPI.markAsRead');
    const { error } = await client
      .from('contact_messages')
      .update({ read: true })
      .eq('id', id);
    if (error) throw error;
  },

  async delete(id: number) {
    const client = requireSupabase('contactAPI.delete');
    const { error } = await client
      .from('contact_messages')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};

export const protocolsAPI = {
  async getAll(activeOnly = true) {
    const client = requireSupabase('protocolsAPI.getAll');
    let query = client
      .from('defi_protocols')
      .select('*')
      .order('apy', { ascending: false });
    if (activeOnly) query = query.eq('is_active', true);
    const { data, error } = await query;
    if (error) throw error;
    return data as DeFiProtocol[];
  },

  async getByAddress(protocolAddress: string) {
    const client = requireSupabase('protocolsAPI.getByAddress');
    const { data, error } = await client
      .from('defi_protocols')
      .select('*')
      .eq('protocol_address', protocolAddress.toLowerCase())
      .single();
    if (error) throw error;
    return data as DeFiProtocol;
  },

  async getByRisk(riskLevel: number) {
    const client = requireSupabase('protocolsAPI.getByRisk');
    const { data, error } = await client
      .from('defi_protocols')
      .select('*')
      .eq('is_active', true)
      .eq('risk_level', riskLevel)
      .order('apy', { ascending: false });
    if (error) throw error;
    return data as DeFiProtocol[];
  },

  async getVerified() {
    const client = requireSupabase('protocolsAPI.getVerified');
    const { data, error } = await client
      .from('defi_protocols')
      .select('*')
      .eq('is_active', true)
      .eq('is_verified', true)
      .order('apy', { ascending: false });
    if (error) throw error;
    return data as DeFiProtocol[];
  },

  async getGlobalStats() {
    const client = requireSupabase('protocolsAPI.getGlobalStats');
    const { data, error } = await client.rpc('get_global_protocol_stats');
    if (error) throw error;
    return data as GlobalProtocolStats;
  },

  async syncFromContract(protocol: Omit<DeFiProtocol, 'id'>) {
    const client = requireSupabase('protocolsAPI.syncFromContract');
    const { data, error } = await client
      .from('defi_protocols')
      .upsert(protocol, { onConflict: 'protocol_address' })
      .select()
      .single();
    if (error) throw error;
    return data as DeFiProtocol;
  },
};

export const userPreferencesAPI = {
  async get(userAddress: string) {
    const client = requireSupabase('userPreferencesAPI.get');
    const { data, error } = await client
      .from('user_preferences')
      .select('*')
      .eq('user_address', userAddress.toLowerCase())
      .maybeSingle();
    if (error) throw error;
    return data as UserPreferenceDB | null;
  },

  async upsert(
    userAddress: string,
    prefs: Partial<Omit<UserPreferenceDB, 'id' | 'user_address'>>,
  ) {
    const client = requireSupabase('userPreferencesAPI.upsert');
    const { data, error } = await client
      .from('user_preferences')
      .upsert(
        {
          user_address: userAddress.toLowerCase(),
          ...prefs,
          last_config_update: new Date().toISOString(),
        },
        { onConflict: 'user_address' },
      )
      .select()
      .single();
    if (error) throw error;
    return data as UserPreferenceDB;
  },

  async getDeposits(userAddress: string) {
    const client = requireSupabase('userPreferencesAPI.getDeposits');
    const { data, error } = await client
      .from('user_protocol_deposits')
      .select('*')
      .eq('user_address', userAddress.toLowerCase())
      .order('current_balance', { ascending: false });
    if (error) throw error;
    return data as UserProtocolDeposit[];
  },

  async getRoutingHistory(userAddress: string, limit = 50) {
    const client = requireSupabase('userPreferencesAPI.getRoutingHistory');
    const { data, error } = await client
      .from('routing_history')
      .select('*')
      .eq('user_address', userAddress.toLowerCase())
      .order('routed_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data as RoutingHistory[];
  },

  async recordRouting(
    userAddress: string,
    protocolAddress: string,
    amount: number,
    txHash: string,
  ) {
    const client = requireSupabase('userPreferencesAPI.recordRouting');
    const { data, error } = await client
      .from('routing_history')
      .insert({
        user_address:     userAddress.toLowerCase(),
        protocol_address: protocolAddress.toLowerCase(),
        amount,
        transaction_hash: txHash,
        status:           'pending',
      })
      .select()
      .single();
    if (error) throw error;
    return data as RoutingHistory;
  },

  async confirmRouting(txHash: string) {
    const client = requireSupabase('userPreferencesAPI.confirmRouting');
    const { data, error } = await client
      .from('routing_history')
      .update({
        status:       'confirmed',
        confirmed_at: new Date().toISOString(),
      })
      .eq('transaction_hash', txHash)
      .select()
      .single();
    if (error) throw error;
    return data as RoutingHistory;
  },
};

export const realtimeAPI = {
  onProtocolsChange(callback: () => void) {
    const client = requireSupabase('realtimeAPI.onProtocolsChange');
    return client
      .channel('protocols-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'defi_protocols' }, callback)
      .subscribe();
  },

  onUserDepositsChange(userAddress: string, callback: () => void) {
    const client = requireSupabase('realtimeAPI.onUserDepositsChange');
    return client
      .channel(`deposits-${userAddress}`)
      .on(
        'postgres_changes',
        {
          event:  '*',
          schema: 'public',
          table:  'user_protocol_deposits',
          filter: `user_address=eq.${userAddress.toLowerCase()}`,
        },
        callback,
      )
      .subscribe();
  },

  onNewRouting(
    userAddress: string,
    callback: (payload: { new: RoutingHistory }) => void,
  ) {
    const client = requireSupabase('realtimeAPI.onNewRouting');
    return client
      .channel(`routing-${userAddress}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'routing_history',
          filter: `user_address=eq.${userAddress.toLowerCase()}`,
        },
        callback,
      )
      .subscribe();
  },
};