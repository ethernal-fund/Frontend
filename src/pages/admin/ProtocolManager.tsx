// ProtocolManager.tsx
// Protocol management: list all protocols, add/remove, per-protocol usage stats
// Data sourced from ProtocolRegistry.vy (getGlobalStats, getAllProtocols, addDeFiProtocol, removeProtocol)
// Uses the app's design system (index.css + Tailwind)

import { useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type RiskLevel = 1 | 2 | 3;
type Category  = 1 | 2 | 3 | 4 | 5;

interface DeFiProtocol {
  protocolAddress: string;
  name:            string;
  category:        Category;
  apy:             number;   // basis points, e.g. 580 = 5.80%
  isActive:        boolean;
  totalDeposited:  number;   // USDC 6-decimal → display / 1e6
  riskLevel:       RiskLevel;
  addedTimestamp:  number;
  verified:        boolean;
  fundsUsing:      number;   // derived off-chain: count of PersonalFunds using this protocol
}

interface AddProtocolForm {
  protocolAddress: string;
  name:            string;
  apy:             string;
  riskLevel:       string;
  category:        string;
}

const CATEGORY_LABELS: Record<Category, string> = {
  1: "DeFi",
  2: "RWA",
  3: "Equity",
  4: "Commodity",
  5: "Bond",
};

const RISK_LABELS: Record<RiskLevel, { label: string; badgeClass: string }> = {
  1: { label: "Low",    badgeClass: "badge-success" },
  2: { label: "Medium", badgeClass: "badge-warning" },
  3: { label: "High",   badgeClass: "badge-error"   },
};

// ── Mock data (replace with ProtocolRegistry.getAllProtocols + getProtocol) ───

const MOCK_PROTOCOLS: DeFiProtocol[] = [
  {
    protocolAddress: "0xAAVE…0001",
    name:            "Aave v3",
    category:        1,
    apy:             580,
    isActive:        true,
    totalDeposited:  1_420_000,
    riskLevel:       1,
    addedTimestamp:  1704067200,
    verified:        true,
    fundsUsing:      61,
  },
  {
    protocolAddress: "0xCOMP…0002",
    name:            "Compound Finance",
    category:        1,
    apy:             520,
    isActive:        true,
    totalDeposited:  980_500,
    riskLevel:       1,
    addedTimestamp:  1704153600,
    verified:        true,
    fundsUsing:      44,
  },
  {
    protocolAddress: "0xONDO…0003",
    name:            "Ondo Finance (RWA)",
    category:        2,
    apy:             480,
    isActive:        true,
    totalDeposited:  755_200,
    riskLevel:       2,
    addedTimestamp:  1704240000,
    verified:        true,
    fundsUsing:      22,
  },
  {
    protocolAddress: "0xYERN…0004",
    name:            "Yearn Finance",
    category:        1,
    apy:             810,
    isActive:        true,
    totalDeposited:  430_100,
    riskLevel:       2,
    addedTimestamp:  1704326400,
    verified:        false,
    fundsUsing:      10,
  },
  {
    protocolAddress: "0xPAXG…0005",
    name:            "PAXG Vault",
    category:        4,
    apy:             310,
    isActive:        true,
    totalDeposited:  202_400,
    riskLevel:       1,
    addedTimestamp:  1704412800,
    verified:        true,
    fundsUsing:      5,
  },
  {
    protocolAddress: "0xMAPL…0006",
    name:            "Maple Finance",
    category:        2,
    apy:             920,
    isActive:        false,
    totalDeposited:  53_000,
    riskLevel:       3,
    addedTimestamp:  1704499200,
    verified:        false,
    fundsUsing:      0,
  },
  {
    protocolAddress: "0xSDAI…0007",
    name:            "sDAI Bond Pool",
    category:        5,
    apy:             490,
    isActive:        true,
    totalDeposited:  128_600,
    riskLevel:       1,
    addedTimestamp:  1704585600,
    verified:        true,
    fundsUsing:      0,
  },
];

const EMPTY_FORM: AddProtocolForm = {
  protocolAddress: "",
  name:            "",
  apy:             "",
  riskLevel:       "1",
  category:        "1",
};

function formatUSDC(raw: number): string {
  return "$" + (raw / 1).toLocaleString("en-US", { maximumFractionDigits: 0 }) + " USDC";
}

function formatAPY(bps: number): string {
  return (bps / 100).toFixed(2) + "%";
}

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-0">{title}</h2>
      {sub && <p className="text-xs text-gray-400 mb-0! mt-0.5">{sub}</p>}
    </div>
  );
}

