import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { listTenants } from '../lib/api';
import type { TenantListItem, PaginatedResponse } from '../lib/api';
import { DataTable, type Column } from '../components/DataTable';
import { StatusBadge, tenantStatusVariant } from '../components/StatusBadge';
import { Search } from 'lucide-react';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

const planOptions = [
  { value: '', label: 'Todos los planes' },
  { value: 'FREE', label: 'Free' },
  { value: 'STARTER', label: 'Starter' },
  { value: 'PROFESSIONAL', label: 'Professional' },
  { value: 'RESELLER_STARTER', label: 'Reseller Starter' },
  { value: 'RESELLER_PRO', label: 'Reseller Pro' },
];

const statusOptions = [
  { value: '', label: 'Todos los estados' },
  { value: 'ACTIVE', label: 'Activo' },
  { value: 'SUSPENDED', label: 'Suspendido' },
];

export const TenantsPage: React.FC = () => {
  const token = useAuthStore((s) => s.token)!;
  const navigate = useNavigate();

  const [result, setResult] = useState<PaginatedResponse<TenantListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listTenants(token, {
        search: search || undefined,
        planType: planFilter || undefined,
        status: statusFilter || undefined,
        page,
        limit: 20,
      });
      setResult(res);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [token, search, planFilter, statusFilter, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [search, planFilter, statusFilter]);

  const columns: Column<TenantListItem>[] = [
    {
      key: 'name',
      header: 'Nombre',
      render: (t) => <span className="font-medium text-gray-900">{t.name}</span>,
    },
    {
      key: 'plan',
      header: 'Plan',
      render: (t) => (
        <span className="text-gray-600">{t.subscription?.plan?.name ?? '—'}</span>
      ),
    },
    {
      key: 'apps',
      header: 'Apps',
      render: (t) => t._count.apps,
      className: 'text-center',
    },
    {
      key: 'builds',
      header: 'Builds/mes',
      render: (t) => t.buildsThisMonth,
      className: 'text-center',
    },
    {
      key: 'storage',
      header: 'Storage',
      render: (t) => formatBytes(t.storageBytes),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (t) => (
        <StatusBadge label={t.status} variant={tenantStatusVariant(t.status)} />
      ),
    },
    {
      key: 'createdAt',
      header: 'Creado',
      render: (t) => new Date(t.createdAt).toLocaleDateString('es-ES'),
    },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Clientes</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
          />
        </div>
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
        >
          {planOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
        >
          {statusOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {loading && !result ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
        </div>
      ) : result ? (
        <DataTable
          columns={columns}
          data={result.data}
          total={result.total}
          page={result.page}
          limit={result.limit}
          onPageChange={setPage}
          onRowClick={(t) => navigate(`/tenants/${t.id}`)}
          rowKey={(t) => t.id}
          emptyMessage="No se encontraron clientes."
        />
      ) : null}
    </div>
  );
};
