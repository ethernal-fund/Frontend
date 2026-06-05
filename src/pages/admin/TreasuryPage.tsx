import { useState } from "react";
import { CheckCircle, RefreshCw, Wallet, Clock, TrendingUp, Users, DollarSign, BarChart3 } from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

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

interface SaleRound {
  id: number;
  name: string;
  status: 'upcoming' | 'active' | 'ended';
  price: number;           // USDC en decimal (ej: 0.01)
  hardCap: number;         // USDC total (ej: 1,000,000)
  raised: number;          // USDC recaudado
  walletCap: number;       // USDC máximo por wallet
  startTime: number;       // timestamp
  endTime: number;         // timestamp
  cliffMonths: number;
  vestingMonths: number;
  buyers: number;
  progressPct: number;
  
  // Datos de VestingETRF
  tokensReserved: number;               // ETRF reservados para esta ronda
  tokensSold: number;                   // ETRF vendidos
  unsoldAmount: number;                 // ETRF no vendidos = reserved - sold
  recoveryAvailableAt: number;          // timestamp cuando se puede recuperar
  recoveryUnlocked: boolean;            // true si ya pasó el timelock
  recovered: boolean;                   // true si ya se recuperaron los unsold
}

// ============================================================================
// MOCK DATA (TODO: reemplazar con datos reales del backend/chain)
// ============================================================================

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

const SALE_MOCK_ROUNDS: SaleRound[] = [
  {
    id: 0,
    name: "Seed Round",
    status: "ended",
    price: 0.01,
    hardCap: 1_000_000,
    raised: 1_000_000,
    walletCap: 50_000,
    startTime: 1740000000,
    endTime: 1742500000,
    cliffMonths: 12,
    vestingMonths: 36,
    buyers: 142,
    progressPct: 100,
    tokensReserved: 300_000_000,
    tokensSold: 300_000_000,
    unsoldAmount: 0,
    recoveryAvailableAt: 1742500000 + 90 * 86400,
    recoveryUnlocked: false,
    recovered: false,
  },
  {
    id: 1,
    name: "Private Round",
    status: "active",
    price: 0.015,
    hardCap: 2_000_000,
    raised: 1_250_000,
    walletCap: 100_000,
    startTime: 1745000000,
    endTime: 0,
    cliffMonths: 6,
    vestingMonths: 24,
    buyers: 89,
    progressPct: 62.5,
    tokensReserved: 200_000_000,
    tokensSold: 125_000_000,
    unsoldAmount: 75_000_000,
    recoveryAvailableAt: 0,
    recoveryUnlocked: false,
    recovered: false,
  },
  {
    id: 2,
    name: "Public Round",
    status: "upcoming",
    price: 0.025,
    hardCap: 3_000_000,
    raised: 0,
    walletCap: 150_000,
    startTime: 1747000000,
    endTime: 0,
    cliffMonths: 3,
    vestingMonths: 15,
    buyers: 0,
    progressPct: 0,
    tokensReserved: 200_000_000,
    tokensSold: 0,
    unsoldAmount: 200_000_000,
    recoveryAvailableAt: 0,
    recoveryUnlocked: false,
    recovered: false,
  },
];

// ============================================================================
// HELPERS
// ============================================================================

