import React from 'react';
import { LogOut, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { stopImpersonation } from '../lib/api';

/**
 * Persistent top banner shown when the active session was issued by a
 * super-admin via /admin/.../impersonate. Makes the impersonation
 * impossible to ignore: red strip across the entire viewport, exit
 * button on the right.
 *
 * Click "Salir" → revokes the session server-side (#43) and then wipes
 * the local auth store + reloads. The server-side revoke is what makes
 * the token actually die: before #43, "Salir" only discarded the JWT
 * locally; the token stayed cryptographically valid until exp (1h).
 *
 * The super-admin's own session lives in another tab (the admin panel)
 * — closing this tab is also a clean exit.
 */
export const ImpersonationBanner: React.FC = () => {
  const impersonation = useAuthStore((s) => s.impersonation);
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const logout = useAuthStore((s) => s.logout);

  if (!impersonation) return null;

  const handleExit = async () => {
    // Revoke server-side BEFORE clearing local state. If logout() ran first,
    // token would be null and we'd lose the only credential capable of
    // identifying the session to revoke. Best-effort: a network failure or
    // an already-expired token must not trap the user inside the impersonated
    // UI — the local logout + reload still runs in the catch.
    if (token) {
      try {
        await stopImpersonation(token);
      } catch {
        // Intentional swallow — see comment above. The server-side state may
        // be inconsistent for at most until the JWT's natural exp (1h).
      }
    }
    logout();
    // Hard reload to clear any in-memory state from the impersonated session.
    window.location.href = '/';
  };

  return (
    <div className="sticky top-0 z-50 bg-red-600 text-white shadow-md">
      <div className="px-4 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium truncate">
            Sesión suplantada — estás operando como{' '}
            <strong className="font-semibold">{user?.email ?? 'usuario'}</strong>.
            Cualquier cambio queda registrado en la auditoría con el ID del super-admin.
          </span>
        </div>
        <button
          onClick={handleExit}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-white text-red-700 hover:bg-red-50 rounded-md transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Salir de la suplantación</span>
        </button>
      </div>
    </div>
  );
};
