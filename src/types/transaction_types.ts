import type { RetirementPlan } from '@/types/retirement_types';

export type TxStepStatus =
  | 'idle'
  | 'approving'
  | 'approved'
  | 'executing'
  | 'confirming'
  | 'creating'
  | 'success'
  | 'error';

export const TX_STEP_PROGRESS: Record<TxStepStatus, number> = {
  idle:       0,
  approving:  20,
  approved:   40,
  executing:  60,
  confirming: 80,
  creating:   80,
  success:    100,
  error:      0,
};

export interface UseUSDCTransactionProps {
  plan?:                     RetirementPlan;
  contractAddress:           `0x${string}`;
  abi:                       readonly unknown[];
  functionName:              string;
  args?:                     unknown[];
  usdcAmount:                bigint | undefined;
  onApprovalSuccess?:        () => void;
  onTransactionSuccess?:     (txHash: string) => void;
  onError?:                  (error: Error) => void;
  enabled?:                  boolean;
  autoExecuteAfterApproval?: boolean;
}

export interface UseUSDCTransactionReturn {
  step:              TxStepStatus;
  progress:          number;
  error:             Error | null;

  requiresApproval:  boolean;
  currentAllowance:  bigint | undefined;
  userBalance:       bigint;
  hasEnoughBalance:  boolean;

  isLoading:             boolean;
  isApproving:           boolean;
  isApprovingConfirming: boolean;
  isExecuting:           boolean;
  isConfirming:          boolean;
  isSuccess:             boolean;
  isError:               boolean;

  approvalHash:      `0x${string}` | undefined;
  approvalSuccess:   boolean;
  txHash:            `0x${string}` | undefined;

  executeApproval:    () => Promise<void>;
  executeTransaction: () => Promise<void>;
  executeAll:         () => Promise<void>;
  refetchAllowance:   () => void;
  reset:              () => void;
}