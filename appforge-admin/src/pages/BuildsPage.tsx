import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '../store/useAuthStore';
import { listBuilds, retryBuild } from '../lib/api';
import type { AppBuild, PaginatedResponse } from '../lib/api';
import { DataTable, type Column } from '../components/DataTable';
import { StatusBadge, buildStatusVariant } from '../components/StatusBadge';
import { RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';

function formatDuration(start: string | null, end: string | null): string {
  if (!start || !end) return '—';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return '<1s';
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  return `${mins}m ${secs % 60}s`;
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return '—';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

const statusOptions = [
  { value: '', label: 'Todos los estados' },
  { value: 'QUEUED', label: 'En cola' },
  { value: 'PREPARING', label: 'Preparando' },
  { value: 'BUILDING', label: 'Compilando' },
  { value: 'SIGNING', label: 'Firmando' },
  { value: 'COMPLETED', label: 'Completado' },
  { value: 'FAILED', label: 'Fallido' },
];

export const BuildsPage: React.FC = () => {
  const token = useAuthStore((s) => s.token)!;
  const navigate = useNavigate();

  const [result, setResult] = useState<PaginatedResponse<AppBuild> | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [expandedBuild, setExpandedBuild] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [retryError, setRetryError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listBuilds(token, {
        status: statusFilter || undefined,
        from: dateFrom || undefined,
        to: dateTo || undefined,
        page,
        limit: 20,
      });
      setResult(res);
    } catch (err: any) {
      toast.error(err?.message ?? 'Error al cargar builds');
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter, dateFrom, dateTo, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, dateFrom, dateTo]);

  const handleRetry = async (buildId: string) => {
    setRetrying(buildId);
    setRetryError(null);
    try {
      await retryBuild(token, buildId);
      await fetchData();
    } catch (err) {
      setRetryError(err instanceof Error ? err.message : 'Error al reintentar build');
    } finally {
      setRetrying(null);
    }
  };

  const columns: Column<AppBuild>[] = [
    {
      key: 'app',
      header: 'App',
      render: (b) => <span className="font-medium text-gray-900">{b.app?.name ?? '—'}</span>,
    },
    {
      key: 'tenant',
      header: 'Tenant',
      render: (b) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (b.app?.tenant?.id) navigate(`/tenants/${b.app.tenant.id}`);
          }}
          className="text-gray-500 hover:text-orange-600 hover:underline"
        >
          {b.app?.tenant?.name ?? '—'}
        </button>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (b) => <StatusBadge label={b.status} variant={buildStatusVariant(b.status)} />,
    },
    {
      key: 'type',
      header: 'Tipo',
      render: (b) => <span className="text-xs uppercase text-gray-500">{b.buildType}</span>,
    },
    {
      key: 'size',
      header: 'Tamaño',
      render: (b) => <span className="text-gray-500">{formatBytes(b.artifactSize)}</span>,
    },
    {
      key: 'duration',
      header: 'Duración',
      render: (b) => (
        <span className="text-gray-500">{formatDuration(b.startedAt, b.completedAt)}</span>
      ),
    },
    {
      key: 'date',
      header: 'Fecha',
      render: (b) => (
        <span className="text-gray-400">{new Date(b.createdAt).toLocaleString('es-ES')}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (b) => (
        <div className="flex items-center space-x-2">
          {b.status === 'FAILED' && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRetry(b.id);
                }}
                disabled={retrying === b.id}
                className="inline-flex items-center space-x-1 text-xs font-medium text-orange-600 hover:text-orange-700 disabled:opacity-50"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${retrying === b.id ? 'animate-spin' : ''}`} />
                <span>Retry</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedBuild(expandedBuild === b.id ? null : b.id);
                }}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                {expandedBuild === b.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </>
          )}
        </div>
      ),
      className: 'text-right',
    },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Builds</h1>

      {retryError && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-100">
          {retryError}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
        >
          {statusOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
          placeholder="Desde"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
          placeholder="Hasta"
        />
      </div>

      {loading && !result ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
        </div>
      ) : result ? (
        <>
          <DataTable
            columns={columns}
            data={result.data}
            total={result.total}
            page={result.page}
            limit={result.limit}
            onPageChange={setPage}
            rowKey={(b) => b.id}
            emptyMessage="No se encontraron builds."
          />

          {/* Expanded error details */}
          {expandedBuild && (
            <div className="bg-gray-900 rounded-xl p-4 text-sm font-mono text-gray-300 overflow-x-auto">
              <p className="text-red-400 mb-2">Error:</p>
              <pre className="whitespace-pre-wrap">
                {result.data.find((b) => b.id === expandedBuild)?.errorMessage ?? 'Sin detalles'}
              </pre>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
};
