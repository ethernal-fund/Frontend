import { create }   from 'zustand';
import { devtools }  from 'zustand/middleware';
import { immer }     from 'zustand/middleware/immer';
import type { WizardStep, WizardState, CalculatorInput, CalculatorResult, Protocol } from '@/types';
import { calculate } from '@/lib/calculator';

interface WizardStore extends WizardState {
  // Navigation
  goStep:  (step: WizardStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  reset:   () => void;

  setCalculatorField: <K extends keyof CalculatorInput>(key: K, value: CalculatorInput[K]) => void;
  runCalculator:      () => void;

  selectProtocol: (protocol: Protocol) => void;

  // Tx
  setApproved: (approved: boolean) => void;
  setTxHash:   (hash: `0x${string}`) => void;
}

const DEFAULT_CALCULATOR: CalculatorInput = {
  desiredMonthlyIncome: 3000,
  paymentYears:         20,
  currentAge:           30,
  retirementAge:        65,
  apyPercent:           5,
  principal:            0,
};

const INITIAL_STATE: WizardState = {
  step:             1,
  calculator:       DEFAULT_CALCULATOR,
  result:           null,
  selectedProtocol: null,
  approved:         false,
  txHash:           null,
};

export const useWizardStore = create<WizardStore>()(
  devtools(
    immer((set, get) => ({
      ...INITIAL_STATE,

      goStep:   (step)  => set((s) => { s.step = step; },           false, 'wizard/goStep'),
      nextStep: ()      => set((s) => { if (s.step < 3) s.step++; }, false, 'wizard/next'),
      prevStep: ()      => set((s) => { if (s.step > 1) s.step--; }, false, 'wizard/prev'),
      reset:    ()      => set(() => ({ ...INITIAL_STATE }),          false, 'wizard/reset'),

      setCalculatorField: (key, value) =>
        set((s) => { s.calculator[key] = value as never; }, false, `wizard/calc/${key}`),

      runCalculator: () => {
        const result: CalculatorResult = calculate(get().calculator);
        set((s) => { s.result = result; }, false, 'wizard/runCalculator');
      },

      selectProtocol: (protocol) =>
        set((s) => { s.selectedProtocol = protocol; }, false, 'wizard/selectProtocol'),

      setApproved: (approved) =>
        set((s) => { s.approved = approved; }, false, 'wizard/setApproved'),

      setTxHash: (hash) =>
        set((s) => { s.txHash = hash; }, false, 'wizard/setTxHash'),
    })),
    { name: 'WizardStore' },
  ),
);
