/**
 * config/abis.ts
 *
 * ABIs derivados de los artefactos Vyper compilados (compiledAt: 2026-04-04).
 * Fuente de verdad: los JSON en /artifacts — NO editar manualmente.
 *
 * Addresses del deploy actual:
 *  - DateTime:            0xe4A76Bc0CbEC3F4B1297C754985Aed9Fb9b2AaE9
 *  - Treasury:            0x0a743430067AFC5B69B0F8fF542fdbdAD206A748
 *  - ProtocolRegistry:    0xa76322A970EA80B0ebbB9c5213a2F3A1ee53118f  ← nuevo
 *  - UserPreferences:     0x1c3d7f6C47C7d8EA4bc29864fFB966F2B5896704
 *  - PersonalFund (impl): 0xb9357c7c7938f2336eA2A01063cb1C6EDB697F9E
 *  - PersonalFundFactory: 0x467CFb98Ce2429EB5dEBF6960B48a3C87A2D5a5A
 *  - MockDeFiProtocol:    0xc02998E722173eC07c7697Dd0EBe66dEd527Fd71
 *  - MockAaveAdapter:     0x3833088891bEcE92e2c492Fd459Cd025dc7b849D
 *  - MockOndoAdapter:     0x9177D9BCbE0e6c3aD4ad9361c7CAe69FAd439198
 *
 * Cambios vs versión anterior (2026-03-20):
 *  - USER_PREFERENCES_ABI: NUEVO. Cubre setAdmin, configure, authorizeContract,
 *    revokeContract, setDefaultProtocol, setUserConfig, setRoutingStrategy,
 *    routeDeposit, getUserConfig, getUserStrategy, getRecommendedProtocol,
 *    getProtocolDeposits, getUserProtocolDeposits, isContractAuthorized,
 *    getUserTotalDeposited, compareProtocols y todos los storage getters.
 *  - REGISTRY_ABI: address actualizado a 0xa76322A97…
 *  - FACTORY_ABI / PERSONAL_FUND_ABI / TREASURY_ABI: sin cambios funcionales.
 */

// ─── ERC-20 (USDC) ────────────────────────────────────────────────────────────

