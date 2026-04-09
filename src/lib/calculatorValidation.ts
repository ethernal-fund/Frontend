import type { CalculatorInput } from '@/types';

export function validateCalcInputs(inputs: CalculatorInput): string | null {
  const yearsToRet = inputs.retirementAge - inputs.currentAge;

  if (inputs.currentAge < 18 || inputs.currentAge > 80)
    return 'Current age must be 18–80';
  if (inputs.retirementAge < 55)
    return 'Retirement age must be at least 55';
  if (inputs.retirementAge <= inputs.currentAge)
    return 'Retirement age must be greater than current age';
  if (yearsToRet < 15)
    return 'At least 15 years required until retirement';
  if (inputs.desiredMonthlyIncome <= 0)        
    return 'Desired monthly income must be greater than 0';
  if (inputs.principal > 100_000)
    return 'Principal cannot exceed 100,000 USDC';
  if (inputs.apyPercent < 0 || inputs.apyPercent > 100) 
    return 'Expected annual return must be between 0 and 100%';
  if (inputs.paymentYears <= 0)                 
    return 'Years receiving payments must be greater than 0';

  return null;
}