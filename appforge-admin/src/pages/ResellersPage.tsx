import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { listTenants, getTenantDetail } from '../lib/api';
import type { TenantListItem } from '../lib/api';
import { DataTable, type Column } from '../components/DataTable';
import { StatusBadge, tenantStatusVariant } from '../components/StatusBadge';
import { ChevronDown, ChevronUp } from 'lucide-react';

// Resellers are tenants with RESELLER_STARTER or RESELLER_PRO plans
// We load them in two requests and merge

export const ResellersPage: React.FC = () => {
  const token = useAuthStore((s) => s.token)!;
  const navigate = useNavigate();

  const [resellers, setResellers] = useState<TenantListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedApps, setExpandedApps] = useState<Array<{
    id: string; name: string; clientName?: string | null; clientEmail?: string | null; clientNotes?: string | null;
  }>>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch both reseller plan types
      const [starterRes, proRes] = await Promise.all([
        listTenants(token, { planType: 'RESELLER_STARTER', page, limit: 50 }),
        listTenants(token, { planType: 'RESELLER_PRO', page, limit: 50 }),
      ]);

      const merged = [...starterRes.data, ...proRes.data]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setResellers(merged);
      setTotal(starterRes.total + proRes.total);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [token, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExpand = async (tenant: TenantListItem) => {
    if (expandedId === tenant.id) {
      setExpandedId(null);
      setExpandedApps([]);
      return;
    }

    // Fetch tenant detail to get apps with client info
    try {
      const detail = await getTenantDetail(token, tenant.id);
      setExpandedId(tenant.id);
      setExpandedApps(
        detail.apps.map((a) => ({
          id: a.id,
          name: a.name,
          clientName: a.clientName,
          clientEmail: a.clientEmail,
          clientNotes: a.clientNotes,
        })),
      );
    } catch {
      // ignore
    }
  };

  const columns: Column<TenantListItem>[] = [
    {
      key: 'expand',
      header: '',
      render: (t) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleExpand(t);
          }}
          className="p-1 text-gray-400 hover:text-gray-600"
        >
          {expandedId === t.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      ),
      className: 'w-10',
    },
    {
      key: 'name',
      header: 'Reseller',
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
      key: 'users',
      header: 'Usuarios',
      render: (t) => t._count.users,
      className: 'text-center',
    },
    {
      key: 'status',
      header: 'Estado',
      render: (t) => <StatusBadge label={t.status} variant={tenantStatusVariant(t.status)} />,
    },
    {
      key: 'createdAt',
      header: 'Creado',
      render: (t) => new Date(t.createdAt).toLocaleDateString('es-ES'),
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Resellers</h1>
        <p className="text-sm text-gray-500 mt-1">Clientes con planes de reventa (white-label)</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={resellers}
            total={total}
            page={page}
            limit={100}
            onPageChange={setPage}
            onRowClick={(t) => navigate(`/tenants/${t.id}`)}
            rowKey={(t) => t.id}
            emptyMessage="No hay resellers registrados."
          />

          {/* Expanded apps with client info */}
          {expandedId && expandedApps.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm overflow-hidden ml-8">
              <div className="px-4 py-3 bg-gray-50/50 border-b border-gray-100">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Apps del reseller
                </h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-2 text-left">App</th>
                    <th className="px-4 py-2 text-left">Cliente</th>
                    <th className="px-4 py-2 text-left">Email cliente</th>
                    <th className="px-4 py-2 text-left">Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {expandedApps.map((app) => (
                    <tr key={app.id} className="border-b border-gray-50">
                      <td className="px-4 py-2.5 font-medium text-gray-900">{app.name}</td>
                      <td className="px-4 py-2.5 text-gray-600">{app.clientName ?? '—'}</td>
                      <td className="px-4 py-2.5 text-gray-500">{app.clientEmail ?? '—'}</td>
                      <td className="px-4 py-2.5 text-gray-400 max-w-[200px] truncate">{app.clientNotes ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {expandedId && expandedApps.length === 0 && (
            <div className="ml-8 bg-gray-50 rounded-xl p-4 text-sm text-gray-400 text-center">
              Este reseller no tiene apps creadas.
            </div>
          )}
        </>
      )}
    </div>
  );
};