export const ERC20_ABI = [
  {
    name: 'approve', type: 'function', stateMutability: 'nonpayable',
    inputs:  [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'allowance', type: 'function', stateMutability: 'view',
    inputs:  [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'balanceOf', type: 'function', stateMutability: 'view',
    inputs:  [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'transfer', type: 'function', stateMutability: 'nonpayable',
    inputs:  [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

// ─── PersonalFundFactory ──────────────────────────────────────────────────────

export const FACTORY_ABI = [
  // ── Events ──────────────────────────────────────────────────────────────────
  {
    name: 'FundCreated', type: 'event', anonymous: false,
    inputs: [
      { name: 'fundAddress',      type: 'address', indexed: true  },
      { name: 'owner',            type: 'address', indexed: true  },
      { name: 'initialDeposit',   type: 'uint256', indexed: false },
      { name: 'principal',        type: 'uint256', indexed: false },
      { name: 'monthlyDeposit',   type: 'uint256', indexed: false },
      { name: 'selectedProtocol', type: 'address', indexed: false },
      { name: 'retirementAge',    type: 'uint256', indexed: false },
      { name: 'timelockEnd',      type: 'uint256', indexed: false },
      { name: 'timestamp',        type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'AdminSet', type: 'event', anonymous: false,
    inputs: [
      { name: 'oldAdmin',  type: 'address', indexed: true  },
      { name: 'newAdmin',  type: 'address', indexed: true  },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },

  // ── Write functions ──────────────────────────────────────────────────────────
  {
    name: 'createPersonalFund', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: '_principal',        type: 'uint256' },
      { name: '_monthlyDeposit',   type: 'uint256' },
      { name: '_currentAge',       type: 'uint256' },
      { name: '_retirementAge',    type: 'uint256' },
      { name: '_desiredMonthly',   type: 'uint256' },
      { name: '_yearsPayments',    type: 'uint256' },
      { name: '_interestRate',     type: 'uint256' },
      { name: '_timelockYears',    type: 'uint256' },
      { name: '_selectedProtocol', type: 'address' },
    ],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'configure', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: '_usdc',            type: 'address' },
      { name: '_userPreferences', type: 'address' },
      { name: '_dateTime',        type: 'address' },
    ],
    outputs: [],
  },
  {
    name: 'setAdmin', type: 'function', stateMutability: 'nonpayable',
    inputs:  [{ name: '_newAdmin', type: 'address' }],
    outputs: [],
  },
  {
    name: 'updateMinPrincipal', type: 'function', stateMutability: 'nonpayable',
    inputs:  [{ name: '_newMin', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'updateMaxPrincipal', type: 'function', stateMutability: 'nonpayable',
    inputs:  [{ name: '_newMax', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'updateMinMonthlyDeposit', type: 'function', stateMutability: 'nonpayable',
    inputs:  [{ name: '_newMin', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'updateAgeRanges', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: '_minAge',           type: 'uint256' },
      { name: '_maxAge',           type: 'uint256' },
      { name: '_minRetirementAge', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'updateTimelockRanges', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: '_minYears', type: 'uint256' },
      { name: '_maxYears', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'updateUserPreferences', type: 'function', stateMutability: 'nonpayable',
    inputs:  [{ name: '_newUserPreferences', type: 'address' }],
    outputs: [],
  },
  {
    name: 'updateDateTime', type: 'function', stateMutability: 'nonpayable',
    inputs:  [{ name: '_newDateTime', type: 'address' }],
    outputs: [],
  },

  // ── View functions ────────────────────────────────────────────────────────────
  {
    name: 'getUserFund', type: 'function', stateMutability: 'view',
    inputs:  [{ name: '_user', type: 'address' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'canUserCreateFund', type: 'function', stateMutability: 'view',
    inputs:  [{ name: '_user', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'getFundOwner', type: 'function', stateMutability: 'view',
    inputs:  [{ name: '_fund', type: 'address' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'getUserFundCount', type: 'function', stateMutability: 'view',
    inputs:  [{ name: '_user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getFundCount', type: 'function', stateMutability: 'view',
    inputs:  [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'calculateInitialDeposit', type: 'function', stateMutability: 'view',
    inputs:  [{ name: '_principal', type: 'uint256' }, { name: '_monthlyDeposit', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getConfiguration', type: 'function', stateMutability: 'view',
    inputs:  [],
    outputs: [{
      name: '', type: 'tuple',
      components: [
        { name: 'minPrincipal',      type: 'uint256' },
        { name: 'maxPrincipal',      type: 'uint256' },
        { name: 'minMonthlyDeposit', type: 'uint256' },
        { name: 'minAge',            type: 'uint256' },
        { name: 'maxAge',            type: 'uint256' },
        { name: 'minRetirementAge',  type: 'uint256' },
        { name: 'minTimelockYears',  type: 'uint256' },
        { name: 'maxTimelockYears',  type: 'uint256' },
      ],
    }],
  },
  // ── Storage getters ───────────────────────────────────────────────────────────
  { name: 'admin',                    type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
  { name: 'treasury',                 type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
  { name: 'configured',               type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'bool'    }] },
  { name: 'totalFundsCreated',        type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'minPrincipal',             type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'maxPrincipal',             type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'minMonthlyDeposit',        type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'minAge',                   type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'maxAge',                   type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'minRetirementAge',         type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'minTimelockYears',         type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'maxTimelockYears',         type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'fundExists',               type: 'function', stateMutability: 'view', inputs: [{ name: 'arg0', type: 'address' }], outputs: [{ name: '', type: 'bool' }] },
  { name: 'fundsByOwner',             type: 'function', stateMutability: 'view', inputs: [{ name: 'arg0', type: 'address' }], outputs: [{ name: '', type: 'address' }] },
  { name: 'userFundCount',            type: 'function', stateMutability: 'view', inputs: [{ name: 'arg0', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
] as const;

// ─── PersonalFund ─────────────────────────────────────────────────────────────

export const PERSONAL_FUND_ABI = [
  // ── Events ──────────────────────────────────────────────────────────────────
  {
    name: 'Initialized', type: 'event', anonymous: false,
    inputs: [
      { name: 'owner',            type: 'address', indexed: true  },
      { name: 'treasury',         type: 'address', indexed: false },
      { name: 'usdc',             type: 'address', indexed: false },
      { name: 'selectedProtocol', type: 'address', indexed: false },
      { name: 'initialDeposit',   type: 'uint256', indexed: false },
      { name: 'feeAmount',        type: 'uint256', indexed: false },
      { name: 'netToFund',        type: 'uint256', indexed: false },
      { name: 'timestamp',        type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'MonthlyDeposited', type: 'event', anonymous: false,
    inputs: [
      { name: 'owner',         type: 'address', indexed: true  },
      { name: 'grossAmount',   type: 'uint256', indexed: false },
      { name: 'feeAmount',     type: 'uint256', indexed: false },
      { name: 'netToFund',     type: 'uint256', indexed: false },
      { name: 'depositNumber', type: 'uint256', indexed: false },
      { name: 'totalBalance',  type: 'uint256', indexed: false },
      { name: 'timestamp',     type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'RetirementStarted', type: 'event', anonymous: false,
    inputs: [
      { name: 'owner',        type: 'address', indexed: true  },
      { name: 'totalBalance', type: 'uint256', indexed: false },
      { name: 'timestamp',    type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'Withdrawn', type: 'event', anonymous: false,
    inputs: [
      { name: 'recipient',        type: 'address', indexed: true  },
      { name: 'amount',           type: 'uint256', indexed: false },
      { name: 'remainingBalance', type: 'uint256', indexed: false },
      { name: 'timestamp',        type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'InvestedInProtocol', type: 'event', anonymous: false,
    inputs: [
      { name: 'protocol',      type: 'address', indexed: true  },
      { name: 'amount',        type: 'uint256', indexed: false },
      { name: 'totalInvested', type: 'uint256', indexed: false },
      { name: 'timestamp',     type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'EmergencyWithdrawal', type: 'event', anonymous: false,
    inputs: [
      { name: 'owner',     type: 'address', indexed: true  },
      { name: 'amount',    type: 'uint256', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },

  // ── Write functions ──────────────────────────────────────────────────────────
  {
    name: 'depositMonthly', type: 'function', stateMutability: 'nonpayable',
    inputs: [], outputs: [],
  },
  {
    name: 'depositExtra', type: 'function', stateMutability: 'nonpayable',
    inputs:  [{ name: '_amount', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'reclaimExtraDeposit', type: 'function', stateMutability: 'nonpayable',
    inputs: [], outputs: [],
  },
  {
    name: 'investInDeFi', type: 'function', stateMutability: 'nonpayable',
    inputs:  [{ name: '_amount', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'withdrawFromDeFi', type: 'function', stateMutability: 'nonpayable',
    inputs:  [{ name: '_protocol', type: 'address' }, { name: '_amount', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'updateInvestmentMethod', type: 'function', stateMutability: 'nonpayable',
    inputs:  [{ name: '_newProtocol', type: 'address' }],
    outputs: [],
  },
  {
    name: 'startRetirement', type: 'function', stateMutability: 'nonpayable',
    inputs: [], outputs: [],
  },
  {
    name: 'withdraw', type: 'function', stateMutability: 'nonpayable',
    inputs:  [{ name: '_amount', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'withdrawAll', type: 'function', stateMutability: 'nonpayable',
    inputs: [], outputs: [],
  },
  {
    name: 'configureAutoWithdrawal', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: '_withdrawalAmount', type: 'uint256' },
      { name: '_intervalDays',     type: 'uint256' },
      { name: '_enabled',          type: 'bool'    },
    ],
    outputs: [],
  },
  {
    name: 'executeAutoWithdrawal', type: 'function', stateMutability: 'nonpayable',
    inputs: [], outputs: [],
  },
  {
    name: 'approveEarlyRetirement', type: 'function', stateMutability: 'nonpayable',
    inputs: [], outputs: [],
  },
  {
    name: 'emergencyWithdraw', type: 'function', stateMutability: 'nonpayable',
    inputs:  [{ name: '_reason', type: 'string' }],
    outputs: [],
  },

  // ── View functions ────────────────────────────────────────────────────────────
  {
    name: 'getFundInfo', type: 'function', stateMutability: 'view',
    inputs:  [],
    // tuple: owner, principal, monthlyDeposit, retirementAge, totalGrossDeposited,
    //        totalFeesPaid, totalNetToFund, totalBalance, availableBalance, totalInvested, retirementStarted
    outputs: [
      { name: '', type: 'address' }, { name: '', type: 'uint256' }, { name: '', type: 'uint256' },
      { name: '', type: 'uint256' }, { name: '', type: 'uint256' }, { name: '', type: 'uint256' },
      { name: '', type: 'uint256' }, { name: '', type: 'uint256' }, { name: '', type: 'uint256' },
      { name: '', type: 'uint256' }, { name: '', type: 'bool'    },
    ],
  },
  {
    name: 'getBalances', type: 'function', stateMutability: 'view',
    inputs:  [],
    outputs: [
      { name: '', type: 'uint256' }, // totalBalance
      { name: '', type: 'uint256' }, // availableBalance
      { name: '', type: 'uint256' }, // totalInvested
    ],
  },
  {
    name: 'getTimelockInfo', type: 'function', stateMutability: 'view',
    inputs:  [],
    outputs: [
      { name: '', type: 'uint256' }, // timelockEnd
      { name: '', type: 'uint256' }, // timeRemaining
      { name: '', type: 'bool'    }, // isLocked
    ],
  },
  {
    name: 'getDepositStats', type: 'function', stateMutability: 'view',
    inputs:  [],
    outputs: [
      { name: '', type: 'uint256' }, // monthlyDepositCount
      { name: '', type: 'uint256' }, // lastMonthlyDepositTime
      { name: '', type: 'uint256' }, // nextDepositDue
      { name: '', type: 'uint256' }, // missedMonths
      { name: '', type: 'uint256' }, // extraDepositCount
    ],
  },
  {
    name: 'getWithdrawalStats', type: 'function', stateMutability: 'view',
    inputs:  [],
    outputs: [
      { name: '', type: 'uint256' }, // withdrawalCount
      { name: '', type: 'uint256' }, // totalWithdrawn
      { name: '', type: 'uint256' }, // lastWithdrawalTime
    ],
  },
  {
    name: 'getAutoWithdrawalInfo', type: 'function', stateMutability: 'view',
    inputs:  [],
    outputs: [
      { name: '', type: 'bool'    }, // enabled
      { name: '', type: 'uint256' }, // autoWithdrawalAmount
      { name: '', type: 'uint256' }, // lastAutoWithdrawalTime
      { name: '', type: 'uint256' }, // nextAutoWithdrawalTime
      { name: '', type: 'uint256' }, // autoWithdrawalInterval
      { name: '', type: 'uint256' }, // autoWithdrawalExecutionCount
    ],
  },
  {
    name: 'getProjectedRetirement', type: 'function', stateMutability: 'view',
    inputs:  [],
    outputs: [
      { name: '', type: 'uint256' }, // projectedBalance
      { name: '', type: 'uint256' }, // monthsUntilTarget
      { name: '', type: 'uint256' }, // estimatedMonthly
    ],
  },
  {
    name: 'calculateFeeForAmount', type: 'function', stateMutability: 'view',
    inputs:  [{ name: '_amount', type: 'uint256' }],
    outputs: [
      { name: '', type: 'uint256' }, // feeAmount
      { name: '', type: 'uint256' }, // netAmount
    ],
  },
  {
    name: 'getInvestedProtocols', type: 'function', stateMutability: 'view',
    inputs:  [],
    outputs: [
      { name: '', type: 'address[10]' },
      { name: '', type: 'uint256[10]' },
      { name: '', type: 'uint256'     },
    ],
  },
  {
    name: 'getProtocolBalance', type: 'function', stateMutability: 'view',
    inputs:  [{ name: '_protocol', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getAutoWithdrawalInfo', type: 'function', stateMutability: 'view',
    inputs:  [],
    outputs: [
      { name: '', type: 'bool'    },
      { name: '', type: 'uint256' },
      { name: '', type: 'uint256' },
      { name: '', type: 'uint256' },
      { name: '', type: 'uint256' },
      { name: '', type: 'uint256' },
    ],
  },
  {
    name: 'getTimeUntilNextAutoWithdrawal', type: 'function', stateMutability: 'view',
    inputs:  [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getInitialDeposit',           type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'getContractBalance',          type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'getExtraDepositCount',        type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'estimateAutoWithdrawalYears', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'canStartRetirement',          type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'bool'    }] },
  { name: 'canWithdraw',                 type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'bool'    }] },
  { name: 'canExecuteAutoWithdrawal',    type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'bool'    }] },
  { name: 'isEarlyRetirementApproved',   type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'bool'    }] },
  { name: 'initialized',                 type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'bool'    }] },
  { name: 'owner',                       type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
  { name: 'selectedProtocol',            type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
  { name: 'principal',                   type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'monthlyDeposit',              type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'retirementAge',               type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'timelockEnd',                 type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'timelockPeriod',              type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'totalBalance',                type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'availableBalance',            type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'totalInvested',               type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'totalGrossDeposited',         type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'totalFeesPaid',               type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'totalNetToFund',              type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'retirementStarted',           type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'bool'    }] },
  { name: 'createdAt',                   type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'interestRate',                type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'currentAge',                  type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'missedMonths',                type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'monthlyDepositCount',         type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
] as const;

// ─── ProtocolRegistry ─────────────────────────────────────────────────────────

export const REGISTRY_ABI = [
  // ── Events ──────────────────────────────────────────────────────────────────
  {
    name: 'ProtocolAdded', type: 'event', anonymous: false,
    inputs: [
      { name: 'protocolAddress', type: 'address', indexed: true  },
      { name: 'name',            type: 'string',  indexed: false },
      { name: 'category',        type: 'uint8',   indexed: false },
      { name: 'apy',             type: 'uint256', indexed: false },
      { name: 'riskLevel',       type: 'uint8',   indexed: false },
      { name: 'timestamp',       type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'ProtocolUpdated', type: 'event', anonymous: false,
    inputs: [
      { name: 'protocolAddress', type: 'address', indexed: true  },
      { name: 'apy',             type: 'uint256', indexed: false },
      { name: 'isActive',        type: 'bool',    indexed: false },
      { name: 'timestamp',       type: 'uint256', indexed: false },
    ],
  },

  // ── Write functions ──────────────────────────────────────────────────────────
  {
    name: 'addDeFiProtocol', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: '_protocolAddress', type: 'address' },
      { name: '_name',            type: 'string'  },
      { name: '_apy',             type: 'uint256' },
      { name: '_riskLevel',       type: 'uint8'   },
      { name: '_category',        type: 'uint8'   },
    ],
    outputs: [],
  },
  {
    name: 'verifyProtocol', type: 'function', stateMutability: 'nonpayable',
    inputs:  [{ name: '_protocolAddress', type: 'address' }],
    outputs: [],
  },
  {
    name: 'updateProtocolAPY', type: 'function', stateMutability: 'nonpayable',
    inputs:  [{ name: '_protocolAddress', type: 'address' }, { name: '_newAPY', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'toggleProtocolStatus', type: 'function', stateMutability: 'nonpayable',
    inputs:  [{ name: '_protocolAddress', type: 'address' }],
    outputs: [],
  },
  {
    name: 'removeProtocol', type: 'function', stateMutability: 'nonpayable',
    inputs:  [{ name: '_protocolAddress', type: 'address' }, { name: '_reason', type: 'string' }],
    outputs: [],
  },
  {
    name: 'setAdmin', type: 'function', stateMutability: 'nonpayable',
    inputs:  [{ name: '_newAdmin', type: 'address' }],
    outputs: [],
  },
  {
    name: 'addAuthorizedManager', type: 'function', stateMutability: 'nonpayable',
    inputs:  [{ name: '_manager', type: 'address' }],
    outputs: [],
  },
  {
    name: 'removeAuthorizedManager', type: 'function', stateMutability: 'nonpayable',
    inputs:  [{ name: '_manager', type: 'address' }],
    outputs: [],
  },
  {
    name: 'recordDeposit', type: 'function', stateMutability: 'nonpayable',
    inputs:  [{ name: '_protocolAddress', type: 'address' }, { name: '_amount', type: 'uint256' }],
    outputs: [],
  },

  // ── View functions ────────────────────────────────────────────────────────────
  {
    name: 'getActiveProtocolsList', type: 'function', stateMutability: 'view',
    inputs:  [],
    outputs: [{ name: '', type: 'address[]' }],
  },
  {
    name: 'getVerifiedProtocols', type: 'function', stateMutability: 'view',
    inputs:  [],
    outputs: [{ name: '', type: 'address[]' }],
  },
  {
    name: 'getAllProtocols', type: 'function', stateMutability: 'view',
    inputs:  [],
    outputs: [{ name: '', type: 'address[]' }],
  },
  {
    name: 'getProtocol', type: 'function', stateMutability: 'view',
    inputs:  [{ name: '_protocolAddress', type: 'address' }],
    outputs: [{
      name: '', type: 'tuple',
      components: [
        { name: 'protocolAddress', type: 'address' },
        { name: 'name',            type: 'string'  },
        { name: 'category',        type: 'uint8'   },
        { name: 'apy',             type: 'uint256' },
        { name: 'isActive',        type: 'bool'    },
        { name: 'totalDeposited',  type: 'uint256' },
        { name: 'riskLevel',       type: 'uint8'   },
        { name: 'addedTimestamp',  type: 'uint256' },
        { name: 'lastUpdated',     type: 'uint256' },
        { name: 'verified',        type: 'bool'    },
      ],
    }],
  },
  {
    name: 'getTopProtocolsByAPY', type: 'function', stateMutability: 'view',
    inputs:  [{ name: '_limit', type: 'uint256' }],
    outputs: [{ name: '', type: 'address[]' }],
  },
  {
    name: 'getProtocolsByRisk', type: 'function', stateMutability: 'view',
    inputs:  [{ name: '_riskLevel', type: 'uint8' }],
    outputs: [{ name: '', type: 'address[100]' }],
  },
  {
    name: 'getProtocolsByCategory', type: 'function', stateMutability: 'view',
    inputs:  [{ name: '_category', type: 'uint8' }],
    outputs: [{ name: '', type: 'address[]' }],
  },
  {
    name: 'getGlobalStats', type: 'function', stateMutability: 'view',
    inputs: [],
    outputs: [{
      name: '', type: 'tuple',
      components: [
        { name: 'totalProtocols',   type: 'uint256' },
        { name: 'activeProtocols',  type: 'uint256' },
        { name: 'totalValueLocked', type: 'uint256' },
        { name: 'averageAPY',       type: 'uint256' },
      ],
    }],
  },
  {
    name: 'getProtocolStats', type: 'function', stateMutability: 'view',
    inputs:  [{ name: '_protocolAddress', type: 'address' }],
    outputs: [
      { name: 'apy',        type: 'uint256' },
      { name: 'tvl',        type: 'uint256' },
      { name: 'isActive',   type: 'bool'    },
      { name: 'isVerified', type: 'bool'    },
    ],
  },
  {
    name: 'getProtocolCount', type: 'function', stateMutability: 'view',
    inputs:  [],
    outputs: [{ name: 'total', type: 'uint256' }, { name: 'active', type: 'uint256' }],
  },
  {
    name: 'getTotalValueLocked', type: 'function', stateMutability: 'view',
    inputs:  [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'isProtocolActive', type: 'function', stateMutability: 'view',
    inputs:  [{ name: '_protocolAddress', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'isProtocolVerified', type: 'function', stateMutability: 'view',
    inputs:  [{ name: '_protocolAddress', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'getCategoryName', type: 'function', stateMutability: 'view',
    inputs:  [{ name: '_category', type: 'uint8' }],
    outputs: [{ name: '', type: 'string' }],
  },
  { name: 'admin',               type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
  { name: 'activeProtocolCount', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'totalValueLocked',    type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
] as const;

// ─── Treasury ─────────────────────────────────────────────────────────────────

export const TREASURY_ABI = [
  // ── Events ──────────────────────────────────────────────────────────────────
  {
    name: 'FeeReceived', type: 'event', anonymous: false,
    inputs: [
      { name: 'fundAddress',   type: 'address', indexed: true  },
      { name: 'amount',        type: 'uint256', indexed: false },
      { name: 'totalFromFund', type: 'uint256', indexed: false },
      { name: 'timestamp',     type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'EarlyRetirementRequested', type: 'event', anonymous: false,
    inputs: [
      { name: 'fundAddress', type: 'address', indexed: true  },
      { name: 'requester',   type: 'address', indexed: false },
      { name: 'reason',      type: 'string',  indexed: false },
      { name: 'timestamp',   type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'EarlyRetirementApproved', type: 'event', anonymous: false,
    inputs: [
      { name: 'fundAddress', type: 'address', indexed: true  },
      { name: 'approver',    type: 'address', indexed: false },
      { name: 'timestamp',   type: 'uint256', indexed: false },
    ],
  },

  // ── Write functions ──────────────────────────────────────────────────────────
  {
    name: 'configure', type: 'function', stateMutability: 'nonpayable',
    inputs:  [{ name: '_factory', type: 'address' }],
    outputs: [],
  },
  {
    name: 'changeAdmin', type: 'function', stateMutability: 'nonpayable',
    inputs:  [{ name: '_newAdmin', type: 'address' }],
    outputs: [],
  },
  {
    name: 'pushAdmin', type: 'function', stateMutability: 'nonpayable',
    inputs:  [{ name: '_targetContract', type: 'address' }, { name: '_newAdmin', type: 'address' }],
    outputs: [],
  },
  {
    name: 'requestEarlyRetirement', type: 'function', stateMutability: 'nonpayable',
    inputs:  [{ name: '_fundAddress', type: 'address' }, { name: '_reason', type: 'string' }],
    outputs: [],
  },
  {
    name: 'processEarlyRetirement', type: 'function', stateMutability: 'nonpayable',
    inputs:  [{ name: '_fundAddress', type: 'address' }, { name: '_approve', type: 'bool' }],
    outputs: [],
  },
  {
    name: 'recordFee', type: 'function', stateMutability: 'nonpayable',
    inputs:  [{ name: '_fundAddress', type: 'address' }, { name: '_amount', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'withdrawFees', type: 'function', stateMutability: 'nonpayable',
    inputs:  [{ name: '_recipient', type: 'address' }, { name: '_amount', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'updateFeePercentage', type: 'function', stateMutability: 'nonpayable',
    inputs:  [{ name: '_newFee', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'deactivateFund', type: 'function', stateMutability: 'nonpayable',
    inputs:  [{ name: '_fundAddress', type: 'address' }, { name: '_reason', type: 'string' }],
    outputs: [],
  },
  {
    name: 'emergencyWithdraw', type: 'function', stateMutability: 'nonpayable',
    inputs:  [{ name: '_token', type: 'address' }, { name: '_recipient', type: 'address' }],
    outputs: [],
  },
  {
    name: 'addTreasuryManager', type: 'function', stateMutability: 'nonpayable',
    inputs:  [{ name: '_manager', type: 'address' }],
    outputs: [],
  },
  {
    name: 'removeTreasuryManager', type: 'function', stateMutability: 'nonpayable',
    inputs:  [{ name: '_manager', type: 'address' }],
    outputs: [],
  },

  // ── View functions ────────────────────────────────────────────────────────────
  {
    name: 'calculateFee', type: 'function', stateMutability: 'view',
    inputs:  [{ name: '_amount', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getTreasuryBalance', type: 'function', stateMutability: 'view',
    inputs: [], outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getTreasuryStats', type: 'function', stateMutability: 'view',
    inputs: [],
    outputs: [{
      name: '', type: 'tuple',
      components: [
        { name: 'totalFeesCollectedUSDC',       type: 'uint256' },
        { name: 'totalFeesCollectedAllTime',     type: 'uint256' },
        { name: 'totalFundsRegistered',          type: 'uint256' },
        { name: 'activeFundsCount',              type: 'uint256' },
        { name: 'totalEarlyRetirementRequests',  type: 'uint256' },
        { name: 'approvedEarlyRetirements',      type: 'uint256' },
        { name: 'rejectedEarlyRetirements',      type: 'uint256' },
      ],
    }],
  },
  {
    name: 'getEarlyRetirementRequest', type: 'function', stateMutability: 'view',
    inputs:  [{ name: '_fundAddress', type: 'address' }],
    outputs: [{
      name: '', type: 'tuple',
      components: [
        { name: 'fundAddress',        type: 'address' },
        { name: 'requester',          type: 'address' },
        { name: 'reason',             type: 'string'  },
        { name: 'approved',           type: 'bool'    },
        { name: 'rejected',           type: 'bool'    },
        { name: 'processed',          type: 'bool'    },
        { name: 'requestTimestamp',   type: 'uint256' },
        { name: 'processedTimestamp', type: 'uint256' },
      ],
    }],
  },
  {
    name: 'getRequestStats', type: 'function', stateMutability: 'view',
    inputs:  [],
    outputs: [
      { name: '', type: 'uint256' }, // total
      { name: '', type: 'uint256' }, // pending
      { name: '', type: 'uint256' }, // approved
      { name: '', type: 'uint256' }, // rejected
    ],
  },
  {
    name: 'isTreasuryManager', type: 'function', stateMutability: 'view',
    inputs:  [{ name: '_address', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  { name: 'admin',          type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
  { name: 'feePercentage',  type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'fundCount',      type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'requestCount',   type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
] as const;

// ─── UserPreferences ──────────────────────────────────────────────────────────

export const USER_PREFERENCES_ABI = [
  // ── Events ──────────────────────────────────────────────────────────────────
  {
    name: 'UserConfigUpdated', type: 'event', anonymous: false,
    inputs: [
      { name: 'user',             type: 'address', indexed: true  },
      { name: 'selectedProtocol', type: 'address', indexed: true  },
      { name: 'autoCompound',     type: 'bool',    indexed: false },
      { name: 'riskTolerance',    type: 'uint8',   indexed: false },
      { name: 'timestamp',        type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'RoutingStrategyUpdated', type: 'event', anonymous: false,
    inputs: [
      { name: 'user',         type: 'address', indexed: true  },
      { name: 'strategyType', type: 'uint8',   indexed: false },
      { name: 'timestamp',    type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'DepositRouted', type: 'event', anonymous: false,
    inputs: [
      { name: 'user',      type: 'address', indexed: true  },
      { name: 'protocol',  type: 'address', indexed: true  },
      { name: 'amount',    type: 'uint256', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'ContractAuthorized', type: 'event', anonymous: false,
    inputs: [
      { name: 'contract',  type: 'address', indexed: true  },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'ContractRevoked', type: 'event', anonymous: false,
    inputs: [
      { name: 'contract',  type: 'address', indexed: true  },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'DefaultProtocolSet', type: 'event', anonymous: false,
    inputs: [
      { name: 'protocol',  type: 'address', indexed: true  },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'AdminSet', type: 'event', anonymous: false,
    inputs: [
      { name: 'oldAdmin',  type: 'address', indexed: true  },
      { name: 'newAdmin',  type: 'address', indexed: true  },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },

  // ── Write functions ──────────────────────────────────────────────────────────
  {
    name: 'setAdmin', type: 'function', stateMutability: 'nonpayable',
    inputs:  [{ name: '_newAdmin', type: 'address' }],
    outputs: [],
  },
  {
    name: 'configure', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: '_protocolRegistry', type: 'address' },
      { name: '_usdc',             type: 'address' },
      { name: '_factory',          type: 'address' },
    ],
    outputs: [],
  },
  {
    name: 'authorizeContract', type: 'function', stateMutability: 'nonpayable',
    inputs:  [{ name: '_contract', type: 'address' }],
    outputs: [],
  },
  {
    name: 'revokeContract', type: 'function', stateMutability: 'nonpayable',
    inputs:  [{ name: '_contract', type: 'address' }],
    outputs: [],
  },
  {
    name: 'setDefaultProtocol', type: 'function', stateMutability: 'nonpayable',
    inputs:  [{ name: '_protocol', type: 'address' }],
    outputs: [],
  },
  {
    name: 'setUserConfig', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: '_user',             type: 'address' },
      { name: '_selectedProtocol', type: 'address' },
      { name: '_autoCompound',     type: 'bool'    },
      { name: '_riskTolerance',    type: 'uint8'   },
    ],
    outputs: [],
  },
  {
    name: 'setRoutingStrategy', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: '_strategyType',            type: 'uint8'   },
      { name: '_diversificationPercent',  type: 'uint256' },
      { name: '_rebalanceThreshold',      type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'routeDeposit', type: 'function', stateMutability: 'nonpayable',
    inputs:  [{ name: '_user', type: 'address' }, { name: '_amount', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },

  // ── View functions ────────────────────────────────────────────────────────────
  {
    name: 'getUserConfig', type: 'function', stateMutability: 'view',
    inputs:  [{ name: '_user', type: 'address' }],
    outputs: [{
      name: '', type: 'tuple',
      components: [
        { name: 'selectedProtocol', type: 'address' },
        { name: 'autoCompound',     type: 'bool'    },
        { name: 'riskTolerance',    type: 'uint8'   },
        { name: 'lastUpdate',       type: 'uint256' },
        { name: 'totalDeposited',   type: 'uint256' },
        { name: 'totalWithdrawn',   type: 'uint256' },
      ],
    }],
  },
  {
    name: 'getUserStrategy', type: 'function', stateMutability: 'view',
    inputs:  [{ name: '_user', type: 'address' }],
    outputs: [{
      name: '', type: 'tuple',
      components: [
        { name: 'strategyType',           type: 'uint8'   },
        { name: 'diversificationPercent', type: 'uint256' },
        { name: 'rebalanceThreshold',     type: 'uint256' },
      ],
    }],
  },
  {
    name: 'getRecommendedProtocol', type: 'function', stateMutability: 'view',
    inputs:  [{ name: '_user', type: 'address' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'getProtocolDeposits', type: 'function', stateMutability: 'view',
    inputs:  [{ name: '_protocol', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getUserProtocolDeposits', type: 'function', stateMutability: 'view',
    inputs:  [{ name: '_user', type: 'address' }, { name: '_protocol', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'isContractAuthorized', type: 'function', stateMutability: 'view',
    inputs:  [{ name: '_contract', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'getUserTotalDeposited', type: 'function', stateMutability: 'view',
    inputs:  [{ name: '_user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'compareProtocols', type: 'function', stateMutability: 'view',
    inputs:  [{ name: '_user', type: 'address' }],
    outputs: [{
      name: '', type: 'tuple[]',
      components: [
        { name: 'protocolAddress', type: 'address' },
        { name: 'apy',             type: 'uint256' },
        { name: 'riskLevel',       type: 'uint8'   },
        { name: 'score',           type: 'uint256' },
      ],
    }],
  },

  // ── Storage getters ───────────────────────────────────────────────────────────
  { name: 'admin',            type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
  { name: 'treasury',         type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
  { name: 'factory',          type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
  { name: 'protocolRegistry', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
  { name: 'usdc',             type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
  { name: 'configured',       type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'bool'    }] },
  { name: 'defaultProtocol',  type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
  {
    name: 'userConfigs', type: 'function', stateMutability: 'view',
    inputs:  [{ name: 'arg0', type: 'address' }],
    outputs: [{
      name: '', type: 'tuple',
      components: [
        { name: 'selectedProtocol', type: 'address' },
        { name: 'autoCompound',     type: 'bool'    },
        { name: 'riskTolerance',    type: 'uint8'   },
        { name: 'lastUpdate',       type: 'uint256' },
        { name: 'totalDeposited',   type: 'uint256' },
        { name: 'totalWithdrawn',   type: 'uint256' },
      ],
    }],
  },
  {
    name: 'userStrategies', type: 'function', stateMutability: 'view',
    inputs:  [{ name: 'arg0', type: 'address' }],
    outputs: [{
      name: '', type: 'tuple',
      components: [
        { name: 'strategyType',           type: 'uint8'   },
        { name: 'diversificationPercent', type: 'uint256' },
        { name: 'rebalanceThreshold',     type: 'uint256' },
      ],
    }],
  },
  {
    name: 'protocolDeposits', type: 'function', stateMutability: 'view',
    inputs:  [{ name: 'arg0', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'userProtocolDeposits', type: 'function', stateMutability: 'view',
    inputs:  [{ name: 'arg0', type: 'address' }, { name: 'arg1', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'authorizedContracts', type: 'function', stateMutability: 'view',
    inputs:  [{ name: 'arg0', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

// ─── DeFi Protocol adapter (interfaz compartida) ──────────────────────────────

export const DEFI_PROTOCOL_ABI = [
  {
    name: 'deposit', type: 'function', stateMutability: 'nonpayable',
    inputs:  [{ name: '_amount', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'withdraw', type: 'function', stateMutability: 'nonpayable',
    inputs:  [{ name: '_amount', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'getBalance', type: 'function', stateMutability: 'view',
    inputs:  [{ name: '_account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'Deposited', type: 'event', anonymous: false,
    inputs: [
      { name: 'caller',    type: 'address', indexed: true  },
      { name: 'amount',    type: 'uint256', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'Withdrawn', type: 'event', anonymous: false,
    inputs: [
      { name: 'caller',    type: 'address', indexed: true  },
      { name: 'amount',    type: 'uint256', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
] as const;

// ─── Type helpers ─────────────────────────────────────────────────────────────

/**
 * Tuple devuelta por getFundInfo() — 11 elementos.
 * Índices:
 *  [0]  owner
 *  [1]  principal
 *  [2]  monthlyDeposit
 *  [3]  retirementAge
 *  [4]  totalGrossDeposited
 *  [5]  totalFeesPaid
 *  [6]  totalNetToFund
 *  [7]  totalBalance
 *  [8]  availableBalance
 *  [9]  totalInvested
 *  [10] retirementStarted
 */
export type FundInfoTuple = readonly [
  owner:               `0x${string}`,
  principal:           bigint,
  monthlyDeposit:      bigint,
  retirementAge:       bigint,
  totalGrossDeposited: bigint,
  totalFeesPaid:       bigint,
  totalNetToFund:      bigint,
  totalBalance:        bigint,
  availableBalance:    bigint,
  totalInvested:       bigint,
  retirementStarted:   boolean,
];

export interface ProtocolTuple {
  protocolAddress: `0x${string}`;
  name:            string;
  category:        number;
  apy:             bigint;
  isActive:        boolean;
  totalDeposited:  bigint;
  riskLevel:       number;
  addedTimestamp:  bigint;
  lastUpdated:     bigint;
  verified:        boolean;
}

/** Tuple de getConfiguration() del factory. */
export interface FactoryConfig {
  minPrincipal:      bigint;
  maxPrincipal:      bigint;
  minMonthlyDeposit: bigint;
  minAge:            bigint;
  maxAge:            bigint;
  minRetirementAge:  bigint;
  minTimelockYears:  bigint;
  maxTimelockYears:  bigint;
}

/** Tuple de getUserConfig() de UserPreferences. */
export interface UserConfig {
  selectedProtocol: `0x${string}`;
  autoCompound:     boolean;
  riskTolerance:    number;
  lastUpdate:       bigint;
  totalDeposited:   bigint;
  totalWithdrawn:   bigint;
}

/** Tuple de getUserStrategy() de UserPreferences. */
export interface UserStrategy {
  strategyType:           number;
  diversificationPercent: bigint;
  rebalanceThreshold:     bigint;
}

/** Elemento del array devuelto por compareProtocols(). */
export interface ProtocolScore {
  protocolAddress: `0x${string}`;
  apy:             bigint;
  riskLevel:       number;
  score:           bigint;
}