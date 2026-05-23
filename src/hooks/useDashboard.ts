import { useMemo }                         from 'react'
import { useChainId, useReadContracts }    from 'wagmi'
import { useWalletStore }                  from '@/stores/walletStore'
import { useMyFund }                       from '@/hooks/useMyFund'
import { useFundAddress }                  from '@/hooks/useFund'
import { getContractAddresses }            from '@/config/addresses'
import { PERSONAL_FUND_ABI, ERC20_ABI }   from '@/config/abis'

const ZERO_ADDR = '0x0000000000000000000000000000000000000000' as `0x${string}`

// On-chain live data 

export interface FundChainData {
  totalBalance:           bigint
  availableBalance:       bigint
  totalInvested:          bigint
  timelockEnd:            bigint
  canRetire:              boolean
  retirementStarted:      boolean
  monthlyDepositCount:    bigint
  lastMonthlyDepositTime: bigint
  missedMonths:           bigint
  usdcBalance:            bigint
}

// Merged dashboard shape 

export interface DashboardData {
  hasFund:      boolean
  fundAddress:  `0x${string}` | null

  // Source flags — useful for showing "sync pending" warnings in the UI
  fundFromDb:    boolean
  fundFromChain: boolean

  // DB metadata (null on DB miss — show skeletons or fall back to chain reads)
  principal:       number | null
  monthlyDeposit:  number | null   // USDC float
  desiredMonthly:  number | null
  retirementAge:   number | null
  currentAge:      number | null
  paymentYears:    number | null
  apyPercent:      number | null   // percentage (not bps)
  protocolAddress: string | null
  chainId:         number | null
  createdAt:       string | null
  lastSyncedAt:    string | null

  // Chain live data (null when no fund / chain unavailable)
  chain: FundChainData | null

  isLoadingDb:    boolean
  isLoadingChain: boolean
  isLoading:      boolean
  isDbError:      boolean

  refetchChain: () => void
  refetchDb:    () => ReturnType<ReturnType<typeof useMyFund>['refetch']>
}

// Hook

export function useDashboard(): DashboardData {
  const owner     = useWalletStore((s) => s.address)
  const chainId   = useChainId()
  const contracts = getContractAddresses(chainId)

  // Tier 1: DB 
  const {
    fund:      dbFund,
    isLoading: isLoadingDb,
    isError:   isDbError,
    refetch:   refetchDb,
  } = useMyFund()

  const dbFundAddress = dbFund?.contract_address
    ? (dbFund.contract_address as `0x${string}`)
    : null

  // Tier 2: Chain fallback
  // Only activate when DB has finished loading and returned nothing.
  // Avoids a redundant RPC call on every login when DB works correctly.
  const needsChainFallback = !isLoadingDb && !dbFundAddress && !!owner

  const {
    data:      chainFundAddress,
    isLoading: isLoadingChainAddr,
  } = useFundAddress()

  const resolvedChainAddr =
    chainFundAddress && chainFundAddress !== ZERO_ADDR
      ? (chainFundAddress as `0x${string}`)
      : null

  // Resolve fund address 
  const fundFromDb    = !!dbFundAddress
  const fundFromChain = !fundFromDb && !!resolvedChainAddr && needsChainFallback
  const fundAddress   = dbFundAddress ?? (needsChainFallback ? resolvedChainAddr : null)
  const hasFund       = !!fundAddress

  // Multicall on PersonalFund 
  const { data: chainResults, isLoading: isLoadingChainData, refetch: refetchChain } =
    useReadContracts({
      contracts: (hasFund && owner && contracts
        ? [
            { address: fundAddress!, abi: PERSONAL_FUND_ABI, functionName: 'getBalances'           },
            { address: fundAddress!, abi: PERSONAL_FUND_ABI, functionName: 'getTimelockInfo'        },
            { address: fundAddress!, abi: PERSONAL_FUND_ABI, functionName: 'retirementStarted'      },
            { address: fundAddress!, abi: PERSONAL_FUND_ABI, functionName: 'monthlyDepositCount'    },
            { address: fundAddress!, abi: PERSONAL_FUND_ABI, functionName: 'lastMonthlyDepositTime' },
            { address: fundAddress!, abi: PERSONAL_FUND_ABI, functionName: 'missedMonths'           },
            { address: contracts.usdc, abi: ERC20_ABI, functionName: 'balanceOf', args: [owner]    },
          ]
        : []) as any,
      query: {
        enabled:              hasFund && !!owner && !!contracts,
        staleTime:            30_000,
        refetchOnWindowFocus: true,
        refetchInterval:      60_000,
      },
    })

  // Parse chain results 

  const chain = useMemo<FundChainData | null>(() => {
    if (!chainResults || !hasFund) return null

    type BalancesTuple = readonly [bigint, bigint, bigint]
    type TimelockTuple = readonly [bigint, bigint, boolean]

    const balancesRes = chainResults[0]
    const timelockRes = chainResults[1]
    const retiredRes  = chainResults[2]
    const countRes    = chainResults[3]
    const lastTimeRes = chainResults[4]
    const missedRes   = chainResults[5]
    const usdcRes     = chainResults[6]

    const balances = balancesRes?.status === 'success'
      ? (balancesRes.result as unknown as BalancesTuple) : null
    const timelock = timelockRes?.status === 'success'
      ? (timelockRes.result as unknown as TimelockTuple) : null

    return {
      totalBalance:           balances?.[0]  ?? 0n,
      availableBalance:       balances?.[1]  ?? 0n,
      totalInvested:          balances?.[2]  ?? 0n,
      timelockEnd:            timelock?.[1]  ?? 0n,
      canRetire:              timelock?.[2]  ?? false,
      retirementStarted:      retiredRes?.status === 'success' ? (retiredRes.result as boolean) : false,
      monthlyDepositCount:    countRes?.status   === 'success' ? (countRes.result   as bigint)  : 0n,
      lastMonthlyDepositTime: lastTimeRes?.status=== 'success' ? (lastTimeRes.result as unknown as bigint) : 0n,
      missedMonths:           missedRes?.status  === 'success' ? (missedRes.result   as bigint) : 0n,
      usdcBalance:            usdcRes?.status    === 'success' ? (usdcRes.result     as bigint) : 0n,
    }
  }, [chainResults, hasFund])

  const isLoadingChain = isLoadingChainAddr || isLoadingChainData
  const isLoading      = isLoadingDb || isLoadingChain

  return {
    hasFund,
    fundAddress,
    fundFromDb,
    fundFromChain,

    principal:       dbFund?.principal       ?? null,
    monthlyDeposit:  dbFund?.monthly_deposit ?? null,
    desiredMonthly:  dbFund?.desired_monthly ?? null,
    retirementAge:   dbFund?.retirement_age  ?? null,
    currentAge:      dbFund?.current_age     ?? null,
    paymentYears:    dbFund?.years_payments  ?? null,
    apyPercent:      dbFund?.interest_rate != null
                       ? dbFund.interest_rate / 100
                       : null,
    protocolAddress: dbFund?.selected_protocol ?? null,
    chainId:         dbFund?.chain_id          ?? null,
    createdAt:       dbFund?.created_at        ?? null,
    lastSyncedAt:    dbFund?.last_synced_at    ?? null,

    chain,

    isLoadingDb,
    isLoadingChain,
    isLoading,
    isDbError,

    refetchChain,
    refetchDb,
  }
}