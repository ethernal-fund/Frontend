import { Wallet, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { useFund } from '@/hooks/useFund';
import { formatCurrency } from '@/lib';

// Types

interface USDCBalanceDisplayProps {
  requiredAmount?: bigint;
  showValidation?: boolean;
  className?: string;
}

// Color map — static classes so Tailwind v4 doesn't purge them 

type StateColor = 'green' | 'red' | 'purple';

const COLOR_MAP: Record<StateColor, { border: string; iconBg: string; icon: string }> = {
  green:  { border: 'border-green-200',  iconBg: 'bg-green-100',  icon: 'text-green-600'  },
  red:    { border: 'border-red-200',    iconBg: 'bg-red-100',    icon: 'text-red-600'    },
  purple: { border: 'border-purple-200', iconBg: 'bg-purple-100', icon: 'text-purple-600' },
};

// Helpers 

function deriveStateColor(params: {
  isError:        boolean;
  showValidation: boolean;
  hasEnough:      boolean;
}): StateColor {
  if (params.isError)                             return 'red';
  if (params.showValidation && params.hasEnough)  return 'green';
  if (params.showValidation && !params.hasEnough) return 'red';
  return 'purple';
}

// Component 

export const USDCBalanceDisplay = ({
  requiredAmount,
  showValidation = false,
  className = '',
}: USDCBalanceDisplayProps) => {
  const {
    usdcBalance: balanceRaw,
    isLoading,
    isError,
    refetch,
  } = useFund();

  const balance          = balanceRaw ?? 0n;
  const balanceUsdc      = Number(balance) / 1e6;
  const balanceFormatted = balanceUsdc.toFixed(2);

  const hasEnough =
    requiredAmount !== undefined ? balance >= requiredAmount : true;
  const requiredUsdc =
    requiredAmount !== undefined ? Number(requiredAmount) / 1e6 : null;
  const shortfallUsdc =
    requiredAmount !== undefined && !hasEnough
      ? Number(requiredAmount - balance) / 1e6
      : null;

  const stateColor = deriveStateColor({ isError, showValidation, hasEnough });
  const colors     = COLOR_MAP[stateColor];

  // Validation panel is only meaningful when data is available
  const showValidationPanel =
    showValidation        &&
    requiredAmount !== undefined &&
    requiredUsdc   !== null      &&
    !isLoading             &&
    !isError;

  return (
    <div
      className={`bg-white/90 backdrop-blur rounded-2xl shadow-lg p-6 border-2 ${colors.border} ${className}`}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${colors.iconBg}`}>
            <Wallet className={colors.icon} size={24} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-600">USDC Balance</p>
            <p className="text-xs text-gray-500">Testnet</p>
          </div>
        </div>

        <button
          onClick={() => void refetch()}
          disabled={isLoading}
          className="p-2 hover:bg-gray-100 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          title="Refresh balance"
          aria-label="Refresh balance"
        >
          <RefreshCw
            size={20}
            className={`text-gray-600 ${isLoading ? 'animate-spin' : ''}`}
          />
        </button>
      </div>

      {/* ── Balance ── */}
      <div className="mb-4">
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600" />
            <span className="text-lg font-semibold text-gray-400">Loading...</span>
          </div>
        ) : isError ? (
          <div className="flex items-center gap-2">
            <AlertCircle className="text-red-600" size={20} />
            <span className="text-lg font-semibold text-red-600">
              Error loading balance
            </span>
          </div>
        ) : (
          <div>
            <p className="text-4xl font-black text-gray-800">
              {formatCurrency(balanceUsdc)}
            </p>
            <p className="text-sm text-gray-500 mt-1">{balanceFormatted} USDC</p>
          </div>
        )}
      </div>

      {/* ── Validation panel ── */}
      {showValidationPanel && (
        <div
          className={`rounded-xl p-4 ${
            hasEnough
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}
        >
          <div className="flex items-start gap-3">
            {hasEnough ? (
              <CheckCircle className="text-green-600 shrink-0 mt-0.5" size={20} />
            ) : (
              <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={20} />
            )}

            <div className="flex-1">
              <p className={`font-semibold mb-1 ${hasEnough ? 'text-green-900' : 'text-red-900'}`}>
                {hasEnough ? 'Balance Sufficient' : 'Insufficient Balance'}
              </p>

              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className={hasEnough ? 'text-green-700' : 'text-red-700'}>
                    Required:
                  </span>
                  <span className="font-semibold">
                    {formatCurrency(requiredUsdc)}
                  </span>
                </div>

                {shortfallUsdc !== null && shortfallUsdc > 0 && (
                  <div className="flex justify-between">
                    <span className="text-red-700">Need:</span>
                    <span className="font-semibold text-red-800">
                      {formatCurrency(shortfallUsdc)} more
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default USDCBalanceDisplay;