// ── TVL Share Bar ─────────────────────────────────────────────────────────────

function TvlBar({ value, total }: { value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="mt-1">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">TVL share</span>
        <span className="font-mono font-semibold text-gray-700">{pct}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full gradient-primary transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ProtocolCard({
  protocol,
  totalTvl,
  onToggle,
  onVerify,
}: {
  protocol:  DeFiProtocol;
  totalTvl:  number;
  onToggle:  (addr: string, active: boolean) => void;
  onVerify:  (addr: string) => void;
}) {
  const risk = RISK_LABELS[protocol.riskLevel];

  return (
    <div className={`card transition-all duration-200 ${!protocol.isActive ? "opacity-60" : ""}`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-bold text-gray-900 mb-0! leading-tight">{protocol.name}</h3>
            {protocol.verified && (
              <span className="badge badge-success text-xs">✓ Verified</span>
            )}
            {!protocol.isActive && (
              <span className="badge badge-error text-xs">Inactive</span>
            )}
          </div>
          <p className="text-xs font-mono text-gray-400 mb-0! mt-0.5 truncate">{protocol.protocolAddress}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xl font-extrabold text-forest-green leading-tight">{formatAPY(protocol.apy)}</p>
          <p className="text-xs text-gray-400">APY</p>
        </div>
      </div>

      {/* Badges */}
      <div className="flex gap-2 flex-wrap mb-4">
        <span className={`badge ${risk.badgeClass} text-xs`}>{risk.label} Risk</span>
        <span className="badge badge-info text-xs">{CATEGORY_LABELS[protocol.category]}</span>
        <span className="text-xs text-gray-400 self-center">Added {formatDate(protocol.addedTimestamp)}</span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Deposited</p>
          <p className="text-sm font-bold text-gray-900">{formatUSDC(protocol.totalDeposited)}</p>
          <TvlBar value={protocol.totalDeposited} total={totalTvl} />
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Funds Using</p>
          <p className="text-sm font-bold text-gray-900">{protocol.fundsUsing} fund{protocol.fundsUsing !== 1 ? "s" : ""}</p>
          <p className="text-xs text-gray-400 mt-1">PersonalFunds routed here</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t border-gray-100">
        <button
          onClick={() => onToggle(protocol.protocolAddress, protocol.isActive)}
          className={`btn btn-sm flex-1 ${protocol.isActive ? "btn-danger" : "btn-secondary"}`}
        >
          {protocol.isActive ? "⏸ Deactivate" : "▶ Activate"}
        </button>
        {!protocol.verified && protocol.isActive && (
          <button
            onClick={() => onVerify(protocol.protocolAddress)}
            className="btn btn-sm btn-gold flex-1"
          >
            ✓ Verify
          </button>
        )}
      </div>
    </div>
  );
}

function AddProtocolModal({
  onClose,
  onSubmit,
}: {
  onClose:  () => void;
  onSubmit: (form: AddProtocolForm) => void;
}) {
  const [form, setForm] = useState<AddProtocolForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  function set(field: keyof AddProtocolForm, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    if (!form.protocolAddress || !form.name || !form.apy) return;
    setSubmitting(true);
    // TODO: call ProtocolRegistry.addDeFiProtocol(address, name, apy_bps, riskLevel, category)
    await new Promise(r => setTimeout(r, 800));
    onSubmit(form);
    setSubmitting(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-brand-xl animate-slide-up">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-0!">Add DeFi Protocol</h2>
          <p className="text-xs text-gray-500 mb-0! mt-1">
            Registers a new adapter in ProtocolRegistry · requires authorized manager
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
              Protocol Address *
            </label>
            <input
              className="input font-mono text-sm"
              placeholder="0x…"
              value={form.protocolAddress}
              onChange={e => set("protocolAddress", e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-1">Must implement IDeFiProtocol (deposit/withdraw/getBalance)</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
              Protocol Name *
            </label>
            <input
              className="input"
              placeholder="e.g. Aave v3"
              value={form.name}
              onChange={e => set("name", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                APY (%) *
              </label>
              <input
                className="input"
                type="number"
                min="0"
                max="100"
                step="0.01"
                placeholder="e.g. 5.80"
                value={form.apy}
                onChange={e => set("apy", e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1">Stored as basis points (×100)</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                Risk Level
              </label>
              <select
                className="input"
                value={form.riskLevel}
                onChange={e => set("riskLevel", e.target.value)}
              >
                <option value="1">1 — Low</option>
                <option value="2">2 — Medium</option>
                <option value="3">3 — High</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
              Category
            </label>
            <select
              className="input"
              value={form.category}
              onChange={e => set("category", e.target.value)}
            >
              <option value="1">1 — DeFi (Aave, Compound, Yearn)</option>
              <option value="2">2 — RWA (Ondo, Maple, BUIDL)</option>
              <option value="3">3 — Equity (Backed Finance, tokenized stocks)</option>
              <option value="4">4 — Commodity (PAXG, tokenized commodities)</option>
              <option value="5">5 — Bond (sDAI, T-Bill stablecoins)</option>
            </select>
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
          <button className="btn btn-secondary btn-sm w-auto" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary btn-sm w-auto"
            onClick={handleSubmit}
            disabled={submitting || !form.protocolAddress || !form.name || !form.apy}
          >
            {submitting ? "Adding…" : "Add Protocol"}
          </button>
        </div>
      </div>
    </div>
  );
}

type FilterType = "all" | "active" | "inactive" | "verified";
type SortKey    = "apy" | "tvl" | "funds" | "name";

export default function ProtocolManager() {
  const [protocols, setProtocols] = useState<DeFiProtocol[]>(MOCK_PROTOCOLS);
  const [filter,    setFilter]    = useState<FilterType>("all");
  const [sortKey,   setSortKey]   = useState<SortKey>("tvl");
  const [showAdd,   setShowAdd]   = useState(false);

  const totalTvl    = protocols.reduce((s, p) => s + p.totalDeposited, 0);
  const activeCount = protocols.filter(p => p.isActive).length;
  const avgAPY      = protocols.filter(p => p.isActive).reduce((s, p) => s + p.apy, 0) / (activeCount || 1);

  const filtered = protocols
    .filter(p => {
      if (filter === "active")   return p.isActive;
      if (filter === "inactive") return !p.isActive;
      if (filter === "verified") return p.verified && p.isActive;
      return true;
    })
    .sort((a, b) => {
      if (sortKey === "apy")   return b.apy - a.apy;
      if (sortKey === "tvl")   return b.totalDeposited - a.totalDeposited;
      if (sortKey === "funds") return b.fundsUsing - a.fundsUsing;
      return a.name.localeCompare(b.name);
    });

  function handleToggle(addr: string, isActive: boolean) {
    // TODO: call registry.updateProtocol(addr, currentAPY, !isActive)
    setProtocols(prev =>
      prev.map(p => p.protocolAddress === addr ? { ...p, isActive: !isActive } : p)
    );
  }

  function handleVerify(addr: string) {
    // TODO: call registry.verifyProtocol(addr)
    setProtocols(prev =>
      prev.map(p => p.protocolAddress === addr ? { ...p, verified: true } : p)
    );
  }

  function handleAdd(form: AddProtocolForm) {
    const newProtocol: DeFiProtocol = {
      protocolAddress: form.protocolAddress,
      name:            form.name,
      category:        parseInt(form.category) as Category,
      apy:             Math.round(parseFloat(form.apy) * 100),
      isActive:        true,
      totalDeposited:  0,
      riskLevel:       parseInt(form.riskLevel) as RiskLevel,
      addedTimestamp:  Math.floor(Date.now() / 1000),
      verified:        false,
      fundsUsing:      0,
    };
    setProtocols(prev => [...prev, newProtocol]);
  }

  return (
    <div className="container-app py-6 sm:py-8 animate-fade-in">

      {/* ── Page title ── */}
      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div>
          <h1 className="text-2xl! sm:text-3xl! font-extrabold text-gray-900 mb-1!">
            Protocol Manager
          </h1>
          <p className="text-sm text-gray-500 mb-0!">
            ProtocolRegistry · manage DeFi adapters available to PersonalFunds
          </p>
        </div>
        <button
          className="btn btn-primary btn-sm w-auto"
          onClick={() => setShowAdd(true)}
        >
          + Add Protocol
        </button>
      </div>

      {/* ── Registry-wide stats ── */}
      <SectionHeader title="Registry Overview" sub="Aggregated from ProtocolRegistry.getGlobalStats()" />
      <div className="grid-responsive-4 mb-8">
        <div className="card">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Total Protocols</p>
          <p className="text-3xl font-extrabold text-gray-900 mb-1!">{protocols.length}</p>
          <p className="text-xs text-gray-400">{activeCount} active</p>
        </div>
        <div className="card">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Total Value Locked</p>
          <p className="text-2xl font-extrabold text-forest-green mb-1!">${totalTvl.toLocaleString()}</p>
          <p className="text-xs text-gray-400">USDC · all protocols</p>
        </div>
        <div className="card">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Average APY</p>
          <p className="text-3xl font-extrabold text-forest-green mb-1!">{formatAPY(Math.round(avgAPY))}</p>
          <p className="text-xs text-gray-400">across active protocols</p>
        </div>
        <div className="card">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Verified Protocols</p>
          <p className="text-3xl font-extrabold text-gray-900 mb-1!">
            {protocols.filter(p => p.verified).length}
          </p>
          <p className="text-xs text-gray-400">of {protocols.length} registered</p>
        </div>
      </div>

      {/* ── Filters & Sort ── */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Filter tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(["all", "active", "inactive", "verified"] as FilterType[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all capitalize ${
                filter === f
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              style={{ minHeight: "auto" }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-gray-500">Sort:</span>
          <select
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 outline-none"
            value={sortKey}
            onChange={e => setSortKey(e.target.value as SortKey)}
            style={{ minHeight: "auto" }}
          >
            <option value="tvl">TVL ↓</option>
            <option value="apy">APY ↓</option>
            <option value="funds">Funds using ↓</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>

        <p className="text-xs text-gray-400">{filtered.length} protocol{filtered.length !== 1 ? "s" : ""}</p>
      </div>

      {/* ── Protocol Cards ── */}
      <div className="grid-responsive-3">
        {filtered.map(protocol => (
          <ProtocolCard
            key={protocol.protocolAddress}
            protocol={protocol}
            totalTvl={totalTvl}
            onToggle={handleToggle}
            onVerify={handleVerify}
          />
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">🔍</p>
            <p className="font-semibold">No protocols match this filter</p>
          </div>
        )}
      </div>

      {/* ── Add Protocol Modal ── */}
      {showAdd && (
        <AddProtocolModal
          onClose={() => setShowAdd(false)}
          onSubmit={handleAdd}
        />
      )}
    </div>
  );
}