import { useState } from "react";

interface ProtocolStats {
  totalFundsCreated: number;
  registeredProtocols: number;
  activeProtocols: number;
  totalValueLocked: string;
  averageAPY: string;
  treasuryBalance: string;
  totalFeesAllTime: string;
  pendingRetirements: number;
  approvedRetirements: number;
  rejectedRetirements: number;
  feePercentage: string;
}

interface ActivityItem {
  type: "fund_created" | "deposit" | "protocol_updated" | "retirement_request" | "fee_withdrawal";
  description: string;
  meta: string;
  time: string;
}

const MOCK_STATS: ProtocolStats = {
  totalFundsCreated:    142,
  registeredProtocols:  7,
  activeProtocols:      6,
  totalValueLocked:     "3,841,200",
  averageAPY:           "6.4%",
  treasuryBalance:      "19,250.44",
  totalFeesAllTime:     "24,810.00",
  pendingRetirements:   3,
  approvedRetirements:  11,
  rejectedRetirements:  2,
  feePercentage:        "5%",
};

const MOCK_ACTIVITY: ActivityItem[] = [
  { type: "fund_created",       description: "PersonalFund deployed",      meta: "0x3f2a…d41c · AAVE protocol",   time: "2 min ago" },
  { type: "deposit",            description: "Monthly deposit recorded",   meta: "0x88bc…991a · $142.30 USDC",    time: "8 min ago" },
  { type: "protocol_updated",   description: "Protocol APY updated",       meta: "Compound Finance → 5.8%",        time: "34 min ago" },
  { type: "retirement_request", description: "Early retirement requested", meta: "0x1d77…cc3b · pending review",  time: "1 hr ago"  },
  { type: "fee_withdrawal",     description: "Fee withdrawal executed",    meta: "→ 0xAdm…F00D · $5,000 USDC",   time: "3 hr ago"  },
  { type: "fund_created",       description: "PersonalFund deployed",      meta: "0xa91e…3301 · Compound",        time: "5 hr ago"  },
];

const CONTRACT_STATUS = [
  { name: "Treasury",             address: "0xTRE…ASY", status: "operational" },
  { name: "PersonalFundFactory",  address: "0xFAC…ORY", status: "operational" },
  { name: "ProtocolRegistry",     address: "0xREG…TRY", status: "operational" },
  { name: "UserPreferences",      address: "0xUSR…REF", status: "operational" },
];

function activityIcon(type: ActivityItem["type"]) {
  const map = {
    fund_created:       { emoji: "🏦", bg: "bg-green-50",  text: "text-green-700"  },
    deposit:            { emoji: "💰", bg: "bg-blue-50",   text: "text-blue-700"   },
    protocol_updated:   { emoji: "⚙️", bg: "bg-purple-50", text: "text-purple-700" },
    retirement_request: { emoji: "📋", bg: "bg-yellow-50", text: "text-yellow-700" },
    fee_withdrawal:     { emoji: "💸", bg: "bg-gray-100",  text: "text-gray-600"   },
  };
  return map[type];
}

function StatusDot({ status }: { status: string }) {
  const color = status === "operational" ? "bg-green-500" : "bg-red-500";
  return (
    <span className="relative flex h-2 w-2 shrink-0">
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-60`} />
      <span className={`relative inline-flex rounded-full h-2 w-2 ${color}`} />
    </span>
  );
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-0!">{title}</h2>
      {sub && <p className="text-xs text-gray-400 mb-0! mt-0.5">{sub}</p>}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
  icon?: string;
  prefix?: string;
  suffix?: string;
  borderColor?: string;
}

function StatCard({ label, value, sub, accent, icon, prefix, suffix, borderColor }: StatCardProps) {
  return (
    <div className={`card hover:shadow-brand-lg transition-all duration-200 ${borderColor ? `border-l-4 ${borderColor}` : ""}`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider leading-tight pr-2">
          {label}
        </p>
        {icon && <span className="text-lg leading-none">{icon}</span>}
      </div>
      <div className={`text-2xl font-bold mb-1! ${accent ? "text-forest-green" : "text-gray-900"}`}>
        {prefix}{value}{suffix}
      </div>
      {sub && <p className="text-xs text-gray-400 mb-0!">{sub}</p>}
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats] = useState<ProtocolStats>(MOCK_STATS);
  const [activity] = useState<ActivityItem[]>(MOCK_ACTIVITY);

  return (
    <div className="container-app py-6 sm:py-8 animate-fade-in">

      {/* ── Page title ── */}
      <div className="mb-8">
        <h1 className="text-2xl! sm:text-3xl! font-extrabold text-gray-900 mb-1!">
          Admin Dashboard
        </h1>
        <p className="text-sm text-gray-500 mb-0!">
          Ethernal Protocol · Arbitrum Sepolia — real-time protocol overview
        </p>
      </div>

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

      {/* ── Early Retirement Requests ── */}
      <SectionHeader title="Early Retirement Requests" sub="Governance queue — processable by admin" />
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

      {/* ── Bottom grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent Activity */}
        <div className="card">
          <SectionHeader title="Recent Activity" sub="Latest on-chain events (indexed off-chain)" />
          <div className="space-y-1">
            {activity.map((item, i) => {
              const { emoji, bg } = activityIcon(item.type);
              return (
                <div
                  key={i}
                  className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0"
                >
                  <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center shrink-0 text-sm`}>
                    {emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 mb-0!leading-tight">
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
        </div>

        {/* Contract Status + Fee Config */}
        <div className="flex flex-col gap-4">
          <div className="card">
            <SectionHeader title="Contract Status" sub="Deployed on Arbitrum Sepolia" />
            <div className="space-y-2">
              {CONTRACT_STATUS.map((c, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-gray-50 border border-gray-100"
                >
                  <div className="flex items-center gap-3">
                    <StatusDot status={c.status} />
                    <div>
                      <p className="text-sm font-semibold text-gray-800 leading-tight">{c.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{c.address}</p>
                    </div>
                  </div>
                  <span className="badge badge-success">operational</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card bg-green-50 border-green-100">
            <SectionHeader title="Fee Configuration" />
            <div className="space-y-2">
              {[
                { label: "Deposit fee",                  value: "5%  (500 bps)" },
                { label: "Early retirement fee",         value: "7%  (700 bps)" },
                { label: "Extra deposit reclaim penalty",value: "1%  (100 bps)" },
                { label: "Max fee cap",                  value: "10% (1000 bps)" },
              ].map((row, i) => (
                <div key={i} className="flex justify-between items-center text-sm py-1 border-b border-green-100 last:border-0">
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