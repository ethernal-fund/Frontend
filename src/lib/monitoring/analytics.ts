import env from '@/lib/env';

// Types

type Properties = Record<string, string | number | boolean | null | undefined>;
type AmountRange = '<100' | '100-1k' | '1k-10k' | '>10k';

// Helpers 

/**
 * Convert an exact amount to a range bucket.
 * Analytics should know *scale*, not exact balances.
 */
function toAmountRange(amount: number): AmountRange {
  if (amount < 100)    return '<100';
  if (amount < 1_000)  return '100-1k';
  if (amount < 10_000) return '1k-10k';
  return '>10k';
}

/**
 * Hash a wallet address to a consistent anonymous ID.
 * - Deterministic: same address → same ID across sessions
 * - Non-reversible: PostHog never sees the real address
 * - Useful: errors/events from the same user are still grouped
 */
async function hashAddress(address: string): Promise<string> {
  const bytes  = new TextEncoder().encode(address.toLowerCase());
  const buffer = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16); // 16 hex chars — enough entropy, not a full hash leak
}

// State 

const enabled = env.features.analytics && env.isProd;

// Analytics 

export const analytics = {

  // Lifecycle 

  init(): void {
    if (env.isDev) {
      console.log('[analytics] Stub mode — PostHog not installed');
      return;
    }
    // TODO: install posthog-js and uncomment:
    // import posthog from 'posthog-js';
    // posthog.init(env.postHogKey, {
    //   api_host:              'https://app.posthog.com',
    //   capture_pageview:      false,  // we call trackPageView manually
    //   capture_pageleave:     true,
    //   autocapture:           false,  // DeFi app — no blind autocapture
    //   session_recording: {
    //     maskAllInputs:  true,        // never record form inputs
    //     maskTextSelector: '*',       // mask all text — balances, amounts
    //   },
    // });
  },

  reset(): void {
    if (!enabled) return;
    // posthog.reset();
  },

  // Core 

  track(event: string, properties?: Properties): void {
    if (!enabled) {
      if (env.isDev) console.log('[analytics] track:', event, properties);
      return;
    }
    // posthog.capture(event, properties);
  },

  /**
   * Identify the current user with an anonymous ID derived from their wallet.
   * Never sends the raw address to PostHog.
   */
  identify(address: string): void {
    if (!enabled) {
      if (env.isDev) console.log('[analytics] identify: [address hashed]');
      return;
    }
    void hashAddress(address).then(userId => {
      // posthog.identify(userId);
      void userId; // remove this line after PostHog is installed
    });
  },

  // Wallet 

  trackWalletConnected(address: string, chainId: number): void {
    this.track('wallet_connected', {
      // Only the prefix — enough to debug wallet type (Coinbase 0x71C…, etc.)
      // without identifying the user. Never send the full address.
      address_prefix: address.slice(0, 6),
      chainId,
    });
    this.identify(address);
  },

  trackWalletDisconnected(): void {
    this.track('wallet_disconnected');
    this.reset();
  },

  trackWalletNetworkChanged(fromChainId: number, toChainId: number): void {
    this.track('wallet_network_changed', { fromChainId, toChainId });
  },

  // Fund lifecycle 

  /**
   * Fired when the user deploys their PersonalFund contract.
   * Does NOT send the contract address — it's linkeable on-chain to the user.
   */
  trackFundCreated(initialDepositRange: AmountRange): void {
    this.track('fund_created', { initial_deposit_range: initialDepositRange });
  },

  trackDeposit(amount: number, protocol: string): void {
    this.track('deposit', {
      amount_range: toAmountRange(amount),
      protocol,
    });
  },

  trackWithdraw(amount: number, protocol: string, isEarlyWithdrawal: boolean): void {
    this.track('withdraw', {
      amount_range:        toAmountRange(amount),
      protocol,
      is_early_withdrawal: isEarlyWithdrawal,
    });
  },

  trackRetirementClaimed(): void {
    // No amount — this is a high-value event and amounts would be too sensitive
    this.track('retirement_claimed');
  },

  // UX / Navigation

  trackPageView(path: string): void {
    // Sanitize path — remove any dynamic segments that could contain addresses
    // e.g. /fund/0xABCD...1234 → /fund/[address]
    const sanitized = path.replace(/0x[a-fA-F0-9]{10,}/g, '[address]');
    this.track('page_view', { path: sanitized });
  },

  trackOnboardingStep(step: 'connect_wallet' | 'create_fund' | 'first_deposit' | 'complete'): void {
    this.track('onboarding_step', { step });
  },

  trackModalOpened(modal: string): void {
    this.track('modal_opened', { modal });
  },

  // Errors 

  /**
   * Track frontend errors that aren't automatically caught by Sentry.
   * Use for expected error states (e.g. insufficient balance, unsupported chain)
   * that are UX signals, not bugs.
   */
  trackError(errorName: string, context?: Properties): void {
    this.track('client_error', { error_name: errorName, ...context });
  },

  trackContractError(action: string, errorCode?: string): void {
    this.track('contract_error', {
      action,
      // error_code from the contract revert — not the full message
      ...(errorCode ? { error_code: errorCode } : {}),
    });
  },
};