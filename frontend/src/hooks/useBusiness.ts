import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useBusiness as useBusinessStore } from '@/stores/businessStore';
import type { BusinessProfile } from '@/types';

const KEY = ['business'] as const;

export function useBusinessProfile() {
  const setBusiness = useBusinessStore((s) => s.setBusiness);
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { data } = await api.get<{ business: BusinessProfile }>('/admin/business');
      setBusiness(data.business);
      return data.business;
    },
  });
}

interface UpdateInput {
  name?: string;
  address?: string | null;
  phone?: string | null;
  currency?: string;
  taxRate?: number;
}

export function useUpdateBusiness() {
  const qc = useQueryClient();
  const setBusiness = useBusinessStore((s) => s.setBusiness);
  return useMutation({
    mutationFn: async (input: UpdateInput) => {
      const { data } = await api.patch<{ business: BusinessProfile }>('/admin/business', input);
      return data.business;
    },
    onSuccess: (b) => {
      setBusiness(b);
      qc.invalidateQueries({ queryKey: KEY });
    },
  });
}

export function useUploadLogo() {
  const qc = useQueryClient();
  const setBusiness = useBusinessStore((s) => s.setBusiness);
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('logo', file);
      const { data } = await api.post<{ business: BusinessProfile }>(
        '/admin/business/logo',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      return data.business;
    },
    onSuccess: (b) => {
      setBusiness(b);
      qc.invalidateQueries({ queryKey: KEY });
    },
  });
}
