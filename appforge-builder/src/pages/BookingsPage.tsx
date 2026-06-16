import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FC, ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import {
  CheckCircle, XCircle, Clock, UserX, Trash2,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import {
  getBookings,
  updateBookingStatus,
  deleteBooking,
  type BookingRecord,
} from '../lib/api';
import { DataAdminShell } from '../components/admin/DataAdminShell';
import { WorkflowInbox } from '../components/admin/WorkflowInbox';
import type { RowAction, StatusOption } from '../components/admin/types';

type Status = BookingRecord['status'];
type FilterValue = 'ALL' | Status;

// "Todas" primero (gate #3 de Fase 1).
const STATUS_OPTIONS: StatusOption<FilterValue>[] = [
  { value: 'ALL',       label: 'Todas' },
  { value: 'CONFIRMED', label: 'Confirmadas' },
  { value: 'CANCELLED', label: 'Canceladas' },
  { value: 'COMPLETED', label: 'Completadas' },
  { value: 'NO_SHOW',   label: 'No-show' },
];

const STATUS_STYLES: Record<Status, { bg: string; text: string; label: string }> = {
  CONFIRMED: { bg: 'bg-green-100',  text: 'text-green-700', label: 'Confirmada' },
  CANCELLED: { bg: 'bg-gray-100',   text: 'text-gray-600',  label: 'Cancelada'  },
  COMPLETED: { bg: 'bg-primary/10', text: 'text-primary',   label: 'Completada' },
  NO_SHOW:   { bg: 'bg-amber-100',  text: 'text-amber-700', label: 'No-show'    },
};

function formatGroupDate(isoDay: string): string {
  const d = new Date(isoDay);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayStart = new Date(d);
  dayStart.setHours(0, 0, 0, 0);
  if (dayStart.getTime() === today.getTime()) return 'Hoy';
  if (dayStart.getTime() === tomorrow.getTime()) return 'Mañana';
  return d.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: dayStart.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
}

const buildRowActions = (
  appId: string,
  token: string,
  refetch: () => Promise<void>,
): RowAction<BookingRecord>[] => [
  {
    id: 'completed',
    label: 'Marcar completada',
    icon: <CheckCircle size={16} />,
    variant: 'success',
    isAvailable: (b) => b.status === 'CONFIRMED',
    confirm: {
      title: '¿Marcar como completada?',
      description: 'La reserva quedará archivada como completada.',
      confirmLabel: 'Marcar completada',
      cancelLabel: 'Cancelar',
      variant: 'primary',
    },
    onClick: async (b) => {
      await updateBookingStatus(appId, b.id, 'COMPLETED', token);
      await refetch();
    },
  },
  {
    id: 'no_show',
    label: 'Marcar no-show',
    icon: <UserX size={16} />,
    variant: 'warning',
    isAvailable: (b) => b.status === 'CONFIRMED',
    confirm: {
      title: '¿Marcar como no-show?',
      description: 'Indica que el cliente no se presentó a esta reserva.',
      confirmLabel: 'Marcar no-show',
      cancelLabel: 'Cancelar',
      variant: 'primary',
    },
    onClick: async (b) => {
      await updateBookingStatus(appId, b.id, 'NO_SHOW', token);
      await refetch();
    },
  },
  {
    id: 'cancel',
    label: 'Cancelar reserva',
    icon: <XCircle size={16} />,
    variant: 'destructive',
    isAvailable: (b) => b.status === 'CONFIRMED',
    confirm: {
      title: '¿Cancelar esta reserva?',
      description:
        'El cliente recibirá una notificación de cancelación. Esta acción no se puede deshacer.',
      confirmLabel: 'Cancelar reserva',
      cancelLabel: 'Mantener',
      variant: 'destructive',
    },
    onClick: async (b) => {
      await updateBookingStatus(appId, b.id, 'CANCELLED', token);
      await refetch();
    },
  },
  {
    id: 'delete',
    label: 'Eliminar reserva',
    icon: <Trash2 size={16} />,
    variant: 'destructive',
    confirm: {
      title: '¿Eliminar esta reserva?',
      description:
        'La reserva se eliminará permanentemente. Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      cancelLabel: 'Mantener',
      variant: 'destructive',
    },
    onClick: async (b) => {
      await deleteBooking(appId, b.id, token);
      await refetch();
    },
  },
];

const BookingRow: FC<{
  booking: BookingRecord;
  actions: ReactNode;
}> = ({ booking, actions }) => {
  const style = STATUS_STYLES[booking.status];
  const contactBits = [booking.customerEmail, booking.customerPhone].filter(
    Boolean,
  ) as string[];
  return (
    <div className="p-4 flex items-center gap-4">
      <div className="flex items-center gap-2 w-24 shrink-0">
        <Clock size={14} className="text-gray-400" />
        <span className="text-sm font-semibold text-gray-900">{booking.timeSlot}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {booking.customerName ?? (
            <span className="text-gray-400 italic">Sin nombre</span>
          )}
        </p>
        <p className="text-xs text-gray-500 truncate">
          {contactBits.join(' · ') || '—'}
          <span className="ml-2 font-mono text-gray-400">{booking.shortCode}</span>
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className={`px-2 py-1 rounded text-xs font-medium ${style.bg} ${style.text}`}>
          {style.label}
        </span>
        {booking.status === 'CANCELLED' && booking.cancelledBy === 'CUSTOMER' && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
            por cliente
          </span>
        )}
        {booking.status === 'CANCELLED' && booking.cancelledBy === 'MERCHANT' && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
            por ti
          </span>
        )}
      </div>
      {actions}
    </div>
  );
};

