// Fee charged by the protocol on every deposit (5%). 
export const DEPOSIT_FEE = 0.05 as const;

// Minimum monthly USDC deposit accepted by the factory. 
export const MIN_MONTHLY_USDC = 50 as const;

// Maximum one-time principal accepted by the factory. 
export const MAX_PRINCIPAL_USDC = 100_000 as const;

// Default timelock duration in years. 
export const DEFAULT_TIMELOCK_YEARS = 15 as const;

// Protocol Fees: 
// MAX_FEE_BPS es el techo que se pasa como _maxFeeBP en depositMonthly,
// depositExtra y createPersonalFund.
// No es el fee actual del Treasury — es el máximo que el protocolo acepta
// por especificación de producto (5% fijo).
// Si el fee on-chain supera este valor el contrato revierte intencionalmente
// como protección al usuario.

export const MAX_FEE_BPS = 500n as const;  // 5% = 500 basis points