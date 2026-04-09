// TreasuryPage.tsx
// Treasury management: all registered funds, fees paid per fund, withdraw/emergency controls
// Data sourced from Treasury.vy (getTreasuryStats, getFundFeeRecord, withdrawFees, emergencyWithdraw)
// + PersonalFundFactory.vy (FundCreated events indexed off-chain)
// Uses the app's design system (index.css + Tailwind)

import { useState } from "react";

interface FundRecord {
  fundAddress:      string;
  owner:            string;
  totalFeesPaid:    number;  // USDC raw (6 dec) → display / 1e6
  lastFeeTimestamp: number;
  feeCount:         number;
  isActive:         boolean;
  retirementAge:    number;
  monthlyDeposit:   number;
  protocol:         string;
  createdAt:        number;
}

interface TreasuryStats {
  totalFeesCollectedUSDC:    number;
  totalFeesCollectedAllTime: number;
  totalFundsRegistered:      number;
  activeFundsCount:          number;
  pendingRequests:           number;
  approvedRetirements:       number;
  rejectedRetirements:       number;
  totalFeesWithdrawn:        number;
}

// ── Mock data (enumerate via FeeReceived events + getFundFeeRecord per fund) ──

const MOCK_STATS: TreasuryStats = {
  totalFeesCollectedUSDC:    19_250,
  totalFeesCollectedAllTime: 24_810,
  totalFundsRegistered:      142,
  activeFundsCount:          138,
  pendingRequests:           3,
  approvedRetirements:       11,
  rejectedRetirements:       2,
  totalFeesWithdrawn:        5_560,
};

const MOCK_FUNDS: FundRecord[] = [
  { fundAddress: "0x3f2a…d41c", owner: "0xABC1…0001", totalFeesPaid: 1_240,  lastFeeTimestamp: 1743550000, feeCount: 9,  isActive: true,  retirementAge: 65, monthlyDeposit: 142, protocol: "Aave v3",          createdAt: 1704067200 },
  { fundAddress: "0x88bc…991a", owner: "0xDEF2…0002", totalFeesPaid: 2_100,  lastFeeTimestamp: 1743450000, feeCount: 15, isActive: true,  retirementAge: 60, monthlyDeposit: 210, protocol: "Compound Finance",  createdAt: 1704153600 },
  { fundAddress: "0xa91e…3301", owner: "0x1122…0003", totalFeesPaid: 870,    lastFeeTimestamp: 1743300000, feeCount: 6,  isActive: true,  retirementAge: 67, monthlyDeposit: 97,  protocol: "Ondo Finance",      createdAt: 1704240000 },
  { fundAddress: "0x1d77…cc3b", owner: "0x3344…0004", totalFeesPaid: 3_500,  lastFeeTimestamp: 1743200000, feeCount: 24, isActive: true,  retirementAge: 55, monthlyDeposit: 320, protocol: "Aave v3",          createdAt: 1703980800 },
  { fundAddress: "0xbb44…aa22", owner: "0x5566…0005", totalFeesPaid: 420,    lastFeeTimestamp: 1742900000, feeCount: 3,  isActive: true,  retirementAge: 70, monthlyDeposit: 85,  protocol: "sDAI Bond Pool",    createdAt: 1704499200 },
  { fundAddress: "0xcc99…1234", owner: "0x7788…0006", totalFeesPaid: 5_800,  lastFeeTimestamp: 1743000000, feeCount: 42, isActive: true,  retirementAge: 62, monthlyDeposit: 500, protocol: "Yearn Finance",     createdAt: 1703894400 },
  { fundAddress: "0xdd88…5678", owner: "0x99AA…0007", totalFeesPaid: 1_100,  lastFeeTimestamp: 1741800000, feeCount: 8,  isActive: false, retirementAge: 65, monthlyDeposit: 175, protocol: "PAXG Vault",        createdAt: 1704326400 },
  { fundAddress: "0xee77…9012", owner: "0xBBCC…0008", totalFeesPaid: 660,    lastFeeTimestamp: 1742500000, feeCount: 5,  isActive: true,  retirementAge: 68, monthlyDeposit: 110, protocol: "Compound Finance",  createdAt: 1704585600 },
];

function fmt(n: number, decimals = 2): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-0!">{title}</h2>
      {sub && <p className="text-xs text-gray-400 mb-0! mt-0.5">{sub}</p>}
    </div>
  );
}

