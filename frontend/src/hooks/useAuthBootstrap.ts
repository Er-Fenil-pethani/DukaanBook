import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/authStore';
import { useBusiness } from '@/stores/businessStore';
import type { AuthUser, BusinessProfile } from '@/types';

interface MeResponse {
  user: AuthUser & { businessProfile?: BusinessProfile | null };
}

export function useAuthBootstrap() {
  const { token, setUser, clear } = useAuth();
  const setBusiness = useBusiness((s) => s.setBusiness);
  const [bootstrapped, setBootstrapped] = useState(!token);

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setBootstrapped(true);
      return;
    }
    api
      .get<MeResponse>('/auth/me')
      .then((res) => {
        if (cancelled) return;
        const { businessProfile, ...rest } = res.data.user;
        setUser(rest);
        if (businessProfile) setBusiness(businessProfile);
      })
      .catch(() => {
        if (cancelled) return;
        clear();
      })
      .finally(() => {
        if (!cancelled) setBootstrapped(true);
      });
    return () => {
      cancelled = true;
    };
  }, [token, setUser, setBusiness, clear]);

  return bootstrapped;
}
