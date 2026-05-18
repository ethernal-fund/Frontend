/**
 * Gnosis Safe integration config.
 *
 * SETUP CHECKLIST
 * ───────────────
 * 1. Go to https://app.safe.global and create a Safe on Arbitrum Sepolia
 *    (or Arbitrum One for mainnet).
 * 2. Add all team member wallets as owners. Set your desired threshold (e.g. 2-of-3).
 * 3. In your contracts, call  factory.transferAdmin(safeAddress)  to hand
 *    ownership from the old EOA to the Safe.
 * 4. That's it — this file has no hardcoded address; the Safe address is
 *    read on-chain from factory.admin(), so it's always in sync.
 *
 * Full Safe ABI: https://github.com/safe-global/safe-contracts
 */

// Minimal ABI — only the view functions we call 
export const SAFE_ABI = [
  {
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'isOwner',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getOwners',
    outputs: [{ name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getThreshold',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Chain prefixes used in app.safe.global URLs 
// Full list: https://github.com/safe-global/safe-deployments
const SAFE_CHAIN_PREFIX: Record<number, string> = {
  1:        'eth',      // Ethereum Mainnet
  42161:    'arb1',     // Arbitrum One
  421614:   'arb-sep',  // Arbitrum Sepolia
  11155111: 'sep',      // Ethereum Sepolia
};

function getPrefix(chainId: number): string {
  return SAFE_CHAIN_PREFIX[chainId] ?? 'eth';
}

/** Opens the Safe home (Assets tab) in app.safe.global */
export function getSafeAppUrl(safeAddress: string, chainId: number): string {
  return `https://app.safe.global/home?safe=${getPrefix(chainId)}:${safeAddress}`;
}

/** Opens the Safe transaction queue — useful for proposing / signing txs */
export function getSafeTxQueueUrl(safeAddress: string, chainId: number): string {
  return `https://app.safe.global/transactions/queue?safe=${getPrefix(chainId)}:${safeAddress}`;
}