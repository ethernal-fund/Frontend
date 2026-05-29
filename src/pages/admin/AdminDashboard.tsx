/**
 * AdminDashboard.tsx
 *
 * Entry point for the admin section. Protected by AdminGuard (on-chain Gnosis Safe ownership check).
 *
 * Data sources (all TODO — connected when backend indexer is ready):
 *   - Protocol overview  → PersonalFundFactory.getTotalFunds() + ProtocolRegistry.getGlobalStats()
 *   - Treasury health    → Treasury.getTreasuryStats()
 *   - Retirement queue   → Treasury.getEarlyRetirementQueue() (EarlyRetirementRequested events)
 *   - Recent activity    → off-chain indexer (Supabase)
 *   - Contract status    → viem multicall against deployed addresses
 *
 * During testnet / pre-indexer: MOCK_* constants are used and clearly labelled.
 * Swap them for real hooks when the data layer is ready — the UI requires no changes.
 */

import { useState }            from 'react';
import { Link }                from 'react-router-dom';
import { ROUTES }              from '@/router/routes';
import EarlyRetirementMonitor  from '@/components/admin/EarlyRetirementMonitor';

// Types 

interface ProtocolStats {
  totalFundsCreated:    number;
  registeredProtocols:  number;
  activeProtocols:      number;
  totalValueLocked:     string;
  averageAPY:           string;
  treasuryBalance:      string;
  totalFeesAllTime:     string;
  pendingRetirements:   number;
  approvedRetirements:  number;
  rejectedRetirements:  number;
  feePercentage:        string;
}

type ActivityType =
  | 'fund_created'
  | 'deposit'
  | 'protocol_updated'
  | 'retirement_request'
  | 'fee_withdrawal';

interface ActivityItem {
  type:        ActivityType;
  description: string;
  meta:        string;
  time:        string;
}

interface ContractEntry {
  name:    string;
  address: string;
  status:  'operational' | 'degraded' | 'down';
}

// Mock data 
// TODO: replace with on-chain reads + Supabase queries when indexer is ready.
// Keep TESTNET_DATA flag so CI/CD can assert it's removed before mainnet deploy.

const IS_TESTNET = import.meta.env.VITE_CHAIN_ID === '421614'; // Arbitrum Sepolia

const MOCK_STATS: ProtocolStats = {
  totalFundsCreated:    0,
  registeredProtocols:  0,
  activeProtocols:      0,
  totalValueLocked:     '0',
  averageAPY:           '0%',
  treasuryBalance:      '0',
  totalFeesAllTime:     '0',
  pendingRetirements:   0,
  approvedRetirements:  0,
  rejectedRetirements:  0,
  feePercentage:        '5%',
};

const MOCK_ACTIVITY: ActivityItem[] = [];

const CONTRACT_STATUS: ContractEntry[] = [
  { name: 'Treasury',            address: '0xaED0…9A7b', status: 'operational' },
  { name: 'PersonalFundFactory', address: '0x50bc…5495', status: 'operational' },
  { name: 'ProtocolRegistry',    address: '0x6398…d1',   status: 'operational' },
  { name: 'UserPreferences',     address: '0xd591…D25',  status: 'operational' },
];

const FEE_CONFIG = [
  { label: 'Deposit fee',                  value: '5%  (500 bps)' },
  { label: 'Early exit penalty',           value: '7%  (700 bps)' },
  { label: 'Extra deposit reclaim penalty', value: '1%  (100 bps)' },
  { label: 'Max fee cap (contract)',        value: '5% (500 bps)' },
] as const;

// Sub-components 

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-0!">
        {title}
      </h2>
      {sub && <p className="text-xs text-gray-400 mb-0! mt-0.5">{sub}</p>}
    </div>
  );
}

interface StatCardProps {
  label:       string;
  value:       string | number;
  sub?:        string;
  accent?:     boolean;
  icon?:       string;
  prefix?:     string;
  suffix?:     string;
  borderColor?: string;
}

