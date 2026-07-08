import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Sale } from '@/types';

export interface SalesListParams {
  from?: string;
  to?: string;
  cashierId?: string;
  paymentMethod?: 'CASH' | 'CARD';
  status?: 'COMPLETED' | 'REFUNDED';
  page?: number;
  pageSize?: number;
}

interface SalesResponse {
  sales: Sale[];
  page: number;
  pageSize: number;
  total: number;
}

export function useSales(params: SalesListParams) {
  return useQuery({
    queryKey: ['sales', params],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data } = await api.get<SalesResponse>('/pos/sales', { params });
      return data;
    },
  });
}

export function useSale(id: string | undefined) {
  return useQuery({
    queryKey: ['sale', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await api.get<{ sale: Sale }>(`/pos/sales/${id}`);
      return data.sale;
    },
  });
}

interface CreateSaleInput {
  items: Array<{ productId: string; quantity: number }>;
  paymentMethod: 'CASH' | 'CARD';
}

export function useCreateSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateSaleInput) => {
      const { data } = await api.post<{ sale: Sale }>('/pos/sales', input);
      return data.sale;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['pos-search'] });
    },
  });
}

export function useRefundSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data } = await api.post<{ sale: Sale }>(`/pos/sales/${id}/refund`, { reason });
      return data.sale;
    },
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['sale', id] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
