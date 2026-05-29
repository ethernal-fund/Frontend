import * as Sentry from '@sentry/react';
import type { Breadcrumb, ErrorEvent, EventHint } from '@sentry/react';
import env from '@/lib/env';

// ─── Constants ────────────────────────────────────────────────────────────────

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

/** Expected user actions — not bugs, must not create alerts. */
const WALLET_REJECTION_PATTERNS: (string | RegExp)[] = [
  'User rejected',
  'user rejected',
  'User denied',
  'user denied',
  'MetaMask Tx Signature: User denied',
  'connector not connected',
  'No provider',
];

/** Transient network noise — not actionable. */
const TRANSIENT_NETWORK_PATTERNS: (string | RegExp)[] = [
  /network changed/i,
  /underlying network changed/i,
  /could not detect network/i,
  /rate.?limit/i,
  /\b429\b/,
  /timeout/i,
  /WalletConnect/i,
];

// ─── Scrubbing ────────────────────────────────────────────────────────────────

// Order matters: match longer hex strings first to avoid partial replacements.
const PRIVKEY_RE     = /0x[a-fA-F0-9]{63,}/g;
const TX_HASH_RE     = /0x[a-fA-F0-9]{64}/g;
const ETH_ADDRESS_RE = /0x[a-fA-F0-9]{40}/g;

function scrubString(str: string): string {
  return str
    .replace(PRIVKEY_RE,     '[redacted]')
    .replace(TX_HASH_RE,     '[txhash]')
    .replace(ETH_ADDRESS_RE, '[address]');
}

/**
 * Remove Web3 sensitive data from a Sentry ErrorEvent before it leaves the browser.
 *
 * In @sentry/react v10, event.breadcrumbs is Breadcrumb[] directly —
 * the legacy { values: Breadcrumb[] } shape no longer exists.
 */
function scrubEvent(event: ErrorEvent): ErrorEvent {
  if (event.exception?.values) {
    event.exception.values = event.exception.values.map(ex => ({
      ...ex,
      value: ex.value ? scrubString(ex.value) : ex.value,
    }));
  }

  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((crumb: Breadcrumb): Breadcrumb => ({
      ...crumb,
      message: crumb.message ? scrubString(crumb.message) : crumb.message,
    }));
  }

  if (event.message) {
    event.message = scrubString(event.message);
  }

  return event;
}

// ─── Init ─────────────────────────────────────────────────────────────────────

if (dsn && (env.isProd || env.isStaging)) {
  Sentry.init({
    dsn,
    environment: env.env,
    release: import.meta.env.VITE_APP_VERSION as string | undefined,

    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText:   true,
        maskAllInputs: true,
        blockAllMedia: true,
      }),
    ],

    // Only propagate trace headers to our own backends.
    // Without this, Sentry injects sentry-trace headers into RPC/WalletConnect
    // requests, which causes CORS errors on third-party infrastructure.
    tracePropagationTargets: [
      /^https:\/\/api\.ethernal\.fund/,
      /^http:\/\/localhost/,
    ],

    // ignoreErrors is evaluated before the event is fully built —
    // more efficient than filtering in beforeSend for known string/regex patterns.
    ignoreErrors: [
      ...WALLET_REJECTION_PATTERNS,
      ...TRANSIENT_NETWORK_PATTERNS,
      /chrome-extension/,
      /moz-extension/,
    ],

    tracesSampleRate:         env.isStaging ? 1.0 : 0.1,
    replaysSessionSampleRate: 0,    // never record normal sessions in a financial app
    replaysOnErrorSampleRate: 1.0,  // always capture replay context on errors

    beforeSend(event: ErrorEvent, hint: EventHint): ErrorEvent | null {
      void hint;

      // Secondary extension check via stack frames —
      // ignoreErrors matches filenames but misses some injection patterns.
      const frames = event.exception?.values?.[0]?.stacktrace?.frames ?? [];
      const isExtension = frames.some(
        f =>
          f.filename?.includes('chrome-extension') ||
          f.filename?.includes('moz-extension'),
      );
      if (isExtension) return null;

      // Drop empty events — no message and no stack trace, not actionable.
      const hasMessage = Boolean(event.message);
      const hasStack   = Boolean(event.exception?.values?.[0]?.stacktrace?.frames?.length);
      if (!hasMessage && !hasStack) return null;

      return scrubEvent(event);
    },

    // TransactionEvent is not exported from @sentry/react v10.
    // The event parameter is typed as the base Event here — still fully typesafe.
    beforeSendTransaction(event) {
      // Drop trivial transactions (< 1ms) — no meaningful performance signal.
      if ((event.timestamp ?? 0) - (event.start_timestamp ?? 0) < 0.001) return null;
      return event;
    },
  });
}

if (!dsn && env.isProd) {
  console.warn('[sentry] VITE_SENTRY_DSN not set — error tracking disabled in production.');
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Associate the connected wallet with subsequent Sentry events.
 * Truncated address — useful for grouping errors by user without
 * exposing the full address or enabling on-chain cross-referencing.
 */
export const sentrySetUser = (address: string): void => {
  Sentry.setUser({
    id: `${address.slice(0, 6)}...${address.slice(-4)}`,
  });
};

export const sentryClearUser = (): void => {
  Sentry.setUser(null);
};

/**
 * Manually capture an exception with optional extra context.
 * For caught errors that are still worth tracking — e.g. unexpected
 * contract revert reasons, failed Supabase writes, RPC fallback failures.
 */
export const sentryCapture = (
  error: unknown,
  context?: Record<string, unknown>,
): void => {
  if (!dsn || (!env.isProd && !env.isStaging)) {
    console.error('[sentry] captured:', error, context);
    return;
  }
  Sentry.withScope(scope => {
    if (context) scope.setExtras(context);
    Sentry.captureException(error);
  });
};