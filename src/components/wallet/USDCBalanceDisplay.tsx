import { Wallet, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { useFund } from '@/hooks/useFund';
import { formatCurrency } from '@/lib';

interface USDCBalanceDisplayProps {
  requiredAmount?: bigint;
  showValidation?: boolean;
  className?: string;
}

export const USDCBalanceDisplay = ({
  requiredAmount,
  showValidation = false,
  className = '',
}: USDCBalanceDisplayProps) => {
  const {
    usdcBalance:  balanceRaw,
    isLoading,
    refetch,
  } = useFund();
  const error = false;

  const balance         = balanceRaw ?? 0n;
  const balanceUsdc     = Number(balance) / 1e6;
  const balanceFormatted = balanceUsdc.toFixed(2);
  const hasEnough = requiredAmount !== undefined
    ? balance >= requiredAmount
    : true;

  const requiredUsdc      = requiredAmount !== undefined ? Number(requiredAmount) / 1e6 : null;
  const shortfallUsdc     = requiredAmount !== undefined && !hasEnough
    ? Number(requiredAmount - balance) / 1e6
    : null;

  const stateColor = showValidation
    ? hasEnough ? 'green' : 'red'
    : 'purple';

  const borderClass  = `border-${stateColor}-200`;
  const iconBgClass  = `bg-${stateColor}-100`;
  const iconClass    = `text-${stateColor}-600`;

  return (
    <div className={`bg-white/90 backdrop-blur rounded-2xl shadow-lg p-6 border-2 ${borderClass} ${className}`}>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${iconBgClass}`}>
            <Wallet className={iconClass} size={24} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-600">USDC Balance</p>
            <p className="text-xs text-gray-500">Testnet</p>
          </div>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isLoading}
          className="p-2 hover:bg-gray-100 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          title="Refresh balance"
        >
          <RefreshCw
            size={20}
            className={`text-gray-600 ${isLoading ? 'animate-spin' : ''}`}
          />
        </button>
      </div>

      {/* Balance */}
      <div className="mb-4">
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600" />
            <span className="text-lg font-semibold text-gray-400">Loading...</span>
          </div>
        ) : error ? (
          <div className="flex items-center gap-2">
            <AlertCircle className="text-red-600" size={20} />
            <span className="text-lg font-semibold text-red-600">Error loading</span>
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

      {/* Validación */}
      {showValidation && requiredAmount !== undefined && (
        <div className={`rounded-xl p-4 ${
          hasEnough
            ? 'bg-green-50 border border-green-200'
            : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-start gap-3">
            {hasEnough
              ? <CheckCircle className="text-green-600 shrink-0 mt-0.5" size={20} />
              : <AlertCircle className="text-red-600 shrink-0 mt-0.5"  size={20} />
            }
            <div className="flex-1">
              <p className={`font-semibold mb-1 ${hasEnough ? 'text-green-900' : 'text-red-900'}`}>
                {hasEnough ? 'Balance Sufficient' : 'Insufficient Balance'}
              </p>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className={hasEnough ? 'text-green-700' : 'text-red-700'}>Required:</span>
                  <span className="font-semibold">{formatCurrency(requiredUsdc!)}</span>
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