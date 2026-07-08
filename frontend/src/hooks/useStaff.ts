import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { AuthUser } from '@/types';

export interface StaffMember extends AuthUser {
  suspended: boolean;
  createdAt: string;
}

const KEY = ['staff'] as const;

export function useStaff(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: KEY,
    enabled: options.enabled ?? true,
    queryFn: async () => {
      const { data } = await api.get<{ staff: StaffMember[] }>('/admin/staff');
      return data.staff;
    },
  });
}

interface CreateStaffInput {
  email: string;
  password: string;
  name: string;
}

export function useCreateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateStaffInput) => {
      const { data } = await api.post<{ staff: StaffMember }>('/admin/staff', input);
      return data.staff;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useToggleSuspend() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, suspended }: { id: string; suspended: boolean }) => {
      const path = suspended ? 'unsuspend' : 'suspend';
      const { data } = await api.patch<{ staff: StaffMember }>(`/admin/staff/${id}/${path}`);
      return data.staff;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete<{ deleted: boolean; suspended?: boolean }>(
        `/admin/staff/${id}`
      );
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
