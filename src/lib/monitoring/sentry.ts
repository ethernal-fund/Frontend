import * as Sentry from '@sentry/react';
import env from '@/lib/env';

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const WALLET_ERRORS = [
  'User rejected',
  'user rejected',
  'User denied',
  'user denied',
  'MetaMask Tx Signature: User denied',
  'WalletConnect',
  'connector not connected',
  'No provider',
];

const RPC_ERRORS = [
  'network changed',
  'underlying network changed',
  'could not detect network',
  'timeout',
  'rate limit',
  'rate_limit',
  '429',
];

if (dsn && env.isProd) {
  Sentry.init({
    dsn,
    environment: env.env,
    release: import.meta.env.VITE_APP_VERSION as string | undefined,

    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        // Mask all text/inputs by default — important for wallet addresses
        maskAllText:    true,
        blockAllMedia:  false,
      }),
    ],

    // Only trace requests to your own backend — NOT to Alchemy/Infura/WalletConnect.
    // Without this, Sentry injects trace headers into 3rd-party requests → CORS errors.
    tracePropagationTargets: [
      /^https:\/\/api\.ethernal\.fund/,
      /^http:\/\/localhost/,
    ],

    tracesSampleRate:          env.isStaging ? 1.0 : 0.1,
    replaysSessionSampleRate:  0.05,
    replaysOnErrorSampleRate:  1.0,

    beforeSend(event, hint) {
      const message =
        event.message ??
        (hint?.originalException instanceof Error
          ? hint.originalException.message
          : String(hint?.originalException ?? ''));

      // Drop wallet rejection errors — expected user behavior, not bugs
      if (WALLET_ERRORS.some(phrase => message.includes(phrase))) return null;
      if (RPC_ERRORS.some(phrase => message.toLowerCase().includes(phrase.toLowerCase()))) return null;

      return event;
    },

    beforeSendTransaction(event) {
      // Drop transactions with no meaningful duration
      if ((event.timestamp ?? 0) - (event.start_timestamp ?? 0) < 0.001) return null;
      return event;
    },
  });

  if (env.isDev) {
    console.log('[sentry] Initialized —', env.env);
  }
} else if (!dsn && env.isProd) {
  console.warn('[sentry] VITE_SENTRY_DSN not set — error tracking disabled in production.');
}

export const sentrySetUser = (address: string) => {
  Sentry.setUser({ id: address });
};

export const sentryClearUser = () => {
  Sentry.setUser(null);
};

export const sentryCapture = (error: unknown, context?: Record<string, unknown>) => {
  if (!dsn || !env.isProd) {
    console.error('[sentry] captured:', error, context);
    return;
  }
  Sentry.withScope(scope => {
    if (context) scope.setExtras(context);
    Sentry.captureException(error);
  });
};

export { Sentry };