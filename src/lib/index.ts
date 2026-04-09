export {
  default as env,
  API_URL,
  FAUCET_URL,
  SUPABASE_URL,
  SUPABASE_ANON,
  CHAIN_ID,
  EXPLORER_URL,
  ENABLE_DEBUG,
  ENABLE_ANALYTICS,
  ENABLE_FAUCET,
  ENABLE_EXPERIMENTAL,
  ENABLE_MOCKS,
} from './env';

export type { AppConfig } from './env';

// API 
export { ApiError, isApiError, apiFetch } from './api';

// Query client 
export { queryClient } from './queryClient';

// Supabase 
export {
  supabase,
  contactAPI,
  protocolsAPI,
  userPreferencesAPI,
  realtimeAPI,
} from './supabase';

export type {
  ContactMessage,
  DeFiProtocol,
  UserPreferenceDB,
  UserProtocolDeposit,
  RoutingHistory,
  GlobalProtocolStats,
} from './supabase';

export { formatCurrency } from './formatters';

// ── Validators 
export {
  validateAge,
  validateRetirementAge,
  validateAmount,
  validateInterestRate,
  validateAll,
  contractValidators,
  safeValidators,
  ContractInputError,
  isContractInputError,
} from './validators';

export type { ValidationResult } from './validators';

// Calculator 
export {
  calculate,
  calcChartData,
  calcResult,
  fmtUsdc,
  fmtUsdcBigInt,
  toUsdcBigInt,
} from './calculator';

export type { ChartPoint } from './calculator';

//  Calculator validation 
export { validateCalcInputs } from './calculatorValidation';
export { cn } from './cn';