export const BookingsPage: FC = () => {
  const { appId } = useParams<{ appId: string }>();
  const token = useAuthStore((s) => s.token);

  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refetching, setRefetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<FilterValue>('ALL');

  const fetchBookings = useCallback(async () => {
    if (!appId || !token) return;
    setError(null);
    try {
      const filters =
        statusFilter === 'ALL' ? undefined : { status: statusFilter };
      const data = await getBookings(appId, token, filters);
      setBookings(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudieron cargar las reservas.',
      );
    }
  }, [appId, token, statusFilter]);

  // Carga inicial: bloquea el Shell solo la primera vez (gate #2).
  useEffect(() => {
    if (!appId || !token) return;
    setInitialLoading(true);
    fetchBookings().finally(() => setInitialLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId, token]);

  // Refetch por cambio de filtro — sin bloquear el Shell. Las pills no
  // desaparecen porque el loading se pasa al Inbox como prop secundaria.
  useEffect(() => {
    if (initialLoading) return;
    setRefetching(true);
    fetchBookings().finally(() => setRefetching(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const rowActions = useMemo(
    () => (appId && token ? buildRowActions(appId, token, fetchBookings) : []),
    [appId, token, fetchBookings],
  );

  return (
    <DataAdminShell
      title="Reservas"
      description="Gestiona las reservas de tus clientes: confirma, marca como completada, no-show o elimina."
      backHref={`/apps/${appId}/edit`}
      loading={initialLoading}
      error={error}
    >
      <WorkflowInbox<BookingRecord, FilterValue>
        items={bookings}
        getItemId={(b) => b.id}
        loading={refetching}
        statusOptions={STATUS_OPTIONS}
        currentStatus={statusFilter}
        onStatusChange={setStatusFilter}
        groupBy={(b) => new Date(b.date).toISOString().slice(0, 10)}
        formatGroupLabel={formatGroupDate}
        renderRow={(b, actions) => <BookingRow booking={b} actions={actions} />}
        rowActions={rowActions}
        emptyMessage="Aún no hay reservas."
        onActionError={(err) => {
          setError(
            err instanceof Error
              ? err.message
              : 'Error al procesar la acción.',
          );
        }}
      />
    </DataAdminShell>
  );
};
