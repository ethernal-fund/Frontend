type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';
type AppEnv   = 'development' | 'staging' | 'production' | 'test';

export interface AppConfig {
  env:       AppEnv;
  isDev:     boolean;
  isProd:    boolean;
  isStaging: boolean;
  logLevel:  LogLevel;

  apiUrl:    string;
  faucetUrl: string;

  walletConnectProjectId: string;
  alchemyApiKey:          string;
  infuraApiKey:           string;
  chainId:                number;
  networkName:            string;
  explorerUrl:            string;

  supabaseUrl:     string;
  supabaseAnonKey: string;

  contracts: {
    personalFundFactory: string;
    personalFund:        string;
    treasury:            string;
    protocolRegistry:    string;
    userPreferences:     string;
    dateTime:            string;
    usdc:                string;
  };

  features: {
    analytics:    boolean;
    debug:        boolean;
    faucet:       boolean;
    experimental: boolean;
    mocks:        boolean;
  };
}

function read(key: string, fallback = ''): string {
  const val = (import.meta.env as Record<string, string | undefined>)[key];
  return val && val.trim() !== '' ? val.trim() : fallback;
}

function bool(key: string, fallback = false): boolean {
  const val = read(key, '');
  if (val === '') return fallback;
  return val === 'true' || val === '1';
}

function num(key: string, fallback: number): number {
  const parsed = parseInt(read(key, ''), 10);
  return isNaN(parsed) ? fallback : parsed;
}

function required(key: string, description: string): string {
  const val = read(key, '');
  if (!val) {
    const msg = `[env] Missing required variable: ${key} — ${description}`;
    if (import.meta.env.PROD) {
      throw new Error(msg);
    }
    console.error(msg);
  }
  return val;
}

const appEnvRaw  = read('VITE_ENV', import.meta.env.DEV ? 'development' : 'production');
const validEnvs: AppEnv[] = ['development', 'staging', 'production', 'test'];
const appEnv: AppEnv = validEnvs.includes(appEnvRaw as AppEnv)
  ? (appEnvRaw as AppEnv)
  : 'production';

const logLevelRaw = read('VITE_LOG_LEVEL', import.meta.env.DEV ? 'debug' : 'warn');
const validLevels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'silent'];
const logLevel: LogLevel = validLevels.includes(logLevelRaw as LogLevel)
  ? (logLevelRaw as LogLevel)
  : 'warn';

export const env: Readonly<AppConfig> = Object.freeze({
  env:       appEnv,
  isDev:     import.meta.env.DEV,
  isProd:    import.meta.env.PROD,
  isStaging: appEnv === 'staging',
  logLevel,

  apiUrl:    required('VITE_API_URL', 'Backend API base URL (e.g. https://api.ethernal.app)'),
  faucetUrl: read('VITE_FAUCET_API_URL', import.meta.env.DEV ? 'http://localhost:3001/api/faucet' : ''),

  walletConnectProjectId: required(
    'VITE_WALLETCONNECT_PROJECT_ID',
    'Get one at https://cloud.reown.com',
  ),
  alchemyApiKey: read('VITE_ALCHEMY_API_KEY', ''),
  infuraApiKey:  read('VITE_INFURA_API_KEY',  ''),
  chainId:       num('VITE_CHAIN_ID', 421614),
  networkName:   read('VITE_NETWORK_NAME', 'Arbitrum Sepolia'),
  explorerUrl:   read('VITE_EXPLORER_URL', 'https://sepolia.arbiscan.io'),

  supabaseUrl: (() => {
    const val = read('VITE_SUPABASE_URL', '');
    if (!val && import.meta.env.PROD) {
      throw new Error('[env] VITE_SUPABASE_URL is required in production');
    }
    return val;
  })(),

  supabaseAnonKey: (() => {
    const val = read('VITE_SUPABASE_ANON_KEY', '');
    if (!val && import.meta.env.PROD) {
      throw new Error('[env] VITE_SUPABASE_ANON_KEY is required in production');
    }
    return val;
  })(),

  contracts: {
    personalFundFactory: read('VITE_PERSONALFUNDFACTORY_ADDRESS', ''),
    personalFund:        read('VITE_PERSONALFUND_ADDRESS',        ''),
    treasury:            read('VITE_TREASURY_ADDRESS',            ''),
    protocolRegistry:    read('VITE_PROTOCOLREGISTRY_ADDRESS',    ''),
    userPreferences:     read('VITE_USERPREFERENCES_ADDRESS',     ''),
    dateTime:            read('VITE_DATETIME_ADDRESS',            ''),
    usdc:                read('VITE_USDC_ADDRESS',                ''),
  },

  features: {
    analytics:    bool('VITE_ENABLE_ANALYTICS',   false),
    debug:        bool('VITE_ENABLE_DEBUG',        import.meta.env.DEV),
    faucet:       bool('VITE_ENABLE_FAUCET',       true),
    experimental: bool('VITE_ENABLE_EXPERIMENTAL', false),
    mocks:        bool('VITE_ENABLE_MOCKS',         false),
  },
});

if (env.isDev && env.features.debug) {
  const supabaseProject = env.supabaseUrl
    ? `${env.supabaseUrl.split('//')[1]?.split('.')[0]}.supabase.co`
    : 'NOT SET';

  console.group('[env] App Configuration');
  console.log('Environment  :', env.env);
  console.log('Log Level    :', env.logLevel);
  console.log('API URL      :', env.apiUrl);
  console.log('Faucet URL   :', env.faucetUrl || '(not set)');
  console.log('Chain ID     :', env.chainId, '—', env.networkName);
  console.log('Explorer     :', env.explorerUrl);
  console.log('Supabase     :', supabaseProject);
  console.log('WalletConnect:', env.walletConnectProjectId ? 'SET' : 'MISSING ⚠️');
  console.log('Alchemy      :', env.alchemyApiKey ? 'SET' : 'not set (public RPC)');
  console.log('Infura       :', env.infuraApiKey  ? 'SET' : 'not set (public RPC)');
  console.log('Features     :', env.features);
  console.groupEnd();
}

export const API_URL          = env.apiUrl;
export const FAUCET_URL       = env.faucetUrl;
export const SUPABASE_URL     = env.supabaseUrl;
export const SUPABASE_ANON    = env.supabaseAnonKey;
export const CHAIN_ID         = env.chainId;
export const EXPLORER_URL     = env.explorerUrl;

export const ENABLE_DEBUG        = env.features.debug;
export const ENABLE_ANALYTICS    = env.features.analytics;
export const ENABLE_FAUCET       = env.features.faucet;
export const ENABLE_EXPERIMENTAL = env.features.experimental;
export const ENABLE_MOCKS        = env.features.mocks;

export default env;