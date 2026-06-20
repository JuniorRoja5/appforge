import React, { useEffect } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { TopBar } from '../components/TopBar';
import { SideNav } from '../components/SideNav';
import { useAuthStore } from '../store/useAuthStore';
import { useAppModulesStore } from '../store/useAppModulesStore';
import { useTenantStore } from '../store/useTenantStore';
import { useResellerBranding } from '../hooks/useResellerBranding';

export const PlatformLayout: React.FC = () => {
  const { appId } = useParams<{ appId: string }>();
  const token = useAuthStore((s) => s.token);
  // user.id es la señal universal de identidad efectiva. Login fresco e
  // impersonation start ambos pasan por setAuth(token, user, ...), que
  // cambia user.id. Stop de impersonation hace hard reload (window.location
  // en ImpersonationBanner) → no requiere reaccionar aquí. Logout limpia
  // user → user?.id pasa a undefined → el effect de branding dispara reset()
  // limpiando el chrome del usuario saliente.
  //
  // Por qué keyed por user.id (no por logout/setAuth específicos):
  // reacciona al invariante (identidad), cubre los 3 caminos sin enumerar
  // transiciones. Único cabo conocido y aceptado para MVP: si un reseller
  // sube de plan a white-label en la misma sesión sin recargar, isWhiteLabel
  // no se refresca hasta el próximo cambio de user.id o un F5 (porque
  // user.id no cambia en un upgrade de plan). El flujo de upgrade típicamente
  // redirige/recarga, así que no muerde en la práctica.
  const userId = useAuthStore((s) => s.user?.id);
  // Selectores individuales → identidad estable, sin re-renders por cambios
  // irrelevantes del store. Las funciones del create() de zustand son
  // estables, así que el useEffect de abajo no se re-dispara espuriamente.
  const loadModules = useAppModulesStore((s) => s.loadModules);
  const reset = useAppModulesStore((s) => s.reset);

  // Branding del tenant — keyed por user.id. Reset incondicional + load si
  // hay token. Cubre login fresco, login-como-otro, impersonation start, y
  // limpia en logout. Usa getState() para no suscribirse (el effect ya
  // depende de userId/token explícitamente — no hace falta re-render por
  // mutaciones del tenant store).
  useEffect(() => {
    useTenantStore.getState().reset();
    if (token) {
      useTenantStore.getState().loadBranding(token);
    }
  }, [userId, token]);

  // Aplica --primary del reseller al :root cuando isWhiteLabel + primary.
  useResellerBranding();

  useEffect(() => {
    if (!appId || !token) {
      reset();
      return;
    }
    // Declarar intención. loadModules decide internamente si recargar,
    // descartar como redundante, o limpiar y recargar (cambio de app).
    loadModules(appId, token);
  }, [appId, token, loadModules, reset]);

  return (
    <div className="flex flex-col h-screen w-full bg-gray-50 overflow-hidden font-sans">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <SideNav />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
