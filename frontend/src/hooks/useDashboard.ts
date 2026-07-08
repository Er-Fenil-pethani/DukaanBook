import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Sale } from '@/types';

export interface DashboardPayload {
  todaySales: number;
  todayRevenue: string;
  last7DaysChart: Array<{ date: string; revenue: number }>;
  topProducts: Array<{
    productId: string;
    name: string;
    sku: string;
    quantity: number;
    revenue: number;
  }>;
  lowStockCount: number;
  stockValue: string;
  recentSales: Sale[];
}

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const { data } = await api.get<DashboardPayload>('/admin/reports/dashboard');
      return data;
    },
  });
}
