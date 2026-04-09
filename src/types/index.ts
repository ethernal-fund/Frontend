export interface FundOnChain {
  address:         `0x${string}`;
  owner:           `0x${string}`;
  principal:       bigint;
  monthlyDeposit:  bigint;
  age:             bigint;
  retirementAge:   bigint;
  desiredIncome:   bigint;
  paymentYears:    bigint;
  rateBps:         bigint;
  timelockYears:   bigint;
  protocolAddress: `0x${string}`;
  createdAt:       bigint;
  isRetired:       boolean;
}

export interface Protocol {
  address:   `0x${string}`;
  name:      string;
  apyBps:    number;   // basis points: 500 = 5%
  active:    boolean;
  tvl?:      bigint;
  verified?: boolean;
  risk?:     number;   // uint8: 0=low, 1=medium, 2=high
  category?: number;
}

// Calculator 

export interface CalculatorInput {
  desiredMonthlyIncome: number;
  paymentYears:         number;
  currentAge:           number;
  retirementAge:        number;
  apyPercent:           number;
  principal:            number;
}

export interface CalculatorResult {
  corpus:            number;
  monthlyGross:      number;
  monthlyNet:        number;
  totalDeposited:    number;
  estimatedFundVal:  number;
  yearsToRetirement: number;
  feePerMonth:       number;
  totalFees:         number;
  warnings:          string[];
}

// Wizard 

export type WizardStep = 1 | 2 | 3;
export interface WizardState {
  step:             WizardStep;
  calculator:       CalculatorInput;
  result:           CalculatorResult | null;
  selectedProtocol: Protocol | null;
  approved:         boolean;
  txHash:           `0x${string}` | null;
}

// i18n 

export type SupportedLocale = 'en' | 'es' | 'de' | 'it' | 'pt' | 'zh';

// Retirement plan 

export type {
  RetirementPlan,
  RetirementPlanData,
  RetirementPlanDerived,
  PlanValidationError,
  PlanValidationWarning,
} from './retirement_types';

export {
  FEE_BASIS_POINTS,
  BASIS_POINTS,
  PLAN_CONSTRAINTS,
  toUSDCWei,
  toInterestRateBps,
  calcFee,
  calcNet,
  initialDepositAmount,
  monthlyDepositAmount,
  requiredApprovalAmount,
  buildCreateFundArgs,
  derivePlanValues,
  validatePlan,
  isPlanValid,
  warnPlan,
  createEmptyPlan,
} from './retirement_types';

export type {
  TxStepStatus,
  UseUSDCTransactionProps,
  UseUSDCTransactionReturn,
} from './transaction_types';

export { TX_STEP_PROGRESS } from './transaction_types';

export type {
  Json,
  ContactRow,
  SurveyRow,
  FollowUpRow,
  Database,
} from './database';