function StatCard({ label, value, sub, accent, icon, prefix, suffix, borderColor }: StatCardProps) {
  return (
    <div
      className={`card hover:shadow-brand-lg transition-all duration-200 ${
        borderColor ? `border-l-4 ${borderColor}` : ''
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider leading-tight pr-2">
          {label}
        </p>
        {icon && <span className="text-lg leading-none">{icon}</span>}
      </div>
      <div className={`text-2xl font-bold mb-1! ${accent ? 'text-forest-green' : 'text-gray-900'}`}>
        {prefix}{value}{suffix}
      </div>
      {sub && <p className="text-xs text-gray-400 mb-0!">{sub}</p>}
    </div>
  );
}

const STATUS_DOT_COLORS = {
  operational: 'bg-green-500',
  degraded:    'bg-yellow-400',
  down:        'bg-red-500',
} as const;

function StatusDot({ status }: { status: ContractEntry['status'] }) {
  const color = STATUS_DOT_COLORS[status];
  return (
    <span className="relative flex h-2 w-2 shrink-0">
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-60`} />
      <span className={`relative inline-flex rounded-full h-2 w-2 ${color}`} />
    </span>
  );
}

const ACTIVITY_ICON: Record<ActivityType, { emoji: string; bg: string }> = {
  fund_created:       { emoji: '🏦', bg: 'bg-green-50'  },
  deposit:            { emoji: '💰', bg: 'bg-blue-50'   },
  protocol_updated:   { emoji: '⚙️', bg: 'bg-purple-50' },
  retirement_request: { emoji: '📋', bg: 'bg-yellow-50' },
  fee_withdrawal:     { emoji: '💸', bg: 'bg-gray-100'  },
};

// Main component 

