/** Fee charged by the protocol on every deposit (5%). */
export const DEPOSIT_FEE = 0.05 as const;

/** Minimum monthly USDC deposit accepted by the factory. */
export const MIN_MONTHLY_USDC = 50 as const;

/** Maximum one-time principal accepted by the factory. */
export const MAX_PRINCIPAL_USDC = 100_000 as const;

/** Default timelock duration in years. */
export const DEFAULT_TIMELOCK_YEARS = 15 as const;