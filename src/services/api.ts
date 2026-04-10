// services/api.ts — COMPLETO CORREGIDO
import { getSupabase } from '@/lib/supabase';
import { ApiError }    from '@/lib/api';

export interface ContactPayload {
  name:           string;
  email:          string;
  subject?:       string;
  message:        string;
  walletAddress?: string;
}

export const contactService = {
  async submitContact(payload: ContactPayload): Promise<void> {
    const db = getSupabase(); // lanza error descriptivo si no está configurado

    const { error } = await db
      .from('contact_messages')
      .insert({
        name:           payload.name,
        email:          payload.email,
        subject:        payload.subject ?? null,
        message:        payload.message,
        wallet_address: payload.walletAddress ?? null,
      });

    if (error) throw new ApiError(error.message, undefined, error.code);
  },
};

// Survey 
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

let _lastSurveyId: number | null = null;

export const surveyService = {
  async createSurvey(payload: SurveyCreate): Promise<{ id: number }> {
    const db = getSupabase();

    const { data, error } = await db
      .from('anonymous_surveys')
      .insert({ ...payload })
      .select('id')
      .single();

    if (error || !data) throw new ApiError(error?.message ?? 'Survey insert failed');

    _lastSurveyId = (data as { id: number }).id;
    return { id: (data as { id: number }).id };
  },

  async createFollowUp(payload: FollowUpCreate): Promise<void> {
    const db = getSupabase();

    const { error } = await db
      .from('survey_followups')
      .insert({
        survey_id:       _lastSurveyId,
        wants_more_info: payload.wants_more_info,
        email:           payload.email ?? null,
      });

    if (error) throw new ApiError(error.message, undefined, error.code);

    _lastSurveyId = null;
  },
};