export default function AdminDashboardPage() {
  // TODO: replace useState stubs with real hooks:
  // const { stats, isLoading } = useAdminStats();
  // const { activity }         = useRecentActivity();
  const [stats]    = useState<ProtocolStats>(MOCK_STATS);
  const [activity] = useState<ActivityItem[]>(MOCK_ACTIVITY);

  return (
    <div className="container-app py-6 sm:py-8 animate-fade-in">

      {/* ── Page title ── */}
      <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl! sm:text-3xl! font-extrabold text-gray-900 mb-1!">
            Admin Dashboard
          </h1>
          <p className="text-sm text-gray-500 mb-0!">
            Ethernal Protocol ·{' '}
            {IS_TESTNET ? (
              <span className="text-yellow-600 font-semibold">Arbitrum Sepolia (testnet)</span>
            ) : (
              <span className="text-green-700 font-semibold">Arbitrum One</span>
            )}
          </p>
        </div>

        {/* Quick links to sub-pages */}
        <div className="flex gap-2 flex-wrap">
          <Link to={ROUTES.ADMIN_TREASURY} className="btn btn-secondary btn-sm w-auto text-xs">
            🏛️ Treasury
          </Link>
          <Link to={ROUTES.ADMIN_PROTOCOL} className="btn btn-secondary btn-sm w-auto text-xs">
            🔗 Protocols
          </Link>
        </div>
      </div>

      {/* ── Testnet banner ── */}
      {IS_TESTNET && (
        <div className="alert alert-warning mb-6 text-sm flex items-start gap-2">
          <span className="text-lg leading-none shrink-0">⚠️</span>
          <div>
            <strong>Testnet mode</strong> — all data shown is from Arbitrum Sepolia.
            Stats are zero or mock values until the off-chain indexer is connected.
          </div>
        </div>
      )}

      {/* ── Protocol Overview ── */}
      <SectionHeader
        title="Protocol Overview"
        sub="On-chain totals — Factory · ProtocolRegistry · Treasury"
      />
      <div className="grid-responsive-4 mb-8">
        <StatCard
          label="Total Funds Created"
          value={stats.totalFundsCreated}
          sub="via PersonalFundFactory"
          accent
          icon="🏦"
        />
        <StatCard
          label="Registered Protocols"
          value={stats.registeredProtocols}
          sub={`${stats.activeProtocols} currently active`}
          icon="🔗"
        />
        <StatCard
          label="Total Value Locked"
          value={stats.totalValueLocked}
          sub="USDC · across all protocols"
          prefix="$"
          icon="📊"
        />
        <StatCard
          label="Average APY"
          value={stats.averageAPY}
          sub="weighted across active protocols"
          accent
          icon="📈"
        />
      </div>

      {/* ── Treasury Health ── */}
      <SectionHeader title="Treasury Health" sub="Fee balances & collection totals" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Treasury Balance"
          value={stats.treasuryBalance}
          sub="available USDC in Treasury contract"
          prefix="$"
          icon="🏛️"
          accent
          borderColor="border-l-forest-green"
        />
        <StatCard
          label="Total Fees All Time"
          value={stats.totalFeesAllTime}
          sub="cumulative since deployment"
          prefix="$"
          icon="💰"
        />
        <StatCard
          label="Protocol Fee Rate"
          value={stats.feePercentage}
          sub="applied on every deposit"
          icon="⚖️"
        />
      </div>

      {/* ── Early Retirement Queue ── */}
      <SectionHeader
        title="Early Retirement Requests"
        sub="Governance queue — processable via Treasury.processEarlyRetirement()"
      />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="card border-l-4 border-l-yellow-400">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">⏳ Pending</p>
          <p className="text-4xl font-extrabold text-yellow-600 mb-1!">{stats.pendingRetirements}</p>
          <p className="text-xs text-gray-400 mb-0!">awaiting admin decision</p>
        </div>
        <div className="card border-l-4 border-l-green-500">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">✅ Approved</p>
          <p className="text-4xl font-extrabold text-green-600 mb-1!">{stats.approvedRetirements}</p>
          <p className="text-xs text-gray-400 mb-0!">early retirements granted</p>
        </div>
        <div className="card border-l-4 border-l-red-400">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">❌ Rejected</p>
          <p className="text-4xl font-extrabold text-red-500 mb-1!">{stats.rejectedRetirements}</p>
          <p className="text-xs text-gray-400 mb-0!">requests denied</p>
        </div>
      </div>

      {/* ── Early Retirement Monitor (on-chain component) ── */}
      <div className="mb-8">
        <EarlyRetirementMonitor />
      </div>

      {/* ── Bottom grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent Activity */}
        <div className="card">
          <SectionHeader
            title="Recent Activity"
            sub="Latest on-chain events — powered by off-chain indexer (Supabase)"
          />

          {activity.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <p className="text-3xl mb-2">📭</p>
              <p className="text-sm font-medium text-gray-500">No activity yet</p>
              <p className="text-xs mt-1">
                Events will appear here once the off-chain indexer is connected.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {activity.map((item, i) => {
                const { emoji, bg } = ACTIVITY_ICON[item.type];
                return (
                  <div
                    key={i}
                    className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0"
                  >
                    <div
                      className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center shrink-0 text-sm`}
                    >
                      {emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 mb-0! leading-tight">
                        {item.description}
                      </p>
                      <p className="text-xs text-gray-400 mb-0! font-mono truncate mt-0.5">
                        {item.meta}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0 pt-0.5">{item.time}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Contract Status + Fee Config */}
        <div className="flex flex-col gap-4">

          {/* Contract Status */}
          <div className="card">
            <SectionHeader
              title="Contract Status"
              sub={`Deployed on ${IS_TESTNET ? 'Arbitrum Sepolia' : 'Arbitrum One'}`}
            />
            <div className="space-y-2">
              {CONTRACT_STATUS.map((c) => (
                <div
                  key={c.name}
                  className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-gray-50 border border-gray-100"
                >
                  <div className="flex items-center gap-3">
                    <StatusDot status={c.status} />
                    <div>
                      <p className="text-sm font-semibold text-gray-800 leading-tight">{c.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{c.address}</p>
                    </div>
                  </div>
                  <span
                    className={`badge ${
                      c.status === 'operational' ? 'badge-success'
                      : c.status === 'degraded'  ? 'badge-warning'
                      : 'badge-error'
                    }`}
                  >
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Fee Configuration */}
          <div className="card bg-green-50 border-green-100">
            <SectionHeader title="Fee Configuration" sub="Values enforced by contract — read-only" />
            <div className="space-y-2">
              {FEE_CONFIG.map((row) => (
                <div
                  key={row.label}
                  className="flex justify-between items-center text-sm py-1 border-b border-green-100 last:border-0"
                >
                  <span className="text-green-800">{row.label}</span>
                  <span className="font-bold text-green-900 font-mono">{row.value}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}