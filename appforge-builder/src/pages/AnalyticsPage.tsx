import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import {
  getAppAnalyticsOverview,
  getAppAnalyticsModules,
  getAppAnalyticsDevices,
  getAppAnalyticsRetention,
  type AnalyticsOverview,
  type ModuleRanking,
  type DeviceBreakdown,
  type RetentionData,
} from '../lib/api';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';
import {
  Users, Activity, Clock, Eye, Smartphone, Loader2, BarChart3,
} from 'lucide-react';

const PERIODS = [
  { value: '7d', label: '7 días' },
  { value: '30d', label: '30 días' },
  { value: '90d', label: '90 días' },
];

const PIE_COLORS = ['#22c55e', '#3b82f6', '#a855f7'];

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
}

const KpiCard: React.FC<{
  label: string;
  value: string | number;
  icon: React.ReactNode;
}> = ({ label, value, icon }) => (
  <div className="bg-white rounded-[20px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5 flex items-center gap-4">
    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
      {icon}
    </div>
    <div>
      <p className="text-[22px] font-bold text-gray-900 leading-tight">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  </div>
);

export const AnalyticsPage: React.FC = () => {
  const { appId } = useParams<{ appId: string }>();
  const token = useAuthStore((s) => s.token);
  const [period, setPeriod] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [modules, setModules] = useState<ModuleRanking[]>([]);
  const [devices, setDevices] = useState<DeviceBreakdown | null>(null);
  const [retention, setRetention] = useState<RetentionData | null>(null);

  useEffect(() => {
    if (!appId || !token) return;
    setLoading(true);
    Promise.all([
      getAppAnalyticsOverview(appId, period, token),
      getAppAnalyticsModules(appId, period, token),
      getAppAnalyticsDevices(appId, period, token),
      getAppAnalyticsRetention(appId, period, token),
    ])
      .then(([o, m, d, r]) => {
        setOverview(o);
        setModules(m);
        setDevices(d);
        setRetention(r);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [appId, token, period]);

  if (!appId) return null;

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto flex justify-center py-20">
        <Loader2 size={28} className="animate-spin text-gray-400" />
      </div>
    );
  }

  const dailyTrend = (overview?.dailyTrend ?? []).map((d) => ({
    ...d,
    label: formatDate(d.day),
  }));

  const retentionTrend = (retention?.dailyActiveUsers ?? []).map((d) => ({
    ...d,
    label: formatDate(d.day),
  }));

  const pieData = devices
    ? [
        { name: 'Android', value: devices.platforms.android },
        { name: 'iOS', value: devices.platforms.ios },
        { name: 'Web', value: devices.platforms.web },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Analíticas</h1>
          <p className="text-sm text-gray-500 mt-0.5">Métricas de uso de tu app</p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                period === p.value
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      {overview && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Usuarios activos"
            value={overview.activeUsers}
            icon={<Users size={18} />}
          />
          <KpiCard
            label="Sesiones totales"
            value={overview.totalSessions}
            icon={<Activity size={18} />}
          />
          <KpiCard
            label="Duración media"
            value={formatDuration(overview.avgSessionDuration)}
            icon={<Clock size={18} />}
          />
          <KpiCard
            label="Vistas de pantalla"
            value={overview.totalScreenViews}
            icon={<Eye size={18} />}
          />
        </div>
      )}

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Daily users/sessions trend */}
        <div className="bg-white rounded-[24px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8">
          <h2 className="text-[15px] font-bold text-gray-900 mb-6">Usuarios y sesiones por día</h2>
          {dailyTrend.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">Sin datos en este periodo</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={dailyTrend}>
                <defs>
                  <linearGradient id="usersGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="sessionsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip />
                <Area type="monotone" dataKey="users" stroke="#3b82f6" fillOpacity={1} fill="url(#usersGrad)" name="Usuarios" />
                <Area type="monotone" dataKey="sessions" stroke="#8b5cf6" fillOpacity={1} fill="url(#sessionsGrad)" name="Sesiones" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Module ranking */}
        <div className="bg-white rounded-[24px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8">
          <h2 className="text-[15px] font-bold text-gray-900 mb-6">Módulos más visitados</h2>
          {modules.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">Sin datos en este periodo</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={modules} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis
                  type="category"
                  dataKey="moduleId"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  width={120}
                />
                <Tooltip />
                <Bar dataKey="views" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Vistas" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Device breakdown */}
        <div className="bg-white rounded-[24px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8">
          <h2 className="text-[15px] font-bold text-gray-900 mb-6">Plataformas</h2>
          {pieData.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">Sin datos en este periodo</p>
          ) : (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {pieData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                    <span className="text-sm text-gray-600">{d.name}</span>
                    <span className="text-sm font-bold text-gray-900 ml-auto">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Retention */}
        <div className="bg-white rounded-[24px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8">
          <h2 className="text-[15px] font-bold text-gray-900 mb-4">Retención</h2>
          {retention && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: 'DAU', value: retention.dau },
                { label: 'WAU', value: retention.wau },
                { label: 'MAU', value: retention.mau },
              ].map(({ label, value }) => (
                <div key={label} className="bg-blue-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-blue-700">{value}</p>
                  <p className="text-[10px] font-medium text-blue-500">{label}</p>
                </div>
              ))}
            </div>
          )}
          {retentionTrend.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Sin datos</p>
          ) : (
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={retentionTrend}>
                <defs>
                  <linearGradient id="retGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip />
                <Area type="monotone" dataKey="users" stroke="#22c55e" fillOpacity={1} fill="url(#retGrad)" name="Usuarios activos" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top Devices Table */}
      {devices && devices.topDevices.length > 0 && (
        <div className="bg-white rounded-[24px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-100 flex items-center gap-2">
            <Smartphone size={16} className="text-gray-400" />
            <h2 className="text-[15px] font-bold text-gray-900">Top dispositivos</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-8 py-3 text-xs font-medium text-gray-500">Modelo</th>
                <th className="px-8 py-3 text-xs font-medium text-gray-500 text-right">Sesiones</th>
              </tr>
            </thead>
            <tbody>
              {devices.topDevices.map((d, i) => (
                <tr key={i} className="border-b border-gray-50 last:border-0">
                  <td className="px-8 py-3 text-gray-700">{d.model}</td>
                  <td className="px-8 py-3 text-gray-900 font-medium text-right">{d.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty state */}
      {overview && overview.totalSessions === 0 && (
        <div className="text-center py-12">
          <BarChart3 size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Aún no hay datos de analíticas.</p>
          <p className="text-gray-400 text-xs mt-1">Los datos aparecerán cuando los usuarios empiecen a usar tu app.</p>
        </div>
      )}
    </div>
  );
};
