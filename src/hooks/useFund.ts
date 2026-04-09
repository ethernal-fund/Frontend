import { useReadContract, useReadContracts } from 'wagmi';
import { useChainId }                        from 'wagmi';
import { useMemo }                           from 'react';
import { getContractAddresses }              from '@/config/addresses';
import { FACTORY_ABI, PERSONAL_FUND_ABI, ERC20_ABI } from '@/config/abis';
import type { FundInfoTuple }                from '@/config/abis';
import { useWalletStore }                    from '@/stores/walletStore';
import type { FundOnChain }                  from '@/types';

const ZERO_ADDR = '0x0000000000000000000000000000000000000000' as `0x${string}`;

export function useFundAddress() {
  const address   = useWalletStore((s) => s.address);
  const chainId   = useChainId();
  const contracts = getContractAddresses(chainId);

  return useReadContract({
    address:      contracts?.personalFundFactory,
    abi:          FACTORY_ABI,
    functionName: 'getUserFund',
    args:         address ? [address] : undefined,
    query:        { enabled: !!address && !!contracts?.personalFundFactory },
  });
}

export function useFund() {
  const { data: fundAddress, isLoading: loadingAddr, refetch } = useFundAddress();
  const owner     = useWalletStore((s) => s.address);
  const chainId   = useChainId();
  const contracts = getContractAddresses(chainId);

  const hasFund = !!fundAddress && fundAddress !== ZERO_ADDR;

  const { data: results, isLoading: loadingDetails } = useReadContracts({
    contracts: hasFund && owner && contracts
      ? [
          { address: fundAddress,             abi: PERSONAL_FUND_ABI, functionName: 'getFundInfo'     },
          { address: fundAddress,             abi: PERSONAL_FUND_ABI, functionName: 'getBalances'     },
          { address: fundAddress,             abi: PERSONAL_FUND_ABI, functionName: 'getTimelockInfo' },
          { address: contracts.usdc,          abi: ERC20_ABI,         functionName: 'balanceOf', args: [owner] },
        ]
      : [],
    query: { enabled: hasFund && !!owner && !!contracts },
  });

  const fund = useMemo<FundOnChain | null>(() => {
    if (!hasFund || !results) return null;
    const infoRes = results[0];
    if (infoRes?.status !== 'success') return null;

    const info = infoRes.result as unknown as FundInfoTuple;
    return {
      address:         fundAddress!,
      owner:           info[0],
      principal:       info[1],
      monthlyDeposit:  info[2],
      age:             0n,
      retirementAge:   info[3],
      desiredIncome:   0n,
      paymentYears:    0n,
      rateBps:         0n,
      timelockYears:   0n,
      protocolAddress: ZERO_ADDR,
      createdAt:       0n,
      isRetired:       info[10],
    };
  }, [hasFund, results, fundAddress]);

  type BalancesTuple = readonly [bigint, bigint, bigint];
  const balancesRes = results?.[1];
  const balances    = balancesRes?.status === 'success'
    ? (balancesRes.result as unknown as BalancesTuple)
    : null;

  type TimelockTuple = readonly [bigint, bigint, boolean];
  const timelockRes = results?.[2];
  const timelock    = timelockRes?.status === 'success'
    ? (timelockRes.result as unknown as TimelockTuple)
    : null;

  const usdcBalance = results?.[3]?.status === 'success'
    ? (results[3].result as bigint)
    : 0n;

  return {
    fundAddress:      hasFund ? fundAddress : null,
    hasFund,
    fund,
    totalBalance:     balances?.[0] ?? 0n,
    availableBalance: balances?.[1] ?? 0n,
    totalInvested:    balances?.[2] ?? 0n,
    timelockEnd:      timelock?.[1] ?? 0n,
    canRetire:        timelock?.[2] ?? false,
    usdcBalance,
    isLoading:        loadingAddr || loadingDetails,
    refetch,
  };
}
