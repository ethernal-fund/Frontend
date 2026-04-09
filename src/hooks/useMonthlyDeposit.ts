import { useState, useCallback }                         from 'react';
import { usePublicClient, useWalletClient, useChainId }  from 'wagmi';
import { useReadContract }                               from 'wagmi';
import { getContractAddresses }                          from '@/config/addresses';
import { PERSONAL_FUND_ABI, ERC20_ABI }                 from '@/config/abis';
import { useToast }                                      from '@/stores/uiStore';

function getExplorerUrl(chainId: number, txHash: string): string {
  const explorers: Record<number, string> = {
    1:        'https://etherscan.io/tx/',
    8453:     'https://basescan.org/tx/',
    84532:    'https://sepolia.basescan.org/tx/',
    137:      'https://polygonscan.com/tx/',
    42161:    'https://arbiscan.io/tx/',
    10:       'https://optimistic.etherscan.io/tx/',
  };
  const base = explorers[chainId] ?? 'https://etherscan.io/tx/';
  return `${base}${txHash}`;
}

const MONTHLY_TIMING_ABI = [
  { name: 'lastMonthlyDepositTime', type: 'function', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { name: 'missedMonths',           type: 'function', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
] as const;

const MONTHLY_INTERVAL = 2_592_000; // 30 días en segundos — igual que el contrato

export type MonthlyDepositStatus =
  | 'idle' | 'approving' | 'depositing' | 'success' | 'error';

interface UseMonthlyDepositOptions {
  fundAddress:   `0x${string}` | null;
  monthlyAmount: bigint; // wei USDC — monthlyDeposit del contrato
}

export function useMonthlyDeposit({ fundAddress, monthlyAmount }: UseMonthlyDepositOptions) {
  const chainId                = useChainId();
  const publicClient           = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const toast                  = useToast();
  const contracts              = getContractAddresses(chainId);

  const [status,   setStatus]   = useState<MonthlyDepositStatus>('idle');
  const [txHash,   setTxHash]   = useState<`0x${string}` | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: lastDepositTime, refetch: refetchTime } = useReadContract({
    address:      fundAddress ?? undefined,
    abi:          MONTHLY_TIMING_ABI,
    functionName: 'lastMonthlyDepositTime',
    query:        { enabled: !!fundAddress },
  });

  const { data: missedMonths } = useReadContract({
    address:      fundAddress ?? undefined,
    abi:          MONTHLY_TIMING_ABI,
    functionName: 'missedMonths',
    query:        { enabled: !!fundAddress },
  });

  // Calcular si el depósito está disponible 
  const lastTime    = Number(lastDepositTime ?? 0n);
  const nextTime    = lastTime + MONTHLY_INTERVAL;
  const nowSec      = Math.floor(Date.now() / 1000);
  const canDeposit  = nowSec >= nextTime;
  const secondsLeft = Math.max(nextTime - nowSec, 0);

  function extractMsg(err: unknown): string {
    if (err instanceof Error) {
      return (
        err.message
          .replace(/^.*ContractFunctionExecutionError:\s*/s, '')
          .split('\n')[0]
        ?? 'Error desconocido'
      );
    }
    return 'Error desconocido';
  }

  // Ejecutar depósito mensual 
  const deposit = useCallback(async () => {
    if (!walletClient || !publicClient) { toast.error('Wallet no conectada');                   return; }
    if (!fundAddress)                   { toast.error('Fondo no encontrado');                   return; }
    if (!contracts)                     { toast.error('Red no soportada');                      return; }
    if (!canDeposit)                    { toast.error('Depósito mensual aún no disponible');    return; }

    setStatus('approving');
    setErrorMsg(null);
    setTxHash(null);

    try {
      const gasA = await publicClient.estimateContractGas({
        address: contracts.usdc, abi: ERC20_ABI, functionName: 'approve',
        args: [fundAddress, monthlyAmount], account: walletClient.account,
      }).catch(() => undefined);

      const approveTx = await walletClient.writeContract({
        address: contracts.usdc, abi: ERC20_ABI, functionName: 'approve',
        args: [fundAddress, monthlyAmount],
        ...(gasA ? { gas: gasA * 120n / 100n } : {}),
      });
      toast.info('Aprobación enviada — esperando confirmación…');
      await publicClient.waitForTransactionReceipt({ hash: approveTx });

      setStatus('depositing');
      const gasD = await publicClient.estimateContractGas({
        address: fundAddress, abi: PERSONAL_FUND_ABI, functionName: 'depositMonthly',
        account: walletClient.account,
      }).catch(() => undefined);

      const depositTx = await walletClient.writeContract({
        address: fundAddress, abi: PERSONAL_FUND_ABI, functionName: 'depositMonthly',
        ...(gasD ? { gas: gasD * 120n / 100n } : {}),
      });

      setTxHash(depositTx);
      toast.info('Depósito enviado — confirmando…');
      await publicClient.waitForTransactionReceipt({ hash: depositTx });

      setStatus('success');
      toast.success('¡Depósito mensual realizado! 🎉');
      void refetchTime();
    } catch (err) {
      const msg = extractMsg(err);
      setStatus('error');
      setErrorMsg(msg);
      toast.error(msg);
    }
  }, [walletClient, publicClient, fundAddress, monthlyAmount, contracts, canDeposit, toast, refetchTime]);

  const reset = useCallback(() => {
    setStatus('idle');
    setTxHash(null);
    setErrorMsg(null);
  }, []);

  return {
    status,
    txHash,
    errorMsg,
    canDeposit,
    secondsLeft,
    missedMonths: Number(missedMonths ?? 0n),
    isLoading: status === 'approving' || status === 'depositing',
    deposit,
    reset,
    explorerUrl: txHash ? getExplorerUrl(chainId, txHash) : null,
  };
}