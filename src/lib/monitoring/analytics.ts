import env from '@/lib/env';

type Properties = Record<string, string | number | boolean | null | undefined>;

const enabled = env.features.analytics && env.isProd;

export const analytics = {
  init() {
    if (env.isDev) {
      console.log('[analytics] Stub mode — PostHog not installed');
    }
    // After install PostHog:
    // import posthog from 'posthog-js';
    // posthog.init(env.postHogKey, { api_host: 'https://app.posthog.com' });
  },

  track(event: string, properties?: Properties) {
    if (!enabled) {
      if (env.isDev) console.log('[analytics] track:', event, properties);
      return;
    }
    // posthog.capture(event, properties);
  },

  identify(userAddress: string) {
    if (!enabled) {
      if (env.isDev) console.log('[analytics] identify:', userAddress);
      return;
    }
    // posthog.identify(userAddress);
  },

  reset() {
    if (!enabled) return;
    // posthog.reset();
  },

  trackWalletConnected(address: string, chainId: number) {
    this.track('wallet_connected', { address, chainId });
  },

  trackWalletDisconnected() {
    this.track('wallet_disconnected');
  },

  trackContractCreated(contractAddress: string, amount: number) {
    this.track('contract_created', { contractAddress, amount });
  },

  trackDeposit(amount: number, protocol: string) {
    this.track('deposit', { amount, protocol });
  },

  trackWithdraw(amount: number, protocol: string) {
    this.track('withdraw', { amount, protocol });
  },

  trackPageView(path: string) {
    this.track('page_view', { path });
  },

  trackError(errorName: string, context?: Properties) {
    this.track('client_error', { errorName, ...context });
  },
};