import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { AppCard } from '../components/AppCard';
import { getApps, deleteApp, getSubscription, type SubscriptionInfo } from '../lib/api';

interface AppData {
  id: string;
  name: string;
  slug: string;
  status: 'DRAFT' | 'PUBLISHED' | 'BUILDING';
  createdAt: string;
  updatedAt: string;
  appConfig?: Record<string, any> | null;
}

export const DashboardPage: React.FC = () => {
  const [apps, setApps] = useState<AppData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [sub, setSub] = useState<SubscriptionInfo | null>(null);
  const token = useAuthStore((s) => s.token);
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
    <div className="min-h-screen bg-[#FAFAFA] w-full px-4 sm:px-8 lg:px-12 max-w-[1600px] mx-auto py-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Proyectos</h1>
          <p className="text-[15px] font-medium text-gray-500 mt-2">
            {apps.length > 0 ? `${apps.length} aplicaci${apps.length === 1 ? 'ón' : 'ones'} gestionad${apps.length === 1 ? 'a' : 'as'} en tu espacio` : 'Comienza construyendo tu primera aplicación.'}
          </p>
        </div>
        <button
          onClick={() => navigate('/apps/new')}
          className="flex items-center justify-center px-6 py-3 bg-[#0A0A0A] hover:bg-black text-white text-[14px] font-semibold rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-all group"
        >
          <svg className="w-5 h-5 mr-2 opacity-80 group-hover:rotate-90 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
          Nuevo Proyecto
        </button>
      </div>

      {/* Upgrade banner for FREE plan */}
      {sub && sub.subscription.plan.planType === 'FREE' && (
        <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-indigo-900">
              Estás en el plan Free
            </p>
            <p className="text-xs text-indigo-600 mt-0.5">
              Actualiza para crear más apps, generar builds y desbloquear todas las funciones.
            </p>
          </div>
          <Link
            to="/pricing"
            className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shrink-0"
          >
            Ver planes
          </Link>
        </div>
      )}

      {/* Subscription info bar */}
      {sub && (
        <div className="mb-8 p-4 bg-white rounded-xl border border-gray-200/60 shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center px-3 py-1 bg-indigo-100 text-indigo-700 text-[13px] font-bold rounded-lg">
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
        <div className="text-center py-20">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-100 mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No tienes aplicaciones aún</h3>
          <p className="text-sm text-gray-500 mb-6">Crea tu primera app seleccionando una plantilla</p>
          <button
            onClick={() => navigate('/apps/new')}
            className="px-6 py-2.5 bg-gradient-to-b from-gray-800 to-gray-900 hover:from-gray-900 hover:to-black text-white text-sm font-medium rounded-lg shadow-sm transition-all"
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
