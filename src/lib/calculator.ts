import type { CalculatorInput, CalculatorResult } from '@/types';
import { DEPOSIT_FEE, MIN_MONTHLY_USDC } from '@/config/constants';

export function calculate(input: CalculatorInput): CalculatorResult {
  const {
    desiredMonthlyIncome,
    paymentYears,
    currentAge,
    retirementAge,
    apyPercent,
    principal,
  } = input;

  const warnings: string[]    = [];
  const yearsToRetirement     = retirementAge - currentAge;
  const N                     = yearsToRetirement * 12;   // accumulation months
  const r                     = apyPercent / 100 / 12;    // monthly rate
  const netRate               = 1 - DEPOSIT_FEE;
  const Npay                  = paymentYears * 12;

  const corpus =
    r === 0
      ? desiredMonthlyIncome * Npay
      : desiredMonthlyIncome * (1 - Math.pow(1 + r, -Npay)) / r;

  const principalNet = principal * netRate;
  const fvFactor     = r === 0 ? 1 : Math.pow(1 + r, N);
  const pmtNetRaw    =
    r === 0
      ? (corpus - principalNet) / N
      : (corpus - principalNet * fvFactor) * r / (fvFactor - 1);

  const pmtGross     = Math.max(pmtNetRaw / netRate, MIN_MONTHLY_USDC);
  const pmtNet       = pmtGross * netRate;

  const estimatedFundVal =
    r === 0
      ? principalNet + pmtNet * N
      : principalNet * fvFactor + pmtNet * (fvFactor - 1) / r;

  const feePerMonth    = pmtGross * DEPOSIT_FEE;
  const totalFees      = feePerMonth * N + principal * DEPOSIT_FEE;
  const totalDeposited = principal + pmtGross * N;

  if (pmtGross > 100_000)
    warnings.push('Monthly deposit exceeds $100,000 — consider a higher APY, longer accumulation, or lower desired income.');
  if (yearsToRetirement < 20)
    warnings.push('Less than 20 years to retirement — projections are aggressive.');

  return {
    corpus,
    monthlyGross:     pmtGross,
    monthlyNet:       pmtNet,
    totalDeposited,
    estimatedFundVal,
    yearsToRetirement,
    feePerMonth,
    totalFees,
    warnings,
  };
}

export interface ChartPoint { year: number; balance: number }
export function calcChartData(
  input: CalculatorInput,
  monthlyGross: number,
): ChartPoint[] {
  const { currentAge, retirementAge, apyPercent, principal } = input;
  const r          = apyPercent / 100 / 12;
  const netRate    = 1 - DEPOSIT_FEE;
  const pmtNet     = monthlyGross * netRate;
  const yearsToRet = retirementAge - currentAge;

  const points: ChartPoint[] = [];
  let balance = principal * netRate;

  for (let year = 0; year <= yearsToRet; year++) {
    points.push({ year: currentAge + year, balance: Math.round(balance) });
    for (let m = 0; m < 12; m++) {
      balance = balance * (1 + r) + pmtNet;
    }
  }
  return points;
}

export function calcResult(input: CalculatorInput): {
  result:    CalculatorResult;
  chartData: ChartPoint[];
} | null {
  const { currentAge, retirementAge, desiredMonthlyIncome, paymentYears } = input;
  const yearsToRet = retirementAge - currentAge;

  if (
    yearsToRet < 15 ||
    retirementAge < 55 ||
    desiredMonthlyIncome <= 0 ||
    paymentYears <= 0
  ) return null;

  const result    = calculate(input);
  const chartData = calcChartData(input, result.monthlyGross);
  return { result, chartData };
}

export function fmtUsdc(value: number, decimals = 2): string {
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} USDC`;
}

export function fmtUsdcBigInt(value: bigint, decimals = 2): string {
  return fmtUsdc(Number(value) / 1e6, decimals);
}

export function toUsdcBigInt(value: number): bigint {
  return BigInt(Math.round(value * 1e6));
}