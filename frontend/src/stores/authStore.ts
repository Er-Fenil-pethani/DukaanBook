import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '@/types';

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  setAuth: (token: string, user: AuthUser) => void;
  setUser: (user: AuthUser) => void;
  clear: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => {
        localStorage.setItem('auth.token', token);
        set({ token, user });
      },
      setUser: (user) => set({ user }),
      clear: () => {
        localStorage.removeItem('auth.token');
        set({ token: null, user: null });
      },
    }),
    { name: 'auth-store' }
  )
);
