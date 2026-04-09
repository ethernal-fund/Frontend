export const formatCurrency = (n: number, decimals = 2): string =>
  `$${n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;