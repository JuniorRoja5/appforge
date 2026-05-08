import { useEffect } from 'react';
import { useAuthStore, type AuthUser, type ImpersonationContext } from '../store/useAuthStore';

/**
 * On first mount, looks for `?impersonate=<token>` in the URL. If found:
 *   1. Decodes the JWT payload (without verifying — verification happens
 *      server-side on the next API call).
 *   2. Extracts impersonatedBy + impersonationLogId, plus the user fields
 *      the payload carries (sub=userId, email, role, tenantId).
 *   3. Calls setAuth so the rest of the app picks up the session.
 *   4. Clears the query param so a refresh doesn't replay.
 *
 * If the JWT is malformed, it is ignored. The signature check happens
 * the next time apiFetch hits the backend.
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    // base64url → base64 → utf8
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export const ImpersonationBootstrap: React.FC = () => {
  const setAuth = useAuthStore((s) => s.setAuth);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('impersonate');
    if (!token) return;

    const payload = decodeJwtPayload(token);
    if (!payload) {
      // eslint-disable-next-line no-console
      console.warn('[impersonate] malformed token, ignoring');
      return;
    }

    const user: AuthUser = {
      id: String(payload.sub ?? ''),
      email: String(payload.email ?? ''),
      role: (payload.role as 'CLIENT' | 'SUPER_ADMIN') ?? 'CLIENT',
      tenantId: (payload.tenantId as string | null) ?? null,
    };

    const impersonation: ImpersonationContext | null = payload.impersonatedBy
      ? {
          impersonatedBy: String(payload.impersonatedBy),
          impersonationLogId: String(payload.impersonationLogId ?? ''),
        }
      : null;

    setAuth(token, user, impersonation);

    // Strip the query param to avoid replaying on refresh / share.
    const cleanUrl = window.location.pathname + window.location.hash;
    window.history.replaceState({}, '', cleanUrl);
  }, [setAuth]);

  return null;
};
