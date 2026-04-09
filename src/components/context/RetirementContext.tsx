import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { RetirementPlanData } from '@/types/retirement_types';

interface RetirementContextType {
  planData:     RetirementPlanData | null;
  setPlanData:  (data: RetirementPlanData) => void;
  clearPlanData: () => void;
}

const RetirementContext = createContext<RetirementContextType | undefined>(undefined);
const STORAGE_KEY = 'retirementPlan';

export const RetirementProvider = ({ children }: { children: ReactNode }) => {
  const [planData, setPlanDataState] = useState<RetirementPlanData | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      setPlanDataState(JSON.parse(saved) as RetirementPlanData);
    } catch (e) {
      console.error('[RetirementContext] Error loading saved plan:', e);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const setPlanData = (data: RetirementPlanData) => {
    setPlanDataState(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  const clearPlanData = () => {
    setPlanDataState(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <RetirementContext.Provider value={{ planData, setPlanData, clearPlanData }}>
      {children}
    </RetirementContext.Provider>
  );
};

export const useRetirementPlan = (): RetirementContextType => {
  const context = useContext(RetirementContext);
  if (context === undefined) {
    throw new Error('useRetirementPlan must be used within a RetirementProvider');
  }
  return context;
};