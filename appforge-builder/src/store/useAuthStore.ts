import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  email: string;
  role: 'SUPER_ADMIN' | 'CLIENT';
  tenantId: string | null;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  company?: string | null;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  setAuth: (token: string, user: AuthUser) => void;
  updateUser: (partial: Partial<AuthUser>) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,

      setAuth: (token, user) => set({ token, user }),

      updateUser: (partial) => set((state) => ({
        user: state.user ? { ...state.user, ...partial } : null,
      })),

      logout: () => set({ token: null, user: null }),

      isAuthenticated: () => get().token !== null,
    }),
    {
      name: 'appforge-auth',
    }
  )
);
