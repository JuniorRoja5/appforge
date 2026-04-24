import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { getAnalytics, retryBuild } from '../lib/api';
import type { AnalyticsData } from '../lib/api';
import { KpiCard } from '../components/KpiCard';
import { StatusBadge, buildStatusVariant } from '../components/StatusBadge';
import { Users, AppWindow, Hammer, HardDrive, RotateCcw, AlertTriangle } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
}

export const DashboardPage: React.FC = () => {
  const token = useAuthStore((s) => s.token)!;
  const navigate = useNavigate();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);

  useEffect(() => {
    getAnalytics(token)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const handleRetry = async (buildId: string) => {
    setRetrying(buildId);
    try {
      await retryBuild(token, buildId);
      // Refresh analytics
      const fresh = await getAnalytics(token);
      setData(fresh);
    } catch {
      // silently fail — build page has better error handling
    } finally {
      setRetrying(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-gray-500">Error al cargar datos.</p>;
  }

  const weeklyData = data.weeklyRegistrations.map((w) => ({
    ...w,
    label: formatDate(w.week),
  }));

  const moduleData = data.moduleUsage.slice(0, 5);

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Panel de Control</h1>
          <p className="text-[15px] font-medium text-gray-500 mt-2">Visión general y métricas destacadas del sistema</p>
        </div>
      </div>

      {/* Failed payments alert */}
      {data.totals.failedPaymentsCount > 0 && (
        <button
          onClick={() => navigate('/billing')}
          className="w-full flex items-center gap-3 px-6 py-4 bg-orange-50 border border-orange-200 rounded-2xl hover:bg-orange-100 transition-colors text-left"
        >
          <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0" />
          <p className="text-sm font-semibold text-orange-800">
            {data.totals.failedPaymentsCount} pago{data.totals.failedPaymentsCount !== 1 ? 's' : ''} fallido{data.totals.failedPaymentsCount !== 1 ? 's' : ''} — Ver Facturación
          </p>
        </button>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Clientes"
          value={data.totals.tenants}
          icon={<Users className="w-5 h-5" />}
        />
        <KpiCard
          label="Apps"
          value={data.totals.apps}
          icon={<AppWindow className="w-5 h-5" />}
        />
        <KpiCard
          label="Builds este mes"
          value={data.totals.buildsThisMonth}
          icon={<Hammer className="w-5 h-5" />}
        />
        <KpiCard
          label="Storage total"
          value={formatBytes(data.totals.storageBytes)}
          icon={<HardDrive className="w-5 h-5" />}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Weekly registrations */}
        <div className="bg-white rounded-[24px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8">
          <h2 className="text-[15px] font-bold text-gray-900 mb-6">Registros por semana</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={weeklyData}>
              <defs>
                <linearGradient id="regGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#f97316"
                fillOpacity={1}
                fill="url(#regGrad)"
                name="Registros"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Module usage */}
        <div className="bg-white rounded-[24px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8">
          <h2 className="text-[15px] font-bold text-gray-900 mb-6">Top módulos usados</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={moduleData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis
                type="category"
                dataKey="moduleId"
                tick={{ fontSize: 11, fill: '#64748b' }}
                width={120}
              />
              <Tooltip />
              <Bar dataKey="count" fill="#f97316" radius={[0, 4, 4, 0]} name="Usos" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent failed builds */}
      <div className="bg-white rounded-[24px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-100">
          <h2 className="text-[15px] font-bold text-gray-900">Últimos builds fallidos</h2>
        </div>
        {data.recentFailedBuilds.length === 0 ? (
          <p className="px-5 py-8 text-center text-gray-400 text-sm">
            No hay builds fallidos recientes.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/50 text-xs text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-2 text-left">App</th>
                <th className="px-4 py-2 text-left">Tenant</th>
                <th className="px-4 py-2 text-left">Tipo</th>
                <th className="px-4 py-2 text-left">Estado</th>
                <th className="px-4 py-2 text-left">Fecha</th>
                <th className="px-4 py-2 text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {data.recentFailedBuilds.map((b) => (
                <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 font-medium text-gray-900">
                    {b.app?.name ?? '—'}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">
                    <button
                      onClick={() => b.app?.tenant?.id && navigate(`/tenants/${b.app.tenant.id}`)}
                      className="hover:text-orange-600 hover:underline"
                    >
                      {b.app?.tenant?.name ?? '—'}
                    </button>
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 uppercase text-xs">
                    {b.buildType}
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge label={b.status} variant={buildStatusVariant(b.status)} />
                  </td>
                  <td className="px-4 py-2.5 text-gray-400">
                    {new Date(b.createdAt).toLocaleString('es-ES')}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => handleRetry(b.id)}
                      disabled={retrying === b.id}
                      className="inline-flex items-center space-x-1 text-xs font-medium text-orange-600 hover:text-orange-700 disabled:opacity-50"
                    >
                      <RotateCcw className={`w-3.5 h-3.5 ${retrying === b.id ? 'animate-spin' : ''}`} />
                      <span>Retry</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
