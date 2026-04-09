import { supabase }  from '@/lib/supabase';
import { ApiError }  from '@/lib/api';
import type { ContactRow, SurveyRow, FollowUpRow } from '@/types/database';
import type { SupabaseClient } from '@supabase/supabase-js';

const db = supabase as unknown as SupabaseClient;

// Contact service  
export interface ContactPayload {
  name:           string;
  email:          string;
  subject?:       string;
  message:        string;
  walletAddress?: string;
}

export interface SurveyCreate {
  age:                      string;
  trust_traditional:        number;
  blockchain_familiarity:   number;
  retirement_concern:       number;
  has_retirement_plan:      number;
  values_in_retirement:     number;
  interested_in_blockchain: number;
}

export interface FollowUpCreate {
  wants_more_info: boolean;
  email?:          string;
}

export const contactService = {
  async submitContact(payload: ContactPayload): Promise<void> {
    const row: Omit<ContactRow, 'id' | 'created_at'> = {
      name:           payload.name,
      email:          payload.email,
      subject:        payload.subject ?? null,
      message:        payload.message,
      wallet_address: payload.walletAddress ?? null,
    };

    const { error } = await db.from('contacts').insert(row) as { error: { message: string; code: string } | null };
    if (error) throw new ApiError(error.message, undefined, error.code);
  },
};

// Survey service 
let _lastSurveyId: string | null = null;

export const surveyService = {
  async createSurvey(payload: SurveyCreate): Promise<{ id: string }> {
    const row: Omit<SurveyRow, 'id' | 'created_at'> = { ...payload };
    const { data, error } = await (
      db.from('surveys').insert(row).select('id').single()
    ) as { data: { id: string } | null; error: { message: string } | null };

    if (error ?? !data) throw new ApiError(error?.message ?? 'Survey insert failed');

    _lastSurveyId = data.id;
    return { id: data.id };
  },

  async createFollowUp(payload: FollowUpCreate): Promise<void> {
    const row: Omit<FollowUpRow, 'id' | 'created_at'> = {
      survey_id:       _lastSurveyId,
      wants_more_info: payload.wants_more_info,
      email:           payload.email ?? null,
    };

    const { error } = await db.from('follow_ups').insert(row) as { error: { message: string; code: string } | null };
    if (error) throw new ApiError(error.message, undefined, error.code);

    _lastSurveyId = null;
  },
};
