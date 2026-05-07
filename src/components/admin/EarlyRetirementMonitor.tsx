// EarlyRetirementMonitor.tsx
//
// Reads EarlyRetirementApproved events from Treasury on all deployed chains,
// then for each approved fund reads on-chain state from PersonalFund:
//   - totalBalance      → remaining funds
//   - totalWithdrawn    → how much the user already pulled out
//   - owner             → user's wallet
//   - retirementStarted → whether the fund entered retirement mode
//
// Data flow:
//   1. usePublicClient per chain → getLogs(EarlyRetirementApproved) from block 0
//   2. useReadContracts multicall → fund state per approved address
//   3. Derived: balanceAtApproval = totalBalance + totalWithdrawn (approx)
//      (exact value would need the event or a snapshot — we derive it here)
//
// Chains: Sepolia (11155111) · Arbitrum Sepolia (421614) · Polygon Amoy (80002)
//
// TODO: replace MOCK_APPROVED_FUNDS with real on-chain data once ABI/addresses
//       are wired in via getContractAddresses(chainId) + TREASURY_ABI + FUND_ABI

import { useState } from "react";

interface ApprovedFund {
  fundAddress:      string;
  owner:            string;
  approvedAt:       number;   // unix timestamp
  approvedBy:       string;   // admin address that approved
  chain:            ChainInfo;
  // on-chain state
  totalBalance:     number;   // USDC (already divided by 1e6 for display)
  totalWithdrawn:   number;
  retirementStarted: boolean;
  // derived
  balanceAtApproval: number;  // totalBalance + totalWithdrawn
  penaltyCharged:    number;  // balanceAtApproval * 0.07
}

interface ChainInfo {
  id:    number;
  name:  string;
  color: string;        // tailwind bg class
  text:  string;        // tailwind text class
  dot:   string;        // hex for status dot
}

const CHAINS: Record<number, ChainInfo> = {
  11155111: { id: 11155111, name: "Sepolia",          color: "bg-blue-100",   text: "text-blue-700",   dot: "#3b82f6" },
  421614:   { id: 421614,   name: "Arb Sepolia",      color: "bg-purple-100", text: "text-purple-700", dot: "#7c3aed" },
  80002:    { id: 80002,    name: "Polygon Amoy",     color: "bg-fuchsia-100",text: "text-fuchsia-700",dot: "#a21caf" },
};

const MOCK_APPROVED_FUNDS: ApprovedFund[] = [
  {
    fundAddress:       "0x3f2a…d41c",
    owner:             "0xABC1…0001",
    approvedAt:        1_743_200_000,
    approvedBy:        "0xAdm…F00D",
    chain:             CHAINS[421614]!,
    totalBalance:      8_400,
    totalWithdrawn:    3_100,
    retirementStarted: true,
    balanceAtApproval: 12_366,   // (8400 + 3100) / (1 - 0.07) ≈ 12,366
    penaltyCharged:    865.62,
  },
  {
    fundAddress:       "0x88bc…991a",
    owner:             "0xDEF2…0002",
    approvedAt:        1_742_900_000,
    approvedBy:        "0xAdm…F00D",
    chain:             CHAINS[11155111]!,
    totalBalance:      0,
    totalWithdrawn:    21_500,
    retirementStarted: true,
    balanceAtApproval: 23_118,
    penaltyCharged:    1_618.26,
  },
  {
    fundAddress:       "0xa91e…3301",
    owner:             "0x1122…0003",
    approvedAt:        1_743_550_000,
    approvedBy:        "0xAdm…F00D",
    chain:             CHAINS[80002]!,
    totalBalance:      5_200,
    totalWithdrawn:    0,
    retirementStarted: true,
    balanceAtApproval: 5_591,
    penaltyCharged:    391.37,
  },
];

function fmt(n: number, dec = 2): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
}

function fmtDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString("en-US", {
    month: "short",
    day:   "numeric",
    year:  "numeric",
  });
}

