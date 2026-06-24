import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useTenantStore } from '../store/useTenantStore';
import { AppCard } from '../components/AppCard';
import { getApps, deleteApp, getSubscription, type AppInfo, type SubscriptionInfo } from '../lib/api';
import { MiniPhoneMockup } from '../components/MiniPhoneMockup';
import { nicheTemplates } from '../lib/niche-templates/nicheRegistry';
import { ActivationChecklistCard } from '../components/ActivationChecklistCard';

export const DashboardPage: React.FC = () => {
  // G3-A: cambio AppData → AppInfo para que el state tenga acceso a los
  // campos extra (designTokens, appConfig, pwaEnabled, pwaLastDeployedAt,
  // tenantId) que necesita ActivationChecklistCard. AppCard sigue
  // funcionando porque AppData es subset estructural de AppInfo.
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [sub, setSub] = useState<SubscriptionInfo | null>(null);
  const token = useAuthStore((s) => s.token);
  const tenantId = useAuthStore((s) => s.user?.tenantId);
  // Banner de bienvenida del white-label: solo visible para reseller sin
  // configurar (nombre Y logo vacíos). Cero persistencia, cero flag en BD —
  // se auto-oculta en cuanto el reseller configura cualquiera de los dos.
  const isWhiteLabel = useTenantStore((s) => s.isWhiteLabel);
  const brandName = useTenantStore((s) => s.branding?.brandName);
  const brandLogoUrl = useTenantStore((s) => s.branding?.brandLogoUrl);
  const showBrandingWelcome = isWhiteLabel && !brandName && !brandLogoUrl;
  const navigate = useNavigate();

  const loadApps = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const [data, subInfo] = await Promise.all([
        getApps(token),
        getSubscription(token).catch(() => null),
      ]);
      setApps(data);
      setSub(subInfo);
      setError('');
    } catch {
      setError('Error al cargar las aplicaciones.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApps();
  }, [token]);

  const handleDelete = async (appId: string) => {
    if (!token) return;
    setDeleteError('');
    try {
      await deleteApp(appId, token);
      setApps((prev) => prev.filter((a) => a.id !== appId));
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Error al eliminar la aplicación.');
      setTimeout(() => setDeleteError(''), 5000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 w-full px-4 sm:px-8 lg:px-12 max-w-[1600px] mx-auto py-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Proyectos</h1>
          <p className="text-[15px] font-medium text-gray-500 mt-2">
            {apps.length > 0 ? `${apps.length} aplicaci${apps.length === 1 ? 'ón' : 'ones'} gestionad${apps.length === 1 ? 'a' : 'as'} en tu espacio` : 'Comienza construyendo tu primera aplicación.'}
          </p>
        </div>
        <button
          onClick={() => navigate('/apps/new')}
          className="flex items-center justify-center px-6 py-3 bg-primary hover:opacity-90 text-white text-[14px] font-semibold rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-all group"
        >
          <svg className="w-5 h-5 mr-2 opacity-80 group-hover:rotate-90 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
          Nuevo Proyecto
        </button>
      </div>

      {/* Branding welcome banner — reseller con plan activo pero sin
          configurar marca (ni nombre ni logo). Se auto-oculta al
          configurar cualquiera de los dos. */}
      {showBrandingWelcome && (
        <div className="mb-6 p-4 bg-primary/5 rounded-xl border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-primary">
              Personaliza tu marca
            </p>
            <p className="text-xs text-primary mt-0.5">
              Tu plan incluye personalización del panel. Sube tu logo, pon tu nombre y elige tu color.
            </p>
          </div>
          <Link
            to="/branding"
            className="inline-flex items-center px-4 py-2 bg-primary hover:opacity-90 text-white text-sm font-medium rounded-lg transition-colors shrink-0"
          >
            Configurar marca
          </Link>
        </div>
      )}

      {/* Upgrade banner for FREE plan */}
      {sub && sub.subscription.plan.planType === 'FREE' && (
        <div className="mb-6 p-4 bg-primary/5 rounded-xl border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-primary">
              Estás en el plan Free
            </p>
            <p className="text-xs text-primary mt-0.5">
              Actualiza para crear más apps, generar builds y desbloquear todas las funciones.
            </p>
          </div>
          <Link
            to="/pricing"
            className="inline-flex items-center px-4 py-2 bg-primary hover:opacity-90 text-white text-sm font-medium rounded-lg transition-colors shrink-0"
          >
            Ver planes
          </Link>
        </div>
      )}

      {/* Subscription info bar */}
      {sub && (
        <div className="mb-8 p-4 bg-white rounded-xl border border-gray-200/60 shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center px-3 py-1 bg-primary/10 text-primary text-[13px] font-bold rounded-lg">
              {sub.subscription.plan.name}
            </span>
            <div className="flex items-center gap-6 text-[13px] text-gray-600">
              <span>
                Apps: <strong className="text-gray-900">{sub.usage.appsCount}</strong>/{sub.subscription.plan.maxApps}
              </span>
              <span>
                Builds: <strong className="text-gray-900">{sub.usage.buildsThisMonth}</strong>/{sub.subscription.plan.maxBuildsPerMonth}/mes
              </span>
              <span>
                Storage: <strong className="text-gray-900">{(sub.usage.storageBytes / 1024 / 1024).toFixed(1)} MB</strong>/{sub.subscription.plan.storageGb} GB
              </span>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
          <button onClick={loadApps} className="ml-2 underline">
            Reintentar
          </button>
        </div>
      )}

      {deleteError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center justify-between">
          <span>{deleteError}</span>
          <button onClick={() => setDeleteError('')} className="ml-2 text-red-500 hover:text-red-700 font-bold">
            &times;
          </button>
        </div>
      )}

      {/* G3-A: checklist de activación. Solo aparece si hay al menos
          1 app no dismissed y el tenantId está disponible. La card
          decide internamente la app target (más reciente no dismissed)
          y se auto-oculta cuando todas las elegibles están al 4/4
          dismissed o no hay ninguna. */}
      {!loading && apps.length > 0 && token && tenantId && (
        <ActivationChecklistCard apps={apps} tenantId={tenantId} token={token} />
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200/60 animate-pulse">
              <div className="h-36 bg-gray-100 rounded-t-xl" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-100 rounded w-2/3" />
                <div className="h-3 bg-gray-100 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : apps.length === 0 ? (
        <div className="py-16 flex flex-col items-center">
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Crea tu primera aplicación
          </h3>
          <p className="text-sm text-gray-500 mb-10 text-center max-w-md">
            Elige una de nuestras plantillas profesionales y ten tu app lista en minutos.
          </p>

          {/* G3-B: preview de 3 plantillas populares como gancho visual. */}
          {/* `as const` para que TS infiera readonly tuple en vez de string[] */}
          {/* — sino la comparación con t.id daría warning. find() + null */}
          {/* check protege si algún id desaparece del registry en el futuro. */}
          <div className="flex flex-wrap justify-center gap-6 mb-10">
            {(['restaurante', 'gimnasio', 'cafeteria'] as const).map((id) => {
              const tpl = nicheTemplates.find((t) => t.id === id);
              if (!tpl) return null;
              return (
                <div key={id} className="flex flex-col items-center gap-2">
                  <div className="opacity-90 hover:opacity-100 hover:scale-[1.03] transition-all duration-200">
                    <MiniPhoneMockup tokens={tpl.design_tokens} templateName={tpl.name} />
                  </div>
                  <span className="text-xs font-medium text-gray-500">
                    {tpl.preview_emoji} {tpl.name}
                  </span>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => navigate('/apps/new')}
            className="px-8 py-3 bg-primary hover:opacity-90 text-white text-sm font-semibold rounded-xl shadow-sm transition-all"
          >
            + Crear mi primera app
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {apps.map((app) => (
            <AppCard key={app.id} app={app} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
};
