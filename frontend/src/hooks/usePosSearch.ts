import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface PosProduct {
  id: string;
  sku: string;
  barcode?: string | null;
  name: string;
  price: string;
  stock: number;
  imageUrl?: string | null;
  lowStockThreshold: number;
}

export function usePosSearch(query: string, limit = 24) {
  return useQuery({
    queryKey: ['pos-search', query, limit],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data } = await api.get<{ products: PosProduct[] }>('/pos/products/search', {
        params: { q: query, limit },
      });
      return data.products;
    },
  });
}