function WithdrawModal({
  available,
  onClose,
  onConfirm,
}: {
  available: number;
  onClose:   () => void;
  onConfirm: (amount: number, recipient: string) => void;
}) {
  const [amount,    setAmount]    = useState("");
  const [recipient, setRecipient] = useState("");
  const [busy,      setBusy]      = useState(false);

  async function handleConfirm() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0 || amt > available || !recipient) return;
    setBusy(true);
    // TODO: call Treasury.withdrawFees(recipient, amount_in_6dec)
    await new Promise(r => setTimeout(r, 900));
    onConfirm(amt, recipient);
    setBusy(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-brand-xl animate-slide-up">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-0!">Withdraw Fees</h2>
          <p className="text-xs text-gray-500 mb-0! mt-1">
            Calls Treasury.withdrawFees(recipient, amount) · admin only
          </p>
        </div>
        <div className="p-6 space-y-4">
          <div className="alert alert-info text-xs">
            Available balance: <strong>${fmt(available)} USDC</strong>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
              Recipient Address *
            </label>
            <input
              className="input font-mono text-sm"
              placeholder="0x…"
              value={recipient}
              onChange={e => setRecipient(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
              Amount (USDC) *
            </label>
            <input
              className="input"
              type="number"
              min="1"
              step="0.01"
              max={available}
              placeholder={`Max ${fmt(available)}`}
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
            <button
              className="text-xs text-forest-green mt-1 font-semibold"
              style={{ minHeight: "auto", background: "none", border: "none", padding: 0, cursor: "pointer" }}
              onClick={() => setAmount(String(available))}
            >
              Use max →
            </button>
          </div>
        </div>
        <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
          <button className="btn btn-secondary btn-sm w-auto" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary btn-sm w-auto"
            onClick={handleConfirm}
            disabled={busy || !amount || !recipient || parseFloat(amount) > available}
          >
            {busy ? "Sending…" : "Withdraw"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeactivateModal({
  fund,
  onClose,
  onConfirm,
}: {
  fund:      FundRecord;
  onClose:   () => void;
  onConfirm: (addr: string, reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [busy,   setBusy]   = useState(false);

  async function handleConfirm() {
    if (!reason.trim()) return;
    setBusy(true);
    // TODO: call Treasury.deactivateFund(fundAddress, reason)
    await new Promise(r => setTimeout(r, 700));
    onConfirm(fund.fundAddress, reason);
    setBusy(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-brand-xl animate-slide-up">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-red-600 mb-0!">Deactivate Fund</h2>
          <p className="text-xs text-gray-500 mb-0! mt-1 font-mono">{fund.fundAddress}</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="alert alert-error text-xs">
            This calls <strong>Treasury.deactivateFund()</strong>. The fund will stop recording fees.
            This action is irreversible via this UI.
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
              Reason *
            </label>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="Reason for deactivation…"
              value={reason}
              onChange={e => setReason(e.target.value)}
              style={{ height: "auto" }}
            />
          </div>
        </div>
        <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
          <button className="btn btn-secondary btn-sm w-auto" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-danger btn-sm w-auto"
            onClick={handleConfirm}
            disabled={busy || !reason.trim()}
          >
            {busy ? "Deactivating…" : "Confirm Deactivate"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FundRow({
  fund,
  maxFees,
  onDeactivate,
}: {
  fund:         FundRecord;
  maxFees:      number;
  onDeactivate: (f: FundRecord) => void;
}) {
  const barPct = maxFees > 0 ? Math.round((fund.totalFeesPaid / maxFees) * 100) : 0;

  return (
    <tr className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${!fund.isActive ? "opacity-50" : ""}`}>
      <td className="py-3 px-4">
        <p className="text-xs font-mono font-semibold text-dark-blue">{fund.fundAddress}</p>
        <p className="text-xs font-mono text-gray-400">{fund.owner}</p>
      </td>
      <td className="py-3 px-4 hidden sm:table-cell">
        <p className="text-xs text-gray-600">{fund.protocol}</p>
        <p className="text-xs text-gray-400">ret. {fund.retirementAge} yrs</p>
      </td>
      <td className="py-3 px-4">
        <p className="text-sm font-bold text-gray-900">${fmt(fund.totalFeesPaid)}</p>
        <div className="w-20 h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
          <div
            className="h-full rounded-full gradient-primary"
            style={{ width: `${barPct}%` }}
          />
        </div>
      </td>
      <td className="py-3 px-4 hidden md:table-cell text-center">
        <span className="text-sm font-semibold text-gray-700">{fund.feeCount}</span>
      </td>
      <td className="py-3 px-4 hidden lg:table-cell">
        <p className="text-xs text-gray-500">{fmtDate(fund.lastFeeTimestamp)}</p>
      </td>
      <td className="py-3 px-4 text-center">
        {fund.isActive
          ? <span className="badge badge-success text-xs">Active</span>
          : <span className="badge badge-error text-xs">Inactive</span>
        }
      </td>
      <td className="py-3 px-4 text-right">
        {fund.isActive && (
          <button
            className="btn btn-sm w-auto text-xs"
            style={{ background: "none", color: "#ef4444", border: "1px solid #ef4444", minHeight: "auto", padding: "4px 10px" }}
            onClick={() => onDeactivate(fund)}
          >
            Deactivate
          </button>
        )}
      </td>
    </tr>
  );
}

type FundFilter = "all" | "active" | "inactive";
type FundSort   = "fees_desc" | "fees_asc" | "recent" | "oldest";

export default function TreasuryPage() {
  const [stats,          setStats]         = useState<TreasuryStats>(MOCK_STATS);
  const [funds,          setFunds]         = useState<FundRecord[]>(MOCK_FUNDS);
  const [fundFilter,     setFundFilter]    = useState<FundFilter>("all");
  const [fundSort,       setFundSort]      = useState<FundSort>("fees_desc");
  const [search,         setSearch]        = useState("");
  const [showWithdraw,   setShowWithdraw]  = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<FundRecord | null>(null);

  // TODO: on mount, read Treasury.getTreasuryStats() and enumerate FeeReceived events off-chain

  const maxFees = Math.max(...funds.map(f => f.totalFeesPaid), 1);

  const filteredFunds = funds
    .filter(f => {
      const matchesFilter =
        fundFilter === "all"      ? true :
        fundFilter === "active"   ? f.isActive :
        !f.isActive;
      const matchesSearch =
        !search ||
        f.fundAddress.toLowerCase().includes(search.toLowerCase()) ||
        f.owner.toLowerCase().includes(search.toLowerCase()) ||
        f.protocol.toLowerCase().includes(search.toLowerCase());
      return matchesFilter && matchesSearch;
    })
    .sort((a, b) => {
      if (fundSort === "fees_desc") return b.totalFeesPaid - a.totalFeesPaid;
      if (fundSort === "fees_asc")  return a.totalFeesPaid - b.totalFeesPaid;
      if (fundSort === "recent")    return b.createdAt - a.createdAt;
      return a.createdAt - b.createdAt;
    });

  function handleWithdrawConfirm(amount: number, _recipient: string) {
    setStats(prev => ({
      ...prev,
      totalFeesCollectedUSDC: prev.totalFeesCollectedUSDC - amount,
      totalFeesWithdrawn:     prev.totalFeesWithdrawn     + amount,
    }));
  }

  function handleDeactivateConfirm(addr: string, _reason: string) {
    setFunds(prev =>
      prev.map(f => f.fundAddress === addr ? { ...f, isActive: false } : f)
    );
    setStats(prev => ({ ...prev, activeFundsCount: prev.activeFundsCount - 1 }));
  }

  return (
    <div className="container-app py-6 sm:py-8 animate-fade-in">

      {/* ── Page title ── */}
      <div className="mb-8">
        <h1 className="text-2xl! sm:text-3xl! font-extrabold text-gray-900 mb-1!">
          Treasury
        </h1>
        <p className="text-sm text-gray-500 mb-0!">
          Fee collection · fund registry · withdrawal management
        </p>
      </div>

      {/* ── Treasury Overview Stats ── */}
      <SectionHeader title="Treasury Overview" sub="Treasury.getTreasuryStats()" />
      <div className="grid-responsive-4 mb-8">
        <div className="card border-l-4 border-l-forest-green">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Available Balance</p>
          <p className="text-2xl font-extrabold text-forest-green mb-1!">
            ${fmt(stats.totalFeesCollectedUSDC)}
          </p>
          <p className="text-xs text-gray-400 mb-0!">USDC · ready to withdraw</p>
        </div>
        <div className="card">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">All-Time Collected</p>
          <p className="text-2xl font-extrabold text-gray-900 mb-1!">
            ${fmt(stats.totalFeesCollectedAllTime)}
          </p>
          <p className="text-xs text-gray-400 mb-0!">cumulative since deployment</p>
        </div>
        <div className="card">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Total Withdrawn</p>
          <p className="text-2xl font-extrabold text-gray-900 mb-1!">
            ${fmt(stats.totalFeesWithdrawn)}
          </p>
          <p className="text-xs text-gray-400 mb-0!">by admin · all time</p>
        </div>
        <div className="card">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Registered Funds</p>
          <p className="text-2xl font-extrabold text-gray-900 mb-1!">{stats.totalFundsRegistered}</p>
          <p className="text-xs text-gray-400 mb-0!">{stats.activeFundsCount} active</p>
        </div>
      </div>

      {/* ── Fee Management Actions ── */}
      <SectionHeader title="Fee Management" sub="Admin actions · require wallet connection" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {/* Withdraw Card */}
        <div className="card">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-lg shrink-0">
              💸
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 mb-0!">Withdraw Fees</h3>
              <p className="text-xs text-gray-500 mb-0! mt-0.5">
                Transfer collected USDC to any recipient · Treasury.withdrawFees()
              </p>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Available</span>
              <span className="font-bold text-gray-900">${fmt(stats.totalFeesCollectedUSDC)} USDC</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-600">Already withdrawn</span>
              <span className="text-gray-500">${fmt(stats.totalFeesWithdrawn)} USDC</span>
            </div>
          </div>
          <button
            className="btn btn-primary w-full"
            onClick={() => setShowWithdraw(true)}
            disabled={stats.totalFeesCollectedUSDC <= 0}
          >
            Withdraw Fees
          </button>
        </div>

        {/* Early Retirement Queue */}
        <div className="card">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center text-lg shrink-0">
              📋
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 mb-0!">Early Retirement Queue</h3>
              <p className="text-xs text-gray-500 mb-0! mt-0.5">
                Treasury.processEarlyRetirement() · approve or reject
              </p>
            </div>
          </div>
          <div className="space-y-2 mb-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">⏳ Pending</span>
              <span className="badge badge-warning">{stats.pendingRequests}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">✅ Approved</span>
              <span className="badge badge-success">{stats.approvedRetirements}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-600">❌ Rejected</span>
              <span className="badge badge-error">{stats.rejectedRetirements}</span>
            </div>
          </div>
          <p className="text-xs text-gray-400">
            Enumerate via <span className="font-mono">EarlyRetirementRequested</span> events (off-chain indexer)
          </p>
        </div>
      </div>

      {/* ── Funds Table ── */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <SectionHeader
          title="Registered Funds"
          sub="All PersonalFunds that have ever paid a fee · FeeReceived events"
        />
      </div>

      {/* Search + Filter + Sort */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <input
          className="input text-sm"
          style={{ maxWidth: "260px", minHeight: "36px" }}
          placeholder="Search by address or protocol…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(["all", "active", "inactive"] as FundFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setFundFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all capitalize ${
                fundFilter === f
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              style={{ minHeight: "auto" }}
            >
              {f}
            </button>
          ))}
        </div>

        <select
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 outline-none ml-auto"
          value={fundSort}
          onChange={e => setFundSort(e.target.value as FundSort)}
          style={{ minHeight: "auto" }}
        >
          <option value="fees_desc">Fees ↓</option>
          <option value="fees_asc">Fees ↑</option>
          <option value="recent">Newest</option>
          <option value="oldest">Oldest</option>
        </select>

        <p className="text-xs text-gray-400">{filteredFunds.length} fund{filteredFunds.length !== 1 ? "s" : ""}</p>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0!">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fund / Owner</th>
                <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Protocol</th>
                <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fees Paid</th>
                <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell text-center">Deposits</th>
                <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Last Fee</th>
                <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Status</th>
                <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredFunds.map(fund => (
                <FundRow
                  key={fund.fundAddress}
                  fund={fund}
                  maxFees={maxFees}
                  onDeactivate={f => setDeactivateTarget(f)}
                />
              ))}
              {filteredFunds.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-gray-400">
                    <p className="text-3xl mb-2">🔍</p>
                    <p className="text-sm">No funds match this filter</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer totals */}
        {filteredFunds.length > 0 && (
          <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 flex flex-wrap gap-4 text-xs text-gray-600">
            <span>
              <strong>{filteredFunds.length}</strong> funds shown
            </span>
            <span>
              Total fees (shown): <strong className="text-gray-900">
                ${fmt(filteredFunds.reduce((s, f) => s + f.totalFeesPaid, 0))}
              </strong> USDC
            </span>
            <span>
              Total deposits: <strong className="text-gray-900">
                {filteredFunds.reduce((s, f) => s + f.feeCount, 0)}
              </strong>
            </span>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {showWithdraw && (
        <WithdrawModal
          available={stats.totalFeesCollectedUSDC}
          onClose={() => setShowWithdraw(false)}
          onConfirm={handleWithdrawConfirm}
        />
      )}
      {deactivateTarget && (
        <DeactivateModal
          fund={deactivateTarget}
          onClose={() => setDeactivateTarget(null)}
          onConfirm={handleDeactivateConfirm}
        />
      )}
    </div>
  );
}