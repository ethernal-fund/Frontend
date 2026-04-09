import { useState, useEffect } from 'react';
import { useConnection, useChainId } from 'wagmi';
import { Droplets, CheckCircle, AlertCircle, Loader2, ExternalLink, RefreshCw } from 'lucide-react';
import { useFaucet } from '@/hooks/web3/useFaucet';
import type { FaucetResponse } from '@/services/faucet/faucet-client';

interface FaucetButtonProps {
  className?: string;
}

type Status = 'idle' | 'loading' | 'success' | 'error';

const EXPLORER_URL = import.meta.env.VITE_EXPLORER_URL || 'https://sepolia.arbiscan.io';

export function FaucetButton({ className = '' }: FaucetButtonProps) {
  const { address, isConnected } = useConnection();
  const chainId                  = useChainId();
  const { requestTokens, loading, error: faucetError, clearError } = useFaucet();

  const [status,   setStatus]   = useState<Status>('idle');
  const [result,   setResult]   = useState<FaucetResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setStatus('idle');
    setResult(null);
    setErrorMsg(null);
    clearError();
  }, [address, chainId]);

  const handleRequest = async () => {
    if (!address || !isConnected) return;

    setStatus('loading');
    setResult(null);
    setErrorMsg(null);
    clearError();

    try {
      const res = await requestTokens({ address });

      if (res.success) {
        setStatus('success');
        setResult(res);
      } else {
        setStatus('error');
        setErrorMsg(res.message || 'El faucet no pudo procesar la solicitud.');
      }
    } catch (err) {
      setStatus('error');
      setErrorMsg(
        faucetError ??
        (err instanceof Error ? err.message : 'Error al conectar con el faucet.')
      );
    }
  };

  const handleReset = () => {
    setStatus('idle');
    setResult(null);
    setErrorMsg(null);
    clearError();
  };

  if (!isConnected || !address) {
    return (
      <div className={`bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 ${className}`}>
        <div className="flex items-center gap-3">
          <AlertCircle className="text-amber-500 shrink-0" size={20} />
          <p className="text-amber-800 text-sm font-medium">
            Conectá tu wallet para recibir USDC de prueba.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'success' && result) {
    const explorerUrl = result.tx_hash
      ? `${EXPLORER_URL}/tx/${result.tx_hash}`
      : null;

    return (
      <div className={`bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-5 ${className}`}>
        <div className="flex items-start gap-3 mb-4">
          <CheckCircle className="text-emerald-600 shrink-0 mt-0.5" size={24} />
          <div>
            <p className="font-bold text-emerald-800 text-base">{result.message}</p>
            {result.amount && (
              <p className="text-emerald-700 text-sm mt-1">
                USDC recibido: <strong>{result.amount.toLocaleString()} USDC</strong>
              </p>
            )}
            {result.balance !== null && result.balance !== undefined && (
              <p className="text-emerald-600 text-xs mt-0.5">
                Balance actual: {result.balance.toLocaleString()} USDC
              </p>
            )}
          </div>
        </div>

        {explorerUrl && (
          <div className="flex flex-wrap gap-2 mb-3">
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-1.5 rounded-lg transition"
            >
              <ExternalLink size={12} />
              Ver transacción
            </a>
          </div>
        )}

        <button
          onClick={handleReset}
          className="inline-flex items-center gap-2 text-xs text-emerald-700 hover:text-emerald-900 font-medium transition"
        >
          <RefreshCw size={12} />
          Solicitar de nuevo
        </button>
      </div>
    );
  }

  if (status === 'error') {
    const isRateLimit =
      errorMsg?.toLowerCase().includes('rate') ||
      errorMsg?.toLowerCase().includes('limit') ||
      errorMsg?.toLowerCase().includes('espera') ||
      errorMsg?.toLowerCase().includes('24');

    return (
      <div className={`bg-red-50 border-2 border-red-200 rounded-2xl p-5 ${className}`}>
        <div className="flex items-start gap-3 mb-3">
          <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={22} />
          <div>
            <p className="font-bold text-red-800 text-sm">
              {isRateLimit ? 'Límite de solicitudes alcanzado' : 'Error al solicitar tokens'}
            </p>
            <p className="text-red-700 text-xs mt-1">{errorMsg}</p>
            {isRateLimit && (
              <p className="text-red-600 text-xs mt-1">
                El faucet permite una solicitud cada 24 horas por wallet.
              </p>
            )}
          </div>
        </div>
        <button
          onClick={handleReset}
          className="inline-flex items-center gap-2 text-xs text-red-700 hover:text-red-900 font-medium transition"
        >
          <RefreshCw size={12} />
          Intentar de nuevo
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Wallet info */}
      <div className="bg-white/60 rounded-xl px-3 py-2 border border-blue-200 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="font-mono text-xs text-gray-600 truncate">
          {address.slice(0, 10)}…{address.slice(-8)}
        </span>
      </div>

      {/* What you'll receive */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white/70 rounded-xl p-3 border border-blue-100 text-center">
          <p className="text-xs text-gray-500 mb-0.5">MockUSDC</p>
          <p className="font-black text-emerald-700 text-lg">~10,000</p>
          <p className="text-xs text-gray-400">para tu fondo</p>
        </div>
        <div className="bg-white/70 rounded-xl p-3 border border-blue-100 text-center">
          <p className="text-xs text-gray-500 mb-0.5">ETH gas</p>
          <p className="font-black text-indigo-700 text-lg">~0.01</p>
          <p className="text-xs text-gray-400">para transacciones</p>
        </div>
      </div>

      {/* Main CTA */}
      <button
        onClick={handleRequest}
        disabled={loading || status === 'loading'}
        className="w-full inline-flex items-center justify-center gap-3 px-5 py-3.5 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all transform hover:scale-105 disabled:scale-100 shadow-lg"
      >
        {(loading || status === 'loading') ? (
          <>
            <Loader2 size={20} className="animate-spin" />
            Minteando USDC…
          </>
        ) : (
          <>
            <Droplets size={20} />
            Recibir USDC de Prueba
          </>
        )}
      </button>

      <p className="text-center text-xs text-gray-400">
        USDC en Arbitrum Sepolia · Límite: 1 solicitud / 24 hs por wallet
      </p>
    </div>
  );
}

export default FaucetButton;