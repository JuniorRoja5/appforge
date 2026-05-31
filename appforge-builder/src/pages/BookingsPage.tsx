import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Calendar, CheckCircle, XCircle, Clock, UserX, Trash2, Loader2,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import {
  getBookings,
  updateBookingStatus,
  deleteBooking,
  type BookingRecord,
} from '../lib/api';

type Status = BookingRecord['status'];
type FilterValue = 'ALL' | Status;

const STATUS_OPTIONS: Array<{ value: FilterValue; label: string }> = [
  { value: 'ALL', label: 'Todas' },
  { value: 'CONFIRMED', label: 'Confirmadas' },
  { value: 'CANCELLED', label: 'Canceladas' },
  { value: 'COMPLETED', label: 'Completadas' },
  { value: 'NO_SHOW', label: 'No-show' },
];

const STATUS_STYLES: Record<Status, { bg: string; text: string; label: string }> = {
  CONFIRMED: { bg: 'bg-green-100', text: 'text-green-700', label: 'Confirmada' },
  CANCELLED: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Cancelada' },
  COMPLETED: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Completada' },
  NO_SHOW: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'No-show' },
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

export const BookingsPage: React.FC = () => {
  const { appId } = useParams<{ appId: string }>();
  const token = useAuthStore((s) => s.token);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterValue>('ALL');

  const loadBookings = async () => {
    if (!appId || !token) return;
    setLoading(true);
    setError('');
    try {
      const filters = statusFilter === 'ALL' ? undefined : { status: statusFilter };
      const data = await getBookings(appId, token, filters);
      setBookings(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudieron cargar las reservas.';
      setError(message);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId, token, statusFilter]);

  const handleStatusChange = async (booking: BookingRecord, newStatus: Status) => {
    if (!appId || !token) return;
    const confirmMsg =
      newStatus === 'CANCELLED'
        ? `¿Cancelar la reserva ${booking.shortCode}?`
        : newStatus === 'COMPLETED'
        ? `¿Marcar la reserva ${booking.shortCode} como completada?`
        : `¿Marcar la reserva ${booking.shortCode} como no-show?`;
    if (!window.confirm(confirmMsg)) return;
    try {
      await updateBookingStatus(appId, booking.id, newStatus, token);
      loadBookings();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al actualizar la reserva.';
      window.alert(message);
    }
  };

  const handleDelete = async (booking: BookingRecord) => {
    if (!appId || !token) return;
    if (!window.confirm(`¿Eliminar la reserva ${booking.shortCode}? Esta acción no se puede deshacer.`)) return;
    try {
      await deleteBooking(appId, booking.id, token);
      loadBookings();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al eliminar la reserva.';
      window.alert(message);
    }
  };

  // Group bookings by day (YYYY-MM-DD). Backend already sorts asc but we
  // re-sort defensively in case the API ever changes its order.
  const grouped = useMemo(() => {
    const map = new Map<string, BookingRecord[]>();
    for (const b of bookings) {
      const dayKey = new Date(b.date).toISOString().slice(0, 10);
      const arr = map.get(dayKey) ?? [];
      arr.push(b);
      map.set(dayKey, arr);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, list]) => ({
        day,
        list: list.sort((a, b) => a.timeSlot.localeCompare(b.timeSlot)),
      }));
  }, [bookings]);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reservas</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gestiona las reservas de tus clientes: confirma, marca como completada, no-show o elimina.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              statusFilter === opt.value
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-gray-400" size={32} />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {error}
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <Calendar className="mx-auto text-gray-300 mb-3" size={40} />
          <p className="text-sm text-gray-500">
            {statusFilter === 'ALL'
              ? 'Aún no hay reservas.'
              : `No hay reservas con este estado.`}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ day, list }) => (
            <div key={day}>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 capitalize">
                {formatGroupDate(day)}
              </h3>
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100">
                {list.map((b) => {
                  const style = STATUS_STYLES[b.status];
                  const canChangeStatus = b.status === 'CONFIRMED';
                  const contactBits = [b.customerEmail, b.customerPhone].filter(Boolean) as string[];
                  return (
                    <div key={b.id} className="p-4 flex items-center gap-4 hover:bg-gray-50">
                      <div className="flex items-center gap-2 w-24 shrink-0">
                        <Clock size={14} className="text-gray-400" />
                        <span className="text-sm font-semibold text-gray-900">{b.timeSlot}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {b.customerName ?? <span className="text-gray-400 italic">Sin nombre</span>}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {contactBits.join(' · ') || '—'}
                          <span className="ml-2 font-mono text-gray-400">{b.shortCode}</span>
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${style.bg} ${style.text}`}>
                        {style.label}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {canChangeStatus && (
                          <>
                            <button
                              onClick={() => handleStatusChange(b, 'COMPLETED')}
                              title="Marcar completada"
                              className="p-1.5 rounded hover:bg-green-100 text-gray-500 hover:text-green-600 transition-colors"
                            >
                              <CheckCircle size={16} />
                            </button>
                            <button
                              onClick={() => handleStatusChange(b, 'NO_SHOW')}
                              title="Marcar no-show"
                              className="p-1.5 rounded hover:bg-amber-100 text-gray-500 hover:text-amber-600 transition-colors"
                            >
                              <UserX size={16} />
                            </button>
                            <button
                              onClick={() => handleStatusChange(b, 'CANCELLED')}
                              title="Cancelar"
                              className="p-1.5 rounded hover:bg-red-100 text-gray-500 hover:text-red-600 transition-colors"
                            >
                              <XCircle size={16} />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDelete(b)}
                          title="Eliminar"
                          className="p-1.5 rounded hover:bg-red-100 text-gray-500 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
