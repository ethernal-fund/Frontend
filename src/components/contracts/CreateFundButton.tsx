import { isAddress as viemIsAddress } from 'viem';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export const validateAge = (age: number): ValidationResult => {
  if (!age || age < 18) {
    return { isValid: false, error: 'You must be at least 18 years old' };
  }
  if (age > 100) {
    return { isValid: false, error: 'Invalid age' };
  }
  return { isValid: true };
};

export const validateRetirementAge = (
  currentAge: number,
  retirementAge: number,
): ValidationResult => {
  if (retirementAge <= currentAge) {
    return {
      isValid: false,
      error: 'Retirement age must be greater than your current age',
    };
  }
  if (retirementAge - currentAge < 5) {
    return {
      isValid: false,
      error: 'You must have at least 5 years until retirement',
    };
  }
  if (retirementAge > 100) {
    return { isValid: false, error: 'Invalid retirement age' };
  }
  return { isValid: true };
};

export const validateAmount = (
  amount: number,
  min?: number,
  max?: number,
): ValidationResult => {
  if (isNaN(amount) || amount < 0) {
    return { isValid: false, error: 'Invalid amount' };
  }
  if (min !== undefined && amount < min) {
    return { isValid: false, error: `Minimum amount: $${min}` };
  }
  if (max !== undefined && amount > max) {
    return { isValid: false, error: `Maximum amount: $${max}` };
  }
  return { isValid: true };
};

export const validateInterestRate = (rate: number): ValidationResult => {
  if (isNaN(rate) || rate < 0) {
    return { isValid: false, error: 'Invalid rate' };
  }
  if (rate > 100) {
    return { isValid: false, error: 'Maximum rate: 100%' };
  }
  return { isValid: true };
};

export class ContractInputError extends Error {
  readonly field: string;

  constructor(field: string, message: string) {
    super(`Invalid ${field}: ${message}`);
    this.name  = 'ContractInputError';
    this.field = field;
  }
}

export const contractValidators = {
  address: (addr: string | undefined, fieldName = 'address'): void => {
    if (!addr) {
      throw new ContractInputError(fieldName, 'Address is required');
    }
    if (!viemIsAddress(addr)) {
      throw new ContractInputError(fieldName, 'Invalid Ethereum address format');
    }
    if (addr === '0x0000000000000000000000000000000000000000') {
      throw new ContractInputError(fieldName, 'Cannot use zero address');
    }
  },

  positiveAmount: (amount: bigint | undefined, fieldName = 'amount'): void => {
    if (amount === undefined) {
      throw new ContractInputError(fieldName, 'Amount is required');
    }
    if (amount <= 0n) {
      throw new ContractInputError(fieldName, 'Must be greater than 0');
    }
  },

  nonEmptyString: (str: string | undefined, fieldName = 'string'): void => {
    if (!str || str.trim().length === 0) {
      throw new ContractInputError(fieldName, 'Cannot be empty');
    }
  },

  stringLength: (
    str: string | undefined,
    min: number,
    max: number,
    fieldName = 'string',
  ): void => {
    contractValidators.nonEmptyString(str, fieldName);
    if (str!.length < min || str!.length > max) {
      throw new ContractInputError(
        fieldName,
        `Length must be between ${min} and ${max} characters (current: ${str!.length})`,
      );
    }
  },

  percentage: (value: bigint | number | undefined, fieldName = 'percentage'): void => {
    if (value === undefined) {
      throw new ContractInputError(fieldName, 'Percentage is required');
    }
    const numValue = typeof value === 'bigint' ? Number(value) : value;
    if (numValue < 0 || numValue > 100) {
      throw new ContractInputError(fieldName, 'Must be between 0 and 100');
    }
  },
};

export const safeValidators = {
  address: (addr: string | undefined): ValidationResult => {
    try {
      contractValidators.address(addr);
      return { isValid: true };
    } catch (err) {
      if (err instanceof ContractInputError) {
        return { isValid: false, error: err.message };
      }
      return { isValid: false, error: 'Invalid address' };
    }
  },

  positiveAmount: (amount: bigint | undefined): ValidationResult => {
    try {
      contractValidators.positiveAmount(amount);
      return { isValid: true };
    } catch (err) {
      if (err instanceof ContractInputError) {
        return { isValid: false, error: err.message };
      }
      return { isValid: false, error: 'Invalid amount' };
    }
  },

  proposalTitle: (title: string | undefined): ValidationResult => {
    try {
      contractValidators.stringLength(title, 5, 200, 'proposal title');
      return { isValid: true };
    } catch (err) {
      if (err instanceof ContractInputError) {
        return { isValid: false, error: err.message };
      }
      return { isValid: false, error: 'Invalid title' };
    }
  },

  proposalDescription: (description: string | undefined): ValidationResult => {
    try {
      contractValidators.stringLength(description, 20, 5000, 'proposal description');
      return { isValid: true };
    } catch (err) {
      if (err instanceof ContractInputError) {
        return { isValid: false, error: err.message };
      }
      return { isValid: false, error: 'Invalid description' };
    }
  },
};

export function validateAll(
  validations: Array<() => void>,
): { isValid: boolean; errors: ContractInputError[] } {
  const errors: ContractInputError[] = [];
  for (const validate of validations) {
    try {
      validate();
    } catch (err) {
      if (err instanceof ContractInputError) {
        errors.push(err);
      } else {
        throw err;
      }
    }
  }
  return { isValid: errors.length === 0, errors };
}

export function isContractInputError(err: unknown): err is ContractInputError {
  return err instanceof ContractInputError;
}