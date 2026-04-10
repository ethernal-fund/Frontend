import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import { SpeedInsights } from "@vercel/speed-insights/react";

import { Web3Provider }       from '@/config/web3';
import { RetirementProvider } from '@/components/context/RetirementContext';
import AppRouter              from '@/router';

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
  });
}

const container = document.getElementById('root');

if (!container) {
  throw new Error(
    '[main.tsx] Root element #root not found. ' +
    'Make sure index.html contains <div id="root"></div>.'
  );
}

createRoot(container).render(
  <StrictMode>
    <Web3Provider>
      <RetirementProvider>
        <AppRouter />
      </RetirementProvider>
    </Web3Provider>
  </StrictMode>,
);