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

/** Set when the active session was issued by a super-admin via the
 *  /admin/.../impersonate endpoint. Drives the visible banner and the
 *  "back to admin" exit button. */
export interface ImpersonationContext {
  impersonatedBy: string;       // super-admin user id
  impersonationLogId: string;   // ImpersonationLog row id (server-side audit)
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  impersonation: ImpersonationContext | null;
  setAuth: (token: string, user: AuthUser, impersonation?: ImpersonationContext | null) => void;
  updateUser: (partial: Partial<AuthUser>) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      impersonation: null,

      setAuth: (token, user, impersonation = null) => set({ token, user, impersonation }),

      updateUser: (partial) => set((state) => ({
        user: state.user ? { ...state.user, ...partial } : null,
      })),

      logout: () => set({ token: null, user: null, impersonation: null }),

      isAuthenticated: () => get().token !== null,
    }),
    {
      name: 'appforge-auth',
    }
  )
);
