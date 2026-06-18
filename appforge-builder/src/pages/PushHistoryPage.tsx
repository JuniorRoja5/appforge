import { useEffect, useMemo, useState } from 'react';
import type { FC } from 'react';
import { useParams } from 'react-router-dom';
import { AlertCircle, Bell, Clock, Send, Smartphone } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import {
  getPushNotifications,
  getPushStats,
  type PushNotificationItem,
} from '../lib/api';
import { formatDate } from '../lib/coupon-helpers';
import { DataAdminShell } from '../components/admin/DataAdminShell';
import { WorkflowInbox } from '../components/admin/WorkflowInbox';
import { StatCardCell } from '../components/admin/StatCardCell';

interface PushStatsValue {
  deviceCount: number;
  notificationsSent: number;
  lastSentAt: string | null;
}

type StatusFilter = 'all' | 'SENT' | 'FAILED' | 'DRAFT';

// "Todos" como primer valor del filtro — el gate 3 de WorkflowInbox usa
// statusOptions[0]?.value para determinar hasActiveFilter (L123-126 de
// WorkflowInbox.tsx). El mensaje vacío del Inbox cambia entre "Aún no has
// enviado..." (sin filtro activo) y "No hay registros con este filtro"
// (con filtro distinto al primero).
const STATUS_OPTIONS = [
  { value: 'all' as const, label: 'Todos' },
  { value: 'SENT' as const, label: 'Enviadas' },
  { value: 'FAILED' as const, label: 'Fallidas' },
  { value: 'DRAFT' as const, label: 'Borrador' },
];

const STATUS_PILL: Record<
  PushNotificationItem['status'],
  { cls: string; label: string }
> = {
  SENT: { cls: 'bg-emerald-100 text-emerald-700', label: 'Enviada' },
  FAILED: { cls: 'bg-red-100 text-red-700', label: 'Fallida' },
  DRAFT: { cls: 'bg-gray-100 text-gray-600', label: 'Borrador' },
};

const PushStatsCards: FC<{ stats: PushStatsValue }> = ({ stats }) => (
  <div className="grid grid-cols-3 gap-3">
    <StatCardCell
      icon={<Smartphone size={14} />}
      label="Dispositivos"
      value={stats.deviceCount}
    />
    <StatCardCell
      icon={<Send size={14} />}
      label="Notificaciones enviadas"
      value={stats.notificationsSent}
    />
    <StatCardCell
      icon={<Clock size={14} />}
      label="Último envío"
      value={stats.lastSentAt ? formatDate(stats.lastSentAt) : '—'}
    />
  </div>
);

const NotificationRow: FC<{ item: PushNotificationItem }> = ({ item }) => {
  const pill = STATUS_PILL[item.status];
  // sentAt es null para DRAFT/FAILED-antes-de-enviar; fallback a createdAt
  // para que el orden cronológico de la fila tenga siempre una fecha visible.
  const when = item.sentAt ?? item.createdAt;
  return (
    <div className="p-4 flex items-start gap-4">
      <Bell size={16} className="text-gray-400 shrink-0 mt-1" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-medium text-gray-900 truncate">
            {item.title}
          </p>
          <span
            className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 ${pill.cls}`}
          >
            {pill.label}
          </span>
        </div>
        <p className="text-xs text-gray-500 truncate">{item.body}</p>
        {item.status === 'FAILED' && item.errorMessage && (
          <div className="mt-1.5 flex items-start gap-1 text-xs text-red-600">
            <AlertCircle size={12} className="shrink-0 mt-0.5" />
            <span className="truncate">{item.errorMessage}</span>
          </div>
        )}
      </div>
      {item.status === 'SENT' && (
        <div className="text-xs text-gray-500 shrink-0 text-right">
          <p>✓ {item.successCount}</p>
          {item.failureCount > 0 && (
            <p className="text-red-500">✗ {item.failureCount}</p>
          )}
        </div>
      )}
      <div className="text-xs text-gray-400 shrink-0 w-32 text-right">
        {formatDate(when)}
      </div>
    </div>
  );
};

export const PushHistoryPage: FC = () => {
  const { appId } = useParams<{ appId: string }>();
  const token = useAuthStore((s) => s.token);

  const [items, setItems] = useState<PushNotificationItem[]>([]);
  const [stats, setStats] = useState<PushStatsValue | undefined>(undefined);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState<StatusFilter>('all');

  useEffect(() => {
    if (!appId || !token) return;
    setInitialLoading(true);
    setError(null);

    const fetchItems = async () => {
      try {
        setItems(await getPushNotifications(appId, token));
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudo cargar el historial de notificaciones.',
        );
      }
    };

    const fetchStats = async () => {
      try {
        setStats(await getPushStats(appId, token));
      } catch (err) {
        // Stats secundarias: si fallan, las cards no se renderizan pero el
        // historial sigue visible. No silencioso: console.error deja rastro
        // (gate 1). Mismo patrón que LoyaltyAdminPage.
        // eslint-disable-next-line no-console
        console.error('[PushHistoryPage] stats fetch failed:', err);
      }
    };

    Promise.all([fetchItems(), fetchStats()]).finally(() =>
      setInitialLoading(false),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId, token]);

  // Filtro client-side: findAll trae take:50 sin filtro server, así que
  // todo el filtrado vive en cliente. En volumen actual (~4 notificaciones
  // por app) es trivial; cuando crezca, se moverá a server-side con un
  // query param ?status= en el endpoint.
  const filteredItems = useMemo(
    () =>
      currentStatus === 'all'
        ? items
        : items.filter((n) => n.status === currentStatus),
    [items, currentStatus],
  );

  if (!appId || !token) return null;

  return (
    <DataAdminShell
      title="Notificaciones"
      description="Revisa el historial de notificaciones push enviadas a los usuarios de la app."
      backHref={`/apps/${appId}/edit`}
      loading={initialLoading}
      error={error}
      statsCards={stats && <PushStatsCards stats={stats} />}
    >
      {!error && (
        <WorkflowInbox<PushNotificationItem, StatusFilter>
          items={filteredItems}
          getItemId={(n) => n.id}
          statusOptions={STATUS_OPTIONS}
          currentStatus={currentStatus}
          onStatusChange={setCurrentStatus}
          renderRow={(n) => <NotificationRow item={n} />}
          emptyMessage="Aún no has enviado ninguna notificación."
        />
      )}
    </DataAdminShell>
  );
};