function timeAgo(ts: number): string {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function withdrawnPct(fund: ApprovedFund): number {
  if (fund.balanceAtApproval <= 0) return 100;
  return Math.min(100, Math.round((fund.totalWithdrawn / fund.balanceAtApproval) * 100));
}

function ChainBadge({ chain }: { chain: ChainInfo }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${chain.color} ${chain.text}`}>
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: chain.dot }}
      />
      {chain.name}
    </span>
  );
}

function StatusBadge({ fund }: { fund: ApprovedFund }) {
  const done = fund.totalBalance === 0;
  return done ? (
    <span className="badge badge-success text-xs">Completed</span>
  ) : (
    <span className="badge badge-warning text-xs">Draining</span>
  );
}

function WithdrawalBar({ fund }: { fund: ApprovedFund }) {
  const pct  = withdrawnPct(fund);
  const done = fund.totalBalance === 0;
  return (
    <div className="mt-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-gray-500">
          Withdrawn: <strong className="text-gray-800">${fmt(fund.totalWithdrawn)}</strong>
          {" "}/ ${fmt(fund.balanceAtApproval)} USDC
        </span>
        <span className={`text-xs font-bold ${done ? "text-green-600" : "text-yellow-600"}`}>
          {pct}%
        </span>
      </div>
      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${done ? "bg-green-500" : "gradient-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {!done && (
        <p className="text-xs text-gray-400 mt-1">
          Remaining: <strong className="text-gray-700">${fmt(fund.totalBalance)}</strong> USDC
        </p>
      )}
    </div>
  );
}

function FundCard({ fund }: { fund: ApprovedFund }) {
  const done = fund.totalBalance === 0;

  return (
    <div className={`card transition-all duration-200 hover:shadow-brand-lg ${done ? "opacity-75" : ""}`}>

      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <ChainBadge chain={fund.chain} />
            <StatusBadge fund={fund} />
          </div>
          <p className="text-xs font-mono font-semibold text-dark-blue mt-1 truncate">
            {fund.fundAddress}
          </p>
          <p className="text-xs font-mono text-gray-400 truncate">
            Owner: {fund.owner}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-gray-400">{timeAgo(fund.approvedAt)}</p>
          <p className="text-xs text-gray-300 mt-0.5">{fmtDate(fund.approvedAt)}</p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2 mb-1">
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">At Approval</p>
          <p className="text-sm font-bold text-gray-900">${fmt(fund.balanceAtApproval, 0)}</p>
        </div>
        <div className="bg-red-50 rounded-lg p-2 text-center">
          <p className="text-[10px] text-red-400 uppercase tracking-wider mb-0.5">Penalty (7%)</p>
          <p className="text-sm font-bold text-red-600">-${fmt(fund.penaltyCharged, 0)}</p>
        </div>
        <div className={`rounded-lg p-2 text-center ${done ? "bg-green-50" : "bg-yellow-50"}`}>
          <p className={`text-[10px] uppercase tracking-wider mb-0.5 ${done ? "text-green-400" : "text-yellow-500"}`}>
            Remaining
          </p>
          <p className={`text-sm font-bold ${done ? "text-green-600" : "text-yellow-700"}`}>
            {done ? "—" : `$${fmt(fund.totalBalance, 0)}`}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <WithdrawalBar fund={fund} />

      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
        <p className="text-[10px] text-gray-400 font-mono">
          Approved by: {fund.approvedBy}
        </p>
        {done && (
          <span className="text-[10px] text-green-600 font-semibold">✓ Fund fully drained</span>
        )}
      </div>
    </div>
  );
}

type StatusFilter = "all" | "draining" | "completed";
type ChainFilter  = "all" | string;   // chain id as string or "all"
function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-0!">{title}</h2>
      {sub && <p className="text-xs text-gray-400 mb-0! mt-0.5">{sub}</p>}
    </div>
  );
}

export default function EarlyRetirementMonitor() {
  // TODO: replace with wagmi hooks when ABIs/addresses are ready
  // Real implementation sketch:
  //
  // const clients = {
  //   11155111: usePublicClient({ chainId: 11155111 }),
  //   421614:   usePublicClient({ chainId: 421614 }),
  //   80002:    usePublicClient({ chainId: 80002 }),
  // }
  //
  // For each client:
  //   const logs = await client.getLogs({
  //     address: getContractAddresses(chainId).treasury,
  //     event:   parseAbiItem('event EarlyRetirementApproved(address indexed fundAddress, address indexed approver, uint256 timestamp)'),
  //     fromBlock: DEPLOYMENT_BLOCK,
  //   })
  //
  // Then useReadContracts to batch-read each fund:
  //   { address: fundAddr, abi: PERSONAL_FUND_ABI, functionName: 'totalBalance' }
  //   { address: fundAddr, abi: PERSONAL_FUND_ABI, functionName: 'totalWithdrawn' }
  //   { address: fundAddr, abi: PERSONAL_FUND_ABI, functionName: 'owner' }
  //   { address: fundAddr, abi: PERSONAL_FUND_ABI, functionName: 'retirementStarted' }

  const [funds]        = useState<ApprovedFund[]>(MOCK_APPROVED_FUNDS);
  const [isLoading]    = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [chainFilter,  setChainFilter]  = useState<ChainFilter>("all");

  // Derived totals
  const totalPenalties = funds.reduce((s, f) => s + f.penaltyCharged, 0);
  const totalDrained   = funds.reduce((s, f) => s + f.totalWithdrawn, 0);
  const doneCount      = funds.filter(f => f.totalBalance === 0).length;
  const activeCount    = funds.length - doneCount;

  // Filter
  const filtered = funds.filter(f => {
    const matchStatus =
      statusFilter === "all"       ? true :
      statusFilter === "draining"  ? f.totalBalance > 0 :
      f.totalBalance === 0;
    const matchChain =
      chainFilter === "all" ? true : f.chain.id === Number(chainFilter);
    return matchStatus && matchChain;
  });

  const uniqueChains = [...new Set(funds.map(f => f.chain.id))];

  if (isLoading) {
    return (
      <div className="card animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
        <div className="h-20 bg-gray-100 rounded" />
      </div>
    );
  }

  return (
    <div>
      <SectionHeader
        title="Early Retirement Monitor"
        sub="Approved funds — penalty applied at approval · draining until totalBalance = 0"
      />

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="card border-l-4 border-l-yellow-400 py-3!">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Active</p>
          <p className="text-2xl font-extrabold text-yellow-600 mb-0!">{activeCount}</p>
          <p className="text-xs text-gray-400">still draining</p>
        </div>
        <div className="card border-l-4 border-l-green-500 py-3!">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Completed</p>
          <p className="text-2xl font-extrabold text-green-600 mb-0!">{doneCount}</p>
          <p className="text-xs text-gray-400">fully drained</p>
        </div>
        <div className="card border-l-4 border-l-red-400 py-3!">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Penalties Collected</p>
          <p className="text-xl font-extrabold text-red-600 mb-0!">${fmt(totalPenalties, 0)}</p>
          <p className="text-xs text-gray-400">USDC · 7% per approval</p>
        </div>
        <div className="card border-l-4 border-l-forest-green py-3!">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Withdrawn</p>
          <p className="text-xl font-extrabold text-forest-green mb-0!">${fmt(totalDrained, 0)}</p>
          <p className="text-xs text-gray-400">by users so far</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        {/* Status filter */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(["all", "draining", "completed"] as StatusFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all capitalize ${
                statusFilter === f
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              style={{ minHeight: "auto" }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Chain filter */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setChainFilter("all")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              chainFilter === "all"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
            style={{ minHeight: "auto" }}
          >
            All chains
          </button>
          {uniqueChains.map(id => {
            const chain = CHAINS[id];
            return (
              <button
                key={id}
                onClick={() => setChainFilter(String(id))}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  chainFilter === String(id)
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                style={{ minHeight: "auto" }}
              >
                {chain?.name ?? `Chain ${id}`}
              </button>
            );
          })}
        </div>

        <p className="text-xs text-gray-400 ml-auto">
          {filtered.length} fund{filtered.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Fund cards grid */}
      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-3xl mb-2">🏖️</p>
          <p className="text-sm text-gray-500">No approved early retirements match this filter</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(fund => (
            <FundCard key={`${fund.chain.id}-${fund.fundAddress}`} fund={fund} />
          ))}
        </div>
      )}

      {/* Data source note */}
      <p className="text-xs text-gray-400 mt-4">
        Source:{" "}
        <span className="font-mono">Treasury.EarlyRetirementApproved</span> events
        · fund state via{" "}
        <span className="font-mono">PersonalFund.totalBalance / totalWithdrawn</span>
        {" "}· queried across Sepolia, Arbitrum Sepolia, Polygon Amoy
      </p>
    </div>
  );
}