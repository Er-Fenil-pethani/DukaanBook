import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  user: { id: string; name: string; email: string } | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: unknown;
  ipAddress: string | null;
  createdAt: string;
}

export interface AuditLogParams {
  userId?: string;
  action?: string;
  entityType?: string;
  page?: number;
  pageSize?: number;
}

export function useAuditLogs(params: AuditLogParams) {
  return useQuery({
    queryKey: ['audit-logs', params],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data } = await api.get<{
        logs: AuditLogEntry[];
        page: number;
        pageSize: number;
        total: number;
      }>('/admin/audit-logs', { params });
      return data;
    },
  });
}
