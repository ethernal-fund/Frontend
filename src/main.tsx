import { StrictMode }                from 'react';
import { createRoot }               from 'react-dom/client';
import { QueryClientProvider }      from '@tanstack/react-query';
import * as Sentry                  from '@sentry/react';
import { SpeedInsights }            from '@vercel/speed-insights/react';

import { Web3Provider }             from '@/config/web3';
import { RetirementProvider }       from '@/components/context/RetirementContext';
import AppRouter                    from '@/router';
import ErrorBoundary                from '@/router/ErrorBoundary';
import ToastContainer               from '@/components/common/ToastContainer';
import { queryClient }              from '@/lib/queryClient';

import '@/i18n/config';
import '@/index.css';

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn:                      import.meta.env.VITE_SENTRY_DSN,
    environment:              import.meta.env.MODE,
    release:                  import.meta.env.VITE_APP_VERSION,
    tracesSampleRate:         import.meta.env.PROD ? 0.2 : 1.0,
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: import.meta.env.PROD ? 0.05 : 0,
    ignoreErrors: [
      'User rejected the request',
      'user rejected',
      'MetaMask',
      'Non-Error promise rejection',
    ],
  });
}

const container = document.getElementById('root');

if (!container) {
  throw new Error(
    '[main.tsx] Root element #root not found. ' +
    'Make sure index.html contains <div id="root"></div>.',
  );
}

const topLevelFallback = (
  <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 text-center">
    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
      <span className="text-4xl">⚠️</span>
    </div>
    <h1 className="text-2xl font-bold text-gray-800 mb-2">
      Something went wrong
    </h1>
    <p className="text-gray-500 mb-6 max-w-md text-sm">
      An unexpected error occurred. Please try reloading the page.
    </p>
    <button
      onClick={() => window.location.reload()}
      className="px-6 py-3 bg-forest-green text-white rounded-lg font-semibold hover:opacity-90 transition"
    >
      Reload
    </button>
  </div>
);

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary fallback={topLevelFallback}>
      <QueryClientProvider client={queryClient}>
        <Web3Provider>
          <RetirementProvider>
            <AppRouter />
            <ToastContainer />
            <SpeedInsights />
          </RetirementProvider>
        </Web3Provider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);