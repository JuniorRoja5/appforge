import React, { useEffect } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { TopBar } from '../components/TopBar';
import { SideNav } from '../components/SideNav';
import { useAuthStore } from '../store/useAuthStore';
import { useAppModulesStore } from '../store/useAppModulesStore';

export const PlatformLayout: React.FC = () => {
  const { appId } = useParams<{ appId: string }>();
  const token = useAuthStore((s) => s.token);
  // Selectores individuales → identidad estable, sin re-renders por cambios
  // irrelevantes del store. Las funciones del create() de zustand son
  // estables, así que el useEffect de abajo no se re-dispara espuriamente.
  const loadModules = useAppModulesStore((s) => s.loadModules);
  const reset = useAppModulesStore((s) => s.reset);

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
