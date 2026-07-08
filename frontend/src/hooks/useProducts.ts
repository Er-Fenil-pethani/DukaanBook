import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Product } from '@/types';

export interface ProductListResponse {
  products: Product[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ProductListParams {
  search?: string;
  categoryId?: string;
  active?: boolean;
  lowStock?: boolean;
  page?: number;
  pageSize?: number;
}

const LIST_KEY = 'products' as const;

export function useProducts(params: ProductListParams) {
  return useQuery({
    queryKey: [LIST_KEY, params],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data } = await api.get<ProductListResponse>('/admin/products', { params });
      return data;
    },
  });
}

export interface StockMovementEntry {
  id: string;
  type: 'PURCHASE' | 'SALE' | 'RETURN' | 'ADJUSTMENT' | 'DAMAGE';
  quantity: number;
  reason: string;
  notes?: string | null;
  createdAt: string;
  actor: { id: string; name: string; email: string };
}

export interface ProductDetail extends Product {
  stockMovements: StockMovementEntry[];
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: ['product', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await api.get<{ product: ProductDetail }>(`/admin/products/${id}`);
      return data.product;
    },
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const { data } = await api.post<{ product: Product }>('/admin/products', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data.product;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [LIST_KEY] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, formData }: { id: string; formData: FormData }) => {
      const { data } = await api.patch<{ product: Product }>(`/admin/products/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data.product;
    },
    onSuccess: (_p, { id }) => {
      qc.invalidateQueries({ queryKey: [LIST_KEY] });
      qc.invalidateQueries({ queryKey: ['product', id] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete<{ deleted: boolean; deactivated?: boolean }>(
        `/admin/products/${id}`
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [LIST_KEY] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

interface StockAdjustInput {
  productId: string;
  type: 'PURCHASE' | 'RETURN' | 'ADJUSTMENT' | 'DAMAGE';
  quantity: number;
  reason: string;
  notes?: string | null;
}

export function useAdjustStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, ...body }: StockAdjustInput) => {
      const { data } = await api.post<{ product: Product; movement: StockMovementEntry }>(
        `/admin/products/${productId}/stock`,
        body
      );
      return data;
    },
    onSuccess: (_d, { productId }) => {
      qc.invalidateQueries({ queryKey: [LIST_KEY] });
      qc.invalidateQueries({ queryKey: ['product', productId] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
