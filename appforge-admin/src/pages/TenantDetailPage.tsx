import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import {
  getTenantDetail, updateTenantStatus, deleteTenant, changeTenantPlan,
} from '../lib/api';
import type { TenantDetail, PlanType } from '../lib/api';
import { StatusBadge, tenantStatusVariant, userStatusVariant, buildStatusVariant } from '../components/StatusBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ArrowLeft, Shield, ShieldOff, Trash2 } from 'lucide-react';

const planTypes: PlanType[] = ['FREE', 'STARTER', 'PROFESSIONAL', 'RESELLER_STARTER', 'RESELLER_PRO'];

export const TenantDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const token = useAuthStore((s) => s.token)!;
  const navigate = useNavigate();

  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'apps' | 'users' | 'builds'>('apps');
  const [confirmAction, setConfirmAction] = useState<'suspend' | 'reactivate' | 'delete' | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [changingPlan, setChangingPlan] = useState(false);

  const fetchTenant = async () => {
    if (!id) return;
    try {
      const data = await getTenantDetail(token, id);
      setTenant(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenant();
  }, [id, token]);

  const handleStatusChange = async () => {
    if (!tenant || !id) return;
    setActionLoading(true);
    try {
      const newStatus = tenant.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
      await updateTenantStatus(token, id, newStatus);
      await fetchTenant();
    } catch {
      // ignore
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      await deleteTenant(token, id);
      navigate('/tenants', { replace: true });
    } catch {
      // ignore
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  const handlePlanChange = async (planType: PlanType) => {
    if (!id) return;
    setChangingPlan(true);
    try {
      await changeTenantPlan(token, id, planType);
      await fetchTenant();
    } catch {
      // ignore
    } finally {
      setChangingPlan(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!tenant) {
    return <p className="text-gray-500">Tenant no encontrado.</p>;
  }

  const allPendingDeletion = tenant.users.length > 0 && tenant.users.every((u) => u.status === 'PENDING_DELETION');
  const isSuspended = tenant.status === 'SUSPENDED';

  const tabs = [
    { key: 'apps' as const, label: `Apps (${tenant.apps.length})` },
    { key: 'users' as const, label: `Usuarios (${tenant.users.length})` },
    { key: 'builds' as const, label: 'Builds recientes' },
  ];

  // Flatten builds from all apps
  const allBuilds = tenant.apps
    .flatMap((app) => app.builds.map((b) => ({ ...b, appName: app.name })))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 20);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <button onClick={() => navigate('/tenants')} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div className="flex-1">
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-bold text-gray-900">{tenant.name}</h1>
            <StatusBadge label={tenant.status} variant={tenantStatusVariant(tenant.status)} />
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Plan: {tenant.subscription?.plan?.name ?? 'Sin plan'} | Registrado: {new Date(tenant.createdAt).toLocaleDateString('es-ES')}
          </p>
        </div>
      </div>

      {/* Actions + Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Actions card */}
        <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Acciones</h2>

          {/* Plan change */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Cambiar plan</label>
            <select
              value={tenant.subscription?.plan?.planType ?? ''}
              onChange={(e) => handlePlanChange(e.target.value as PlanType)}
              disabled={changingPlan}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 disabled:opacity-50"
            >
              {planTypes.map((p) => (
                <option key={p} value={p}>{p.replace('_', ' ')}</option>
              ))}
            </select>
          </div>

          {/* Suspend/Reactivate */}
          <button
            onClick={() => setConfirmAction(isSuspended ? 'reactivate' : 'suspend')}
            className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isSuspended
                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            {isSuspended ? <Shield className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
            <span>{isSuspended ? 'Reactivar' : 'Suspender'}</span>
          </button>

          {/* Delete */}
          <button
            onClick={() => setConfirmAction('delete')}
            disabled={!allPendingDeletion}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-700 hover:bg-red-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            <span>Eliminar tenant</span>
          </button>
          {!allPendingDeletion && (
            <p className="text-xs text-gray-400">Solo se puede eliminar cuando todos los usuarios tienen eliminación pendiente.</p>
          )}
        </div>

        {/* Usage card */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200/60 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Uso del plan</h2>
          <div className="grid grid-cols-3 gap-4">
            <UsageBar label="Apps" used={tenant.usage.appsUsed} max={tenant.usage.maxApps} />
            <UsageBar label="Builds/mes" used={tenant.usage.buildsUsed} max={tenant.usage.maxBuilds} />
            <UsageBar
              label="Storage"
              used={tenant.usage.storageUsedBytes}
              max={tenant.usage.storageMaxBytes}
              formatFn={formatBytes}
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex space-x-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'apps' && (
        <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/50 text-xs text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Nombre</th>
                <th className="px-4 py-2 text-left">Slug</th>
                <th className="px-4 py-2 text-left">Estado</th>
                <th className="px-4 py-2 text-left">Último build</th>
              </tr>
            </thead>
            <tbody>
              {tenant.apps.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Sin apps</td></tr>
              ) : (
                tenant.apps.map((app) => (
                  <tr key={app.id} className="border-b border-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-900">{app.name}</td>
                    <td className="px-4 py-2.5 text-gray-500 font-mono text-xs">{app.slug}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge label={app.status} variant={app.status === 'PUBLISHED' ? 'success' : 'neutral'} />
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">
                      {app.builds[0]
                        ? `${app.builds[0].status} — ${new Date(app.builds[0].createdAt).toLocaleDateString('es-ES')}`
                        : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/50 text-xs text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-left">Nombre</th>
                <th className="px-4 py-2 text-left">Rol</th>
                <th className="px-4 py-2 text-left">Estado</th>
                <th className="px-4 py-2 text-left">Registrado</th>
              </tr>
            </thead>
            <tbody>
              {tenant.users.map((u) => (
                <tr key={u.id} className="border-b border-gray-50">
                  <td className="px-4 py-2.5 text-gray-900">{u.email}</td>
                  <td className="px-4 py-2.5 text-gray-500">
                    {u.firstName ? `${u.firstName} ${u.lastName ?? ''}`.trim() : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs uppercase">{u.role}</td>
                  <td className="px-4 py-2.5">
                    <StatusBadge label={u.status} variant={userStatusVariant(u.status)} />
                  </td>
                  <td className="px-4 py-2.5 text-gray-400">{new Date(u.createdAt).toLocaleDateString('es-ES')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'builds' && (
        <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/50 text-xs text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-2 text-left">App</th>
                <th className="px-4 py-2 text-left">Tipo</th>
                <th className="px-4 py-2 text-left">Estado</th>
                <th className="px-4 py-2 text-left">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {allBuilds.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Sin builds</td></tr>
              ) : (
                allBuilds.map((b) => (
                  <tr key={b.id} className="border-b border-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-900">{b.appName}</td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs uppercase">{b.buildType}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge label={b.status} variant={buildStatusVariant(b.status)} />
                    </td>
                    <td className="px-4 py-2.5 text-gray-400">{new Date(b.createdAt).toLocaleString('es-ES')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirm dialogs */}
      <ConfirmDialog
        open={confirmAction === 'suspend'}
        title="Suspender tenant"
        message={`¿Suspender "${tenant.name}"?\n\nTodos los usuarios activos serán suspendidos y no podrán acceder a la plataforma.`}
        confirmLabel="Suspender"
        variant="warning"
        onConfirm={handleStatusChange}
        onCancel={() => setConfirmAction(null)}
        loading={actionLoading}
      />
      <ConfirmDialog
        open={confirmAction === 'reactivate'}
        title="Reactivar tenant"
        message={`¿Reactivar "${tenant.name}"?\n\nLos usuarios suspendidos serán reactivados. Los usuarios con eliminación pendiente no se verán afectados.`}
        confirmLabel="Reactivar"
        variant="warning"
        onConfirm={handleStatusChange}
        onCancel={() => setConfirmAction(null)}
        loading={actionLoading}
      />
      <ConfirmDialog
        open={confirmAction === 'delete'}
        title="Eliminar tenant permanentemente"
        message={`¿Eliminar "${tenant.name}" y todos sus datos?\n\nEsta acción es irreversible. Se eliminarán todas las apps, builds, archivos de storage y datos asociados.`}
        confirmLabel="Eliminar permanentemente"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setConfirmAction(null)}
        loading={actionLoading}
      />
    </div>
  );
};

// ─── Usage bar sub-component ──────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

const UsageBar: React.FC<{
  label: string;
  used: number;
  max: number;
  formatFn?: (n: number) => string;
}> = ({ label, used, max, formatFn }) => {
  const pct = max > 0 ? Math.min(100, (used / max) * 100) : 0;
  const fmt = formatFn ?? ((n: number) => String(n));

  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{label}</span>
        <span>{fmt(used)} / {fmt(max)}</span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-orange-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};
