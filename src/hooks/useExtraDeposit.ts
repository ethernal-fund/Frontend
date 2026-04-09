import { useState, useCallback }                         from 'react';
import { usePublicClient, useWalletClient, useChainId }  from 'wagmi';
import { useReadContracts }                              from 'wagmi';
import { getContractAddresses }                          from '@/config/addresses';
import { PERSONAL_FUND_ABI, ERC20_ABI }                 from '@/config/abis';
import { useToast }                                      from '@/stores/uiStore';
import { toUsdcBigInt }                                  from '@/lib/calculator';

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

const EXTRA_GRACE = 86_400; // 24h en segundos — igual que el contrato

export type ExtraDepositStatus =
  | 'idle' | 'approving' | 'depositing' | 'reclaiming' | 'success' | 'error';

interface UseExtraDepositOptions {
  fundAddress: `0x${string}` | null;
}

const EXTRA_DEPOSIT_ABI = [
  { name: 'lastExtraDepositTime',  type: 'function', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { name: 'lastExtraDepositGross', type: 'function', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { name: 'lastExtraDepositNet',   type: 'function', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { name: 'extraReclaimUsed',      type: 'function', inputs: [], outputs: [{ type: 'bool'    }], stateMutability: 'view' },
] as const;

export function useExtraDeposit({ fundAddress }: UseExtraDepositOptions) {
  const chainId                = useChainId();
  const publicClient           = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const toast                  = useToast();
  const contracts              = getContractAddresses(chainId);
  const [status,   setStatus]   = useState<ExtraDepositStatus>('idle');
  const [txHash,   setTxHash]   = useState<`0x${string}` | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: results, refetch } = useReadContracts({
    contracts: fundAddress ? [
      { address: fundAddress, abi: EXTRA_DEPOSIT_ABI, functionName: 'lastExtraDepositTime'  },
      { address: fundAddress, abi: EXTRA_DEPOSIT_ABI, functionName: 'lastExtraDepositGross' },
      { address: fundAddress, abi: EXTRA_DEPOSIT_ABI, functionName: 'lastExtraDepositNet'   },
      { address: fundAddress, abi: EXTRA_DEPOSIT_ABI, functionName: 'extraReclaimUsed'      },
    ] : [],
    query: { enabled: !!fundAddress },
  });

  const lastExtraTime   = Number((results?.[0]?.status === 'success' ? results[0].result : 0n) as bigint);
  const lastExtraGross  =       (results?.[1]?.status === 'success' ? results[1].result : 0n) as bigint;
  const lastExtraNet    =       (results?.[2]?.status === 'success' ? results[2].result : 0n) as bigint;
  const reclaimUsed     =       (results?.[3]?.status === 'success' ? results[3].result : true) as boolean;
  const nowSec           = Math.floor(Date.now() / 1000);
  const graceEnd         = lastExtraTime + EXTRA_GRACE;
  const inGrace          = !reclaimUsed && lastExtraTime > 0 && nowSec <= graceEnd && lastExtraNet > 0n;
  const graceSecondsLeft = Math.max(graceEnd - nowSec, 0);

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

  const deposit = useCallback(async (amountUsdc: number) => {
    if (!walletClient || !publicClient) { toast.error('Wallet no conectada');    return; }
    if (!fundAddress)                   { toast.error('Fondo no encontrado');    return; }
    if (!contracts)                     { toast.error('Red no soportada');       return; }
    if (amountUsdc < 1)                 { toast.error('Monto mínimo: 1 USDC');  return; }

    const amountWei = toUsdcBigInt(amountUsdc);

    setStatus('approving');
    setErrorMsg(null);
    setTxHash(null);

    try {
      const gasA = await publicClient.estimateContractGas({
        address: contracts.usdc, abi: ERC20_ABI, functionName: 'approve',
        args: [fundAddress, amountWei], account: walletClient.account,
      }).catch(() => undefined);

      const approveTx = await walletClient.writeContract({
        address: contracts.usdc, abi: ERC20_ABI, functionName: 'approve',
        args: [fundAddress, amountWei],
        ...(gasA ? { gas: gasA * 120n / 100n } : {}),
      });
      toast.info('Aprobación enviada — esperando confirmación…');
      await publicClient.waitForTransactionReceipt({ hash: approveTx });

      setStatus('depositing');
      const gasD = await publicClient.estimateContractGas({
        address: fundAddress, abi: PERSONAL_FUND_ABI, functionName: 'depositExtra',
        args: [amountWei], account: walletClient.account,
      }).catch(() => undefined);

      const depositTx = await walletClient.writeContract({
        address: fundAddress, abi: PERSONAL_FUND_ABI, functionName: 'depositExtra',
        args: [amountWei],
        ...(gasD ? { gas: gasD * 120n / 100n } : {}),
      });

      setTxHash(depositTx);
      toast.info('Depósito extra enviado — confirmando…');
      await publicClient.waitForTransactionReceipt({ hash: depositTx });

      setStatus('success');
      toast.success(`¡$${amountUsdc.toFixed(2)} USDC depositados! Tenés 24h para reclamar si fue un error.`);
      void refetch();
    } catch (err) {
      const msg = extractMsg(err);
      setStatus('error');
      setErrorMsg(msg);
      toast.error(msg);
    }
  }, [walletClient, publicClient, fundAddress, contracts, toast, refetch]);

  // Reclaim extra deposit (dentro de las 24h, con 1% de penalidad) 
  const reclaim = useCallback(async () => {
    if (!walletClient || !publicClient) { toast.error('Wallet no conectada');         return; }
    if (!fundAddress)                   { toast.error('Fondo no encontrado');         return; }
    if (!inGrace)                       { toast.error('Período de gracia expirado'); return; }

    setStatus('reclaiming');
    setErrorMsg(null);
    setTxHash(null);

    try {
      const gasR = await publicClient.estimateContractGas({
        address: fundAddress, abi: PERSONAL_FUND_ABI, functionName: 'reclaimExtraDeposit',
        account: walletClient.account,
      }).catch(() => undefined);

      const tx = await walletClient.writeContract({
        address: fundAddress, abi: PERSONAL_FUND_ABI, functionName: 'reclaimExtraDeposit',
        ...(gasR ? { gas: gasR * 120n / 100n } : {}),
      });

      setTxHash(tx);
      toast.info('Reclamando depósito — confirmando…');
      await publicClient.waitForTransactionReceipt({ hash: tx });

      setStatus('success');
      toast.success('Depósito reclamado (1% de penalidad descontada)');
      void refetch();
    } catch (err) {
      const msg = extractMsg(err);
      setStatus('error');
      setErrorMsg(msg);
      toast.error(msg);
    }
  }, [walletClient, publicClient, fundAddress, inGrace, toast, refetch]);

  const reset = useCallback(() => {
    setStatus('idle');
    setTxHash(null);
    setErrorMsg(null);
  }, []);

  return {
    status,
    txHash,
    errorMsg,
    inGrace,
    graceSecondsLeft,
    lastExtraGross,
    lastExtraNet,
    isLoading: status === 'approving' || status === 'depositing' || status === 'reclaiming',
    deposit,
    reclaim,
    reset,
    explorerUrl: txHash ? getExplorerUrl(chainId, txHash) : null,
  };
}