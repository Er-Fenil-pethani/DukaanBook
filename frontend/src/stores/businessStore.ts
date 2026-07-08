import { create } from 'zustand';
import type { BusinessProfile } from '@/types';

interface BusinessState {
  business: BusinessProfile | null;
  setBusiness: (b: BusinessProfile | null) => void;
  reset: () => void;
}

export const useBusiness = create<BusinessState>((set) => ({
  business: null,
  setBusiness: (business) => set({ business }),
  reset: () => set({ business: null }),
}));

export function useCurrency(): string {
  return useBusiness((s) => s.business?.currency) ?? 'PKR';
}

export function useTaxRate(): number {
  const business = useBusiness((s) => s.business);
  if (!business) return 0;
  return Number(business.taxRate);
}
