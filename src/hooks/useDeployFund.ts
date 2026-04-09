import { useState, useCallback }                    from 'react';
import { usePublicClient, useWalletClient, useChainId } from 'wagmi';
import { parseAbiItem, decodeEventLog }             from 'viem';
import type { PublicClient }                        from 'viem';
import { getContractAddresses }                     from '@/config/addresses';
import { FACTORY_ABI, ERC20_ABI }                  from '@/config/abis';
import { useWizardStore }                           from '@/stores/wizardStore';
import { useToast }                                 from '@/stores/uiStore';
import { toUsdcBigInt }                             from '@/lib/calculator';

export type DeployStatus =
  | 'idle' | 'approving' | 'approved' | 'deploying' | 'success' | 'error';

const FUND_CREATED_EVENT = parseAbiItem(
  'event FundCreated(address indexed fundAddress, address indexed owner, uint256 initialDeposit, uint256 principal, uint256 monthlyDeposit, address selectedProtocol, uint256 retirementAge, uint256 timelockEnd, uint256 timestamp)'
);

async function getGasOverrides(publicClient: PublicClient) {
  try {
    const block = await publicClient.getBlock({ blockTag: 'latest' });
    const bump  = (val: bigint) => val * 120n / 100n;
    if (block.baseFeePerGas) {
      const maxPriorityFeePerGas = 1_000_000n;
      const maxFeePerGas         = bump(block.baseFeePerGas) + maxPriorityFeePerGas;
      return { maxFeePerGas, maxPriorityFeePerGas };
    }
    const gasPrice = await publicClient.getGasPrice();
    return { gasPrice: bump(gasPrice) };
  } catch {
    return {};
  }
}

export function useDeployFund() {
  const approvedFromStore = useWizardStore((s) => s.approved);
  const [status,   setStatus]   = useState<DeployStatus>(approvedFromStore ? 'approved' : 'idle');
  const [txHash,   setTxHash]   = useState<`0x${string}` | null>(null);
  const [fundAddr, setFundAddr] = useState<`0x${string}` | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const chainId                = useChainId();
  const publicClient           = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { result, calculator, selectedProtocol, setApproved, setTxHash: storeSetTxHash } =
    useWizardStore();
  const toast = useToast();

  // Resolve addresses for the current connected chain.
  // Returns null if the chain has no deployed contracts.
  const getAddresses = useCallback(() => {
    const addrs = getContractAddresses(chainId);
    if (!addrs) {
      toast.error(`No contracts deployed on chain ${chainId}`);
      return null;
    }
    return addrs;
  }, [chainId, toast]);

  const approveUsdc = useCallback(async () => {
    if (!walletClient || !publicClient) { toast.error('Wallet not connected'); return; }
    if (!result)                        { toast.error('Run the calculator first'); return; }

    const addrs = getAddresses();
    if (!addrs) return;

    const principal    = toUsdcBigInt(calculator.principal);
    const monthly      = toUsdcBigInt(result.monthlyGross);
    const totalApprove = principal + monthly;

    setStatus('approving');
    setErrorMsg(null);

    try {
      const gasOverrides = await getGasOverrides(publicClient);
      const hash = await walletClient.writeContract({
        address:      addrs.usdc,
        abi:          ERC20_ABI,
        functionName: 'approve',
        args:         [addrs.personalFundFactory, totalApprove],
        ...gasOverrides,
      });

      toast.info('Approval sent — waiting for confirmation…');
      await publicClient.waitForTransactionReceipt({ hash });

      setApproved(true);
      setStatus('approved');
      toast.success('USDC approved ✓');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Approval failed';
      setStatus('error');
      setErrorMsg(msg);
      toast.error(msg);
    }
  }, [walletClient, publicClient, result, calculator, getAddresses, setApproved, toast]);

  const deployFund = useCallback(async () => {
    if (!walletClient || !publicClient) { toast.error('Wallet not connected'); return; }
    if (!result || !selectedProtocol)   { toast.error('Complete the wizard first'); return; }

    const addrs = getAddresses();
    if (!addrs) return;

    const principal    = toUsdcBigInt(calculator.principal);
    const monthly      = toUsdcBigInt(result.monthlyGross);
    const desired      = toUsdcBigInt(calculator.desiredMonthlyIncome);
    const rateBps      = BigInt(Math.round(calculator.apyPercent * 100));
    const timelockYears = 0n; // Contract interprets 0 as "use protocol default" (see minTimelockYears on-chain)

    setStatus('deploying');
    setErrorMsg(null);

    const txArgs = [
      principal,
      monthly,
      BigInt(calculator.currentAge),
      BigInt(calculator.retirementAge),
      desired,
      BigInt(calculator.paymentYears),
      rateBps,
      timelockYears,
      selectedProtocol.address,
    ] as const;

    try {
      // Simulate first to get a readable revert reason instead of a gas estimation failure.
      let gasEstimate: bigint;
      try {
        gasEstimate = await publicClient.estimateContractGas({
          address:      addrs.personalFundFactory,
          abi:          FACTORY_ABI,
          functionName: 'createPersonalFund',
          args:         txArgs,
          account:      walletClient.account,
        });
        gasEstimate = gasEstimate * 120n / 100n;
      } catch (simErr) {
        const msg = simErr instanceof Error ? simErr.message : 'Transaction would revert';
        const clean = msg.replace(/^.*ContractFunctionExecutionError:\s*/s, '').split('\n')[0] ?? msg;
        setStatus('error');
        setErrorMsg(clean);
        toast.error(`Simulation failed: ${clean}`);
        return;
      }

      const gasOverrides = await getGasOverrides(publicClient);
      const hash = await walletClient.writeContract({
        address:      addrs.personalFundFactory,
        abi:          FACTORY_ABI,
        functionName: 'createPersonalFund',
        args:         txArgs,
        gas:          gasEstimate,
        ...gasOverrides,
      });

      setTxHash(hash);
      storeSetTxHash(hash);
      toast.info('Transaction sent — waiting for confirmation…');

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi:    [FUND_CREATED_EVENT],
            data:   log.data,
            topics: log.topics,
          });
          if (decoded.eventName === 'FundCreated') {
            setFundAddr(decoded.args.fundAddress);
            break;
          }
        } catch { /* log from a different contract, skip */ }
      }

      setStatus('success');
      toast.success('Fund deployed successfully! 🎉');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Deployment failed';
      setStatus('error');
      setErrorMsg(msg);
      toast.error(msg);
    }
  }, [walletClient, publicClient, result, calculator, selectedProtocol, getAddresses, storeSetTxHash, toast]);

  return { status, txHash, fundAddr, errorMsg, approveUsdc, deployFund };
}