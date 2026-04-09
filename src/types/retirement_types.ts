import { parseUnits, type Address } from 'viem';

export const FEE_BASIS_POINTS = 500n;
export const BASIS_POINTS     = 10_000n;
export const PLAN_CONSTRAINTS = {
  minPrincipal:         0n,                 
  maxPrincipal:         parseUnits('100000', 6),
  minMonthlyDeposit:    parseUnits('50', 6),
  minAge:               18n,
  maxAge:               80n,
  minRetirementAge:     55n,
  minYearsToRetire:     0n,
  minTimelockYears:     15n,
  maxTimelockYears:     50n,
  defaultTimelockYears: 15n,
  maxInterestRateBps:   10_000n,
  minYearsPayments:     1n,
  maxYearsPayments:     50n,
} as const;

export interface RetirementPlan {
  principal:            number;
  monthlyDeposit:       number;
  desiredMonthlyIncome: number;
  currentAge:           number;
  retirementAge:        number;
  yearsPayments:        number;
  interestRate:         number;
  timelockYears:        number;
  selectedProtocol?:    Address | null;
}

export type RetirementPlanData = RetirementPlan;
export interface RetirementPlanDerived {
  initialDepositUsdc:  number;
  feeUsdc:             number;
  netToFundUsdc:       number;
  monthlyDepositUsdc:  number;
  interestRateBps:     number;
  yearsToRetirement:   number;
}

export interface PlanValidationError {
  field:   keyof RetirementPlan | 'initialDeposit';
  message: string;
}

const ZERO_ADDRESS: Address = '0x0000000000000000000000000000000000000000';

export function toUSDCWei(amount: number): bigint {
  return parseUnits(amount.toString(), 6);
}

export function toInterestRateBps(ratePercent: number): bigint {
  return BigInt(Math.round(ratePercent * 100));
}

export function calcFee(grossWei: bigint): bigint {
  return (grossWei * FEE_BASIS_POINTS) / BASIS_POINTS;
}

export function calcNet(grossWei: bigint): bigint {
  return grossWei - calcFee(grossWei);
}

export function initialDepositAmount(plan: RetirementPlan): bigint {
  return toUSDCWei(plan.principal) + toUSDCWei(plan.monthlyDeposit);
}

export function monthlyDepositAmount(plan: RetirementPlan): bigint {
  return toUSDCWei(plan.monthlyDeposit);
}

export function requiredApprovalAmount(plan: RetirementPlan): bigint {
  return initialDepositAmount(plan); 
}

export function buildCreateFundArgs(plan: RetirementPlan): readonly [
  bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, Address,
] {
  const timelock = plan.timelockYears === 0
    ? Number(PLAN_CONSTRAINTS.defaultTimelockYears)
    : plan.timelockYears;

  return [
    toUSDCWei(plan.principal),
    toUSDCWei(plan.monthlyDeposit),
    BigInt(plan.currentAge),
    BigInt(plan.retirementAge),
    toUSDCWei(plan.desiredMonthlyIncome),
    BigInt(plan.yearsPayments),
    toInterestRateBps(plan.interestRate),
    BigInt(timelock),
    (plan.selectedProtocol ?? ZERO_ADDRESS),
  ] as const;
}

export function derivePlanValues(plan: RetirementPlan): RetirementPlanDerived {
  const depositWei = initialDepositAmount(plan); // principal + monthlyDeposit
  const feeWei     = calcFee(depositWei);        // 5% → va al Treasury (se cobra dentro del fondo)
  const netWei     = depositWei - feeWei;        // neto → entra al fondo 
  const toUsdc     = (wei: bigint) => Number(wei) / 1_000_000;

  return {
    initialDepositUsdc: toUsdc(depositWei),
    feeUsdc:            toUsdc(feeWei),
    netToFundUsdc:      toUsdc(netWei),
    monthlyDepositUsdc: plan.monthlyDeposit,
    interestRateBps:    Math.round(plan.interestRate * 100),
    yearsToRetirement:  plan.retirementAge - plan.currentAge,
  };
}

export function validatePlan(plan: RetirementPlan): PlanValidationError[] {
  const errors: PlanValidationError[] = [];
  const c = PLAN_CONSTRAINTS;
  const principalWei      = toUSDCWei(plan.principal);
  const monthlyWei        = toUSDCWei(plan.monthlyDeposit);
  const desiredMonthlyWei = toUSDCWei(plan.desiredMonthlyIncome);

  if (principalWei > c.maxPrincipal)
    errors.push({ field: 'principal', message: `Principal cannot exceed ${Number(c.maxPrincipal) / 1_000_000} USDC` });
  if (monthlyWei < c.minMonthlyDeposit)
    errors.push({ field: 'monthlyDeposit', message: `Monthly deposit must be at least ${Number(c.minMonthlyDeposit) / 1_000_000} USDC` });
  if (principalWei + monthlyWei === 0n)
    errors.push({ field: 'initialDeposit', message: 'Initial deposit (principal + monthly) must be greater than 0' });
  if (BigInt(plan.currentAge) < c.minAge)
    errors.push({ field: 'currentAge', message: `Current age must be at least ${c.minAge}` });
  if (BigInt(plan.currentAge) > c.maxAge)
    errors.push({ field: 'currentAge', message: `Current age cannot exceed ${c.maxAge}` });
  if (BigInt(plan.retirementAge) < c.minRetirementAge)
    errors.push({ field: 'retirementAge', message: `Retirement age must be at least ${c.minRetirementAge}` });
  if (plan.retirementAge <= plan.currentAge)
    errors.push({ field: 'retirementAge', message: 'Retirement age must be greater than current age' });
  if (desiredMonthlyWei === 0n)
    errors.push({ field: 'desiredMonthlyIncome', message: 'Desired monthly income must be greater than 0' });
  if (BigInt(plan.yearsPayments) < c.minYearsPayments)
    errors.push({ field: 'yearsPayments', message: `Years of payments must be at least ${c.minYearsPayments}` });
  if (BigInt(plan.yearsPayments) > c.maxYearsPayments)
    errors.push({ field: 'yearsPayments', message: `Years of payments cannot exceed ${c.maxYearsPayments}` });

  const rateBps = toInterestRateBps(plan.interestRate);
  if (rateBps < 0n)
    errors.push({ field: 'interestRate', message: 'Interest rate cannot be negative' });
  if (rateBps > c.maxInterestRateBps)
    errors.push({ field: 'interestRate', message: 'Interest rate cannot exceed 100%' });

  const timelock = plan.timelockYears === 0
    ? c.defaultTimelockYears
    : BigInt(plan.timelockYears);
  if (timelock < c.minTimelockYears)
    errors.push({ field: 'timelockYears', message: `Timelock must be at least ${c.minTimelockYears} years` });
  if (timelock > c.maxTimelockYears)
    errors.push({ field: 'timelockYears', message: `Timelock cannot exceed ${c.maxTimelockYears} years` });

  return errors;
}

export function isPlanValid(plan: RetirementPlan): boolean {
  return validatePlan(plan).length === 0;
}

export interface PlanValidationWarning {
  field:   keyof RetirementPlan | 'initialDeposit';
  message: string;
}

export function warnPlan(plan: RetirementPlan): PlanValidationWarning[] {
  const warnings: PlanValidationWarning[] = [];

  if (plan.principal === 0) {
    warnings.push({
      field:   'principal',
      message: 'Sin capital inicial — tu fondo arranca solo con el depósito mensual.',
    });
  }

  return warnings;
}

export function createEmptyPlan(): RetirementPlan {
  return {
    principal:            0,
    monthlyDeposit:       0,
    desiredMonthlyIncome: 0,
    currentAge:           30,
    retirementAge:        65,
    yearsPayments:        20,
    interestRate:         7,
    timelockYears:        15,
    selectedProtocol:     null,
  };
}