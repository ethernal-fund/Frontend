export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface ContactRow {
  id:             string;
  name:           string;
  email:          string;
  subject:        string | null;
  message:        string;
  wallet_address: string | null;
  created_at:     string;
}

export interface SurveyRow {
  id:                       string;
  age:                      string;
  trust_traditional:        number;
  blockchain_familiarity:   number;
  retirement_concern:       number;
  has_retirement_plan:      number;
  values_in_retirement:     number;
  interested_in_blockchain: number;
  created_at:               string;
}

export interface FollowUpRow {
  id:              string;
  survey_id:       string | null;
  wants_more_info: boolean;
  email:           string | null;
  created_at:      string;
}

export interface Database {
  public: {
    Tables: {
      contacts: {
        Row:    ContactRow;
        Insert: Omit<ContactRow, 'id' | 'created_at'>;
        Update: Partial<Omit<ContactRow, 'id' | 'created_at'>>;
      };
      surveys: {
        Row:    SurveyRow;
        Insert: Omit<SurveyRow, 'id' | 'created_at'>;
        Update: Partial<Omit<SurveyRow, 'id' | 'created_at'>>;
      };
      follow_ups: {
        Row:    FollowUpRow;
        Insert: Omit<FollowUpRow, 'id' | 'created_at'>;
        Update: Partial<Omit<FollowUpRow, 'id' | 'created_at'>>;
      };
    };
    Views:     Record<string, never>;
    Functions: Record<string, never>;
    Enums:     Record<string, never>;
  };
}