function fmt(n: number, decimals = 2): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtDate(ts: number): string {
  if (ts === 0) return "—";
  return new Date(ts * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function SectionHeader({ title, sub, icon }: { title: string; sub?: string; icon?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      {icon && <span className="text-forest-green">{icon}</span>}
      <div>
        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-0!">{title}</h2>
        {sub && <p className="text-xs text-gray-400 mb-0! mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function SaleRoundCard({ round, onRecover }: { round: SaleRound; onRecover: (roundId: number) => void }) {
  const [recovering, setRecovering] = useState(false);

  const handleRecover = async () => {
    setRecovering(true);
    // TODO: call VestingETRF.recover_unsold(round.id)
    await new Promise(r => setTimeout(r, 1500));
    onRecover(round.id);
    setRecovering(false);
  };

  const statusColor = {
    upcoming: "bg-gray-100 text-gray-600",
    active: "bg-green-100 text-green-700",
    ended: "bg-blue-100 text-blue-700",
  }[round.status];

  const statusText = {
    upcoming: "Próxima",
    active: "Activa",
    ended: "Finalizada",
  }[round.status];

  return (
    <div className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-gray-900">{round.name}</h3>
          <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor}`}>
            {statusText}
          </span>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Precio</p>
          <p className="font-mono font-bold text-forest-green">${round.price} USDC</p>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-500">Progreso</span>
          <span className="font-semibold">{round.progressPct.toFixed(1)}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${round.progressPct}%`,
              background: round.status === 'active' 
                ? 'linear-gradient(90deg, #897148, #c4a96a)'
                : '#10b981'
            }}
          />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
        <div>
          <p className="text-xs text-gray-400">Recaudado</p>
          <p className="font-semibold">${round.raised.toLocaleString()} USDC</p>
          <p className="text-xs text-gray-400">/ ${round.hardCap.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Compradores</p>
          <p className="font-semibold">{round.buyers}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Vesting</p>
          <p className="text-xs">{round.cliffMonths}m cliff + {round.vestingMonths}m linear</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Wallet Cap</p>
          <p className="font-semibold">${round.walletCap.toLocaleString()} USDC</p>
        </div>
      </div>

      {/* Tokens stats */}
      {(round.tokensReserved > 0 || round.tokensSold > 0) && (
        <div className="bg-gray-50 rounded-lg p-3 mb-4">
          <p className="text-xs font-semibold text-gray-600 mb-2">📊 Tokens ETRF</p>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <p className="text-gray-400">Reservados</p>
              <p className="font-mono font-bold">{round.tokensReserved.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-400">Vendidos</p>
              <p className="font-mono font-bold text-forest-green">{round.tokensSold.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-400">No vendidos</p>
              <p className={`font-mono font-bold ${round.unsoldAmount > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                {round.unsoldAmount.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Recovery button */}
      {round.status === 'ended' && round.unsoldAmount > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          {round.recovered ? (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle size={16} />
              <span>Tokens recuperados</span>
            </div>
          ) : round.recoveryUnlocked ? (
            <button
              onClick={handleRecover}
              disabled={recovering}
              className="w-full py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all"
              style={{ background: '#897148', color: '#f7f8f6' }}
            >
              {recovering ? (
                <><RefreshCw size={14} className="animate-spin" /> Recuperando...</>
              ) : (
                <><Wallet size={14} /> Recuperar {round.unsoldAmount.toLocaleString()} ETRF</>
              )}
            </button>
          ) : (
            <div className="flex items-center gap-2 text-amber-600 text-sm">
              <Clock size={14} />
              <span>
                Recovery disponible en {Math.ceil((round.recoveryAvailableAt - Math.floor(Date.now() / 1000)) / 86400)} días
              </span>
            </div>
          )}
        </div>
      )}
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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function TreasuryPage() {
  const [stats,          setStats]         = useState<TreasuryStats>(MOCK_STATS);
  const [funds,          setFunds]         = useState<FundRecord[]>(MOCK_FUNDS);
  const [saleRounds,     setSaleRounds]    = useState<SaleRound[]>(SALE_MOCK_ROUNDS);
  const [fundFilter,     setFundFilter]    = useState<FundFilter>("all");
  const [fundSort,       setFundSort]      = useState<FundSort>("fees_desc");
  const [search,         setSearch]        = useState("");
  const [showWithdraw,   setShowWithdraw]  = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<FundRecord | null>(null);

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

  function handleRecoverUnsold(roundId: number) {
    setSaleRounds(prev =>
      prev.map(r => 
        r.id === roundId ? { ...r, recovered: true, unsoldAmount: 0 } : r
      )
    );
    // TODO: mostrar toast de éxito
  }

  // Calcular estadísticas totales de la sale
  const totalRaised = saleRounds.reduce((s, r) => s + r.raised, 0);
  const totalBuyers = saleRounds.reduce((s, r) => s + r.buyers, 0);
  const totalTokensSold = saleRounds.reduce((s, r) => s + r.tokensSold, 0);
  const totalUnsold = saleRounds.reduce((s, r) => s + r.unsoldAmount, 0);

  return (
    <div className="container-app py-6 sm:py-8 animate-fade-in">

      {/* ── Page title ── */}
      <div className="mb-8">
        <h1 className="text-2xl! sm:text-3xl! font-extrabold text-gray-900 mb-1!">
          Treasury
        </h1>
        <p className="text-sm text-gray-500 mb-0!">
          Fee collection · fund registry · token sale management · withdrawal controls
        </p>
      </div>

      {/* ========================================================================
          SECTION 1: Treasury Overview Stats
      ======================================================================== */}
      <SectionHeader title="Treasury Overview" sub="Treasury.getTreasuryStats()" icon={<DollarSign size={16} />} />
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

      {/* ========================================================================
          SECTION 2: Token Sale Management
      ======================================================================== */}
      <SectionHeader 
        title="Token Sale Management" 
        sub="Venta de tokens ETRF · rondas · recuperación de no vendidos"
        icon={<BarChart3 size={16} />}
      />
      
      {/* Sale Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-3 border border-amber-100">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} className="text-amber-600" />
            <p className="text-xs text-gray-500">Total Recaudado</p>
          </div>
          <p className="text-xl font-bold text-amber-700">${fmt(totalRaised)} USDC</p>
        </div>
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-3 border border-blue-100">
          <div className="flex items-center gap-2 mb-1">
            <Users size={14} className="text-blue-600" />
            <p className="text-xs text-gray-500">Compradores Únicos</p>
          </div>
          <p className="text-xl font-bold text-blue-700">{totalBuyers}</p>
        </div>
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-3 border border-green-100">
          <div className="flex items-center gap-2 mb-1">
            <Wallet size={14} className="text-green-600" />
            <p className="text-xs text-gray-500">ETRF Vendidos</p>
          </div>
          <p className="text-xl font-bold text-green-700">{fmt(totalTokensSold, 0)}</p>
        </div>
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-3 border border-amber-100">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={14} className="text-amber-600" />
            <p className="text-xs text-gray-500">ETRF por Recuperar</p>
          </div>
          <p className="text-xl font-bold text-amber-700">{fmt(totalUnsold, 0)}</p>
        </div>
      </div>

      {/* Sale Rounds Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        {saleRounds.map(round => (
          <SaleRoundCard
            key={round.id}
            round={round}
            onRecover={handleRecoverUnsold}
          />
        ))}
      </div>

      {/* ========================================================================
          SECTION 3: Fee Management Actions
      ======================================================================== */}
      <SectionHeader title="Fee Management" sub="Admin actions · require wallet connection" icon={<DollarSign size={16} />} />
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

      {/* ========================================================================
          SECTION 4: Registered Funds Table
      ======================================================================== */}
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

      {/* ========================================================================
          MODALS
      ======================================================================== */}
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