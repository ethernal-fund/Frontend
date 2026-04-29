import api from '@/lib/axios'
import { buildApiUrl, API_ENDPOINTS } from '@/config/api.config'
import { ApiError } from '@/lib/api'
import { getSupabase } from '@/lib/supabase'

export interface ContactPayload {
  name:           string
  email:          string
  subject?:       string
  message:        string
  walletAddress?: string
}

export const contactService = {
  async submitContact(payload: ContactPayload): Promise<void> {
    const db = getSupabase()
    if (!db) throw new ApiError('Supabase not configured', 503)
    const { error } = await db.from('contact_messages').insert({
      name:           payload.name,
      email:          payload.email,
      subject:        payload.subject ?? null,
      message:        payload.message,
      wallet_address: payload.walletAddress ?? null,
    })

    if (error) throw new ApiError(error.message, undefined, error.code)
  },
}

export interface SurveyCreate {
  age:                      string
  trust_traditional:        number
  blockchain_familiarity:   number
  retirement_concern:       number
  has_retirement_plan:      number
  values_in_retirement:     number
  interested_in_blockchain: number
}

export interface FollowUpCreate {
  wants_more_info: boolean
  email?:          string
}
let _lastSurveyId: number | null = null

export const surveyService = {
  async createSurvey(payload: SurveyCreate): Promise<{ id: number }> {
    const { data } = await api.post<{ survey_id: number }>(
      buildApiUrl(API_ENDPOINTS.SURVEY.BASE),
      payload,
    )
    const id = data.survey_id
    _lastSurveyId = id
    return { id }
  },

  async createFollowUp(payload: FollowUpCreate): Promise<void> {
    await api.post(buildApiUrl(API_ENDPOINTS.SURVEY.FOLLOWUP), {
      wants_more_info: payload.wants_more_info,
      email:           payload.email ?? null,
      survey_id:       _lastSurveyId,
    })

    _lastSurveyId = null
  },
}
