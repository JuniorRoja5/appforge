import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FC, ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import {
  Package, Clock as ClockIcon, CheckCircle, XCircle, Truck,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import {
  getOrders, updateOrderStatus, getOrderStats, type OrderData,
} from '../lib/api';
import { DataAdminShell } from '../components/admin/DataAdminShell';
import { WorkflowInbox } from '../components/admin/WorkflowInbox';
import type { RowAction, StatusOption } from '../components/admin/types';

type OrderStatus = OrderData['status'];
type FilterValue = OrderStatus | 'ALL';

const STATUS_LABELS: Record<OrderStatus, { label: string; color: string; icon: ReactNode }> = {
  PENDING:   { label: 'Pendiente',  color: 'bg-yellow-100 text-yellow-700', icon: <ClockIcon size={12} /> },
  CONFIRMED: { label: 'Confirmado', color: 'bg-blue-100 text-blue-700',    icon: <CheckCircle size={12} /> },
  READY:     { label: 'Preparado',  color: 'bg-green-100 text-green-700',  icon: <Package size={12} /> },
  DELIVERED: { label: 'Entregado',  color: 'bg-gray-100 text-gray-600',    icon: <Truck size={12} /> },
  CANCELLED: { label: 'Cancelado',  color: 'bg-red-100 text-red-700',      icon: <XCircle size={12} /> },
};

// "Todos" primero (gate #3 de Fase 1)
const STATUS_OPTIONS: StatusOption<FilterValue>[] = [
  { value: 'ALL',       label: 'Todos' },
  { value: 'PENDING',   label: 'Pendientes' },
  { value: 'CONFIRMED', label: 'Confirmados' },
  { value: 'READY',     label: 'Preparados' },
  { value: 'DELIVERED', label: 'Entregados' },
  { value: 'CANCELLED', label: 'Cancelados' },
];

const buildRowActions = (
  appId: string,
  token: string,
  refetch: () => Promise<void>,
): RowAction<OrderData>[] => [
  {
    id: 'confirm',
    label: 'Confirmar pedido',
    icon: <CheckCircle size={16} />,
    variant: 'primary',
    isAvailable: (o) => o.status === 'PENDING',
    onClick: async (o) => {
      await updateOrderStatus(appId, o.id, 'CONFIRMED', token);
      await refetch();
    },
  },
  {
    id: 'ready',
    label: 'Marcar preparado',
    icon: <Package size={16} />,
    variant: 'success',
    isAvailable: (o) => o.status === 'CONFIRMED',
    onClick: async (o) => {
      await updateOrderStatus(appId, o.id, 'READY', token);
      await refetch();
    },
  },
  {
    id: 'delivered',
    label: 'Marcar entregado',
    icon: <Truck size={16} />,
    variant: 'default',
    isAvailable: (o) => o.status === 'READY',
    onClick: async (o) => {
      await updateOrderStatus(appId, o.id, 'DELIVERED', token);
      await refetch();
    },
  },
  {
    id: 'cancel',
    label: 'Cancelar pedido',
    icon: <XCircle size={16} />,
    variant: 'destructive',
    isAvailable: (o) => o.status === 'PENDING' || o.status === 'CONFIRMED',
    confirm: {
      title: '¿Cancelar este pedido?',
      description:
        'El cliente recibirá una notificación de cancelación. Esta acción no se puede deshacer.',
      confirmLabel: 'Cancelar pedido',
      cancelLabel: 'Mantener',
      variant: 'destructive',
    },
    onClick: async (o) => {
      await updateOrderStatus(appId, o.id, 'CANCELLED', token);
      await refetch();
    },
  },
];

interface OrdersStats {
  pendingCount: number;
  todayCount: number;
  totalRevenue: number;
  currency: string;
}

const OrdersStatsCards: FC<{ stats: OrdersStats; currency: string }> = ({ stats, currency }) => (
  <div className="grid grid-cols-3 gap-3">
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
      <div className="text-2xl font-bold text-yellow-700">{stats.pendingCount}</div>
      <div className="text-xs text-yellow-600 mt-0.5">Pendientes</div>
    </div>
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
      <div className="text-2xl font-bold text-blue-700">{stats.todayCount}</div>
      <div className="text-xs text-blue-600 mt-0.5">Hoy</div>
    </div>
    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
      <div className="text-2xl font-bold text-green-700">
        {stats.totalRevenue.toFixed(2)}{currency}
      </div>
      <div className="text-xs text-green-600 mt-0.5">Ingresos</div>
    </div>
  </div>
);

const OrderRow: FC<{
  order: OrderData;
  currency: string;
  actions: ReactNode;
}> = ({ order, currency, actions }) => {
  const statusInfo = STATUS_LABELS[order.status];
  return (
    <div className="p-3 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="text-sm font-semibold text-gray-900">{order.customerName}</span>
          {order.customerPhone && (
            <span className="text-xs text-gray-400 ml-2">{order.customerPhone}</span>
          )}
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 ${statusInfo.color}`}
        >
          {statusInfo.icon} {statusInfo.label}
        </span>
      </div>
      <div className="text-xs text-gray-500">
        {order.items.map((item, i) => (
          <span key={i}>
            {i > 0 ? ', ' : ''}
            {item.quantity}× {item.name}
          </span>
        ))}
      </div>
      <div className="flex items-center justify-between">
        {/* parseFloat(String(...)) defensivo: Prisma serializa Decimal como string
            por el cable aunque OrderData.total esté tipado como number en lib/api.ts. */}
        <span className="text-sm font-bold text-primary">
          {parseFloat(String(order.total)).toFixed(2)}{currency}
        </span>
        <span className="text-xs text-gray-400">
          {new Date(order.createdAt).toLocaleString('es-ES')}
        </span>
      </div>
      {order.customerNotes && (
        <div className="text-xs text-gray-600 bg-gray-50 rounded p-2">
          Nota: {order.customerNotes}
        </div>
      )}
      <div className="flex justify-end pt-1">{actions}</div>
    </div>
  );
};

export const OrdersAdminPage: FC = () => {
  const { appId } = useParams<{ appId: string }>();
  const token = useAuthStore((s) => s.token);

  const [orders, setOrders] = useState<OrderData[]>([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const [stats, setStats] = useState<OrdersStats | null>(null);

  const [initialLoading, setInitialLoading] = useState(true);
  const [refetching, setRefetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<FilterValue>('ALL');
  const [page, setPage] = useState(1);

  const currency = stats?.currency ?? '€';
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 1;

  const fetchOrders = useCallback(async () => {
    if (!appId || !token) return;
    setError(null);
    try {
      const res = await getOrders(appId, token, {
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        page,
      });
      setOrders(res.data);
      setTotal(res.total);
      setLimit(res.limit);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudieron cargar los pedidos.',
      );
    }
  }, [appId, token, statusFilter, page]);

  const fetchStats = useCallback(async () => {
    if (!appId || !token) return;
    try {
      setStats(await getOrderStats(appId, token));
    } catch (err) {
      // Stats secundarias: si fallan no rompemos la página (currency cae al
      // fallback '€' y las cards no se renderizan). El error NO se traga en
      // silencio — patrón de Fase 0: visibilidad mínima en consola.
      // eslint-disable-next-line no-console
      console.error('[OrdersAdminPage] stats fetch failed:', err);
    }
  }, [appId, token]);

  // Carga inicial: bloquea la página solo la primera vez (gate #2).
  useEffect(() => {
    if (!appId || !token) return;
    setInitialLoading(true);
    Promise.all([fetchOrders(), fetchStats()]).finally(() =>
      setInitialLoading(false),
    );
    // Solo dispara al montar / cambio de appId|token. Refetches por filtro/página
    // van por el otro effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId, token]);

  // Refetches por cambio de filtro o página — sin bloquear el Shell.
  useEffect(() => {
    if (initialLoading) return;
    setRefetching(true);
    fetchOrders().finally(() => setRefetching(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, page]);

  const refetchAll = useCallback(async () => {
    await Promise.all([fetchOrders(), fetchStats()]);
  }, [fetchOrders, fetchStats]);

  const rowActions = useMemo(
    () => (appId && token ? buildRowActions(appId, token, refetchAll) : []),
    [appId, token, refetchAll],
  );

  return (
    <DataAdminShell
      title="Pedidos"
      description="Gestiona los pedidos de tus clientes: confirma, marca preparados, entrégalos o cancela."
      backHref={`/apps/${appId}/edit`}
      loading={initialLoading}
      error={error}
      statsCards={stats && <OrdersStatsCards stats={stats} currency={currency} />}
    >
      <WorkflowInbox<OrderData, FilterValue>
        items={orders}
        getItemId={(o) => o.id}
        loading={refetching}
        statusOptions={STATUS_OPTIONS}
        currentStatus={statusFilter}
        onStatusChange={(s) => {
          setStatusFilter(s);
          setPage(1);
        }}
        pagination={{
          kind: 'page',
          page,
          totalPages,
          onPage: setPage,
        }}
        renderRow={(o, actions) => (
          <OrderRow order={o} currency={currency} actions={actions} />
        )}
        rowActions={rowActions}
        onActionError={(err) => {
          // Gate #1: error visible en banner del Shell.
          setError(
            err instanceof Error
              ? err.message
              : 'Error al actualizar el pedido.',
          );
        }}
      />
    </DataAdminShell>
  );
};
