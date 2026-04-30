import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { getPublicBooking, cancelPublicBooking, type PublicBookingData } from '../lib/api';
import {
  Loader2,
  XCircle,
  CalendarDays,
  Clock,
  MapPin,
  CheckCircle,
  Ban,
} from 'lucide-react';

export const BookingTrackingPage: React.FC = () => {
  const { appId, bookingId } = useParams<{ appId: string; bookingId: string }>();
  const [searchParams] = useSearchParams();
  const trackingToken = searchParams.get('t') || '';

  const [booking, setBooking] = useState<PublicBookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const fetchBooking = useCallback(async () => {
    if (!appId || !bookingId || !trackingToken) {
      setError('Enlace incompleto');
      setLoading(false);
      return;
    }
    try {
      const data = await getPublicBooking(appId, bookingId, trackingToken);
      setBooking(data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [appId, bookingId, trackingToken]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  // Auto-refresh every 30s when tab is visible
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchBooking();
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, [fetchBooking]);

  const handleCancel = async () => {
    if (!appId || !bookingId || !trackingToken) return;
    setCancelling(true);
    setCancelError(null);
    try {
      await cancelPublicBooking(appId, bookingId, trackingToken);
      setShowCancelConfirm(false);
      await fetchBooking();
    } catch (err: unknown) {
      setCancelError(err instanceof Error ? err.message : 'Error al cancelar');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 size={32} className="animate-spin text-teal-500" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-sm">
          <XCircle size={48} className="mx-auto text-red-400 mb-3" />
          <h1 className="text-lg font-bold text-gray-800">Reserva no encontrada</h1>
          <p className="text-sm text-gray-500 mt-1">
            {error || 'El enlace puede haber caducado o ser incorrecto.'}
          </p>
        </div>
      </div>
    );
  }

  const isCancelled = booking.status === 'CANCELLED';
  const isCompleted = booking.status === 'COMPLETED';
  const isConfirmed = booking.status === 'CONFIRMED';

  // Build appointment Date object to compute time-until
  const [hh, mm] = booking.timeSlot.split(':').map((n) => parseInt(n, 10));
  const apptDate = new Date(booking.date);
  apptDate.setHours(hh ?? 0, mm ?? 0, 0, 0);
  const hoursUntilAppt = (apptDate.getTime() - Date.now()) / 3_600_000;
  const canCancelNow = isConfirmed && hoursUntilAppt > booking.cancellationDeadlineHours;

  const fechaPretty = apptDate.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-50 p-4">
      <div className="max-w-2xl mx-auto py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block px-4 py-1.5 bg-white rounded-full text-xs font-semibold text-gray-600 mb-3 shadow-sm">
            {booking.app.name}
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Reserva {booking.shortCode}</h1>
          {booking.customerName && (
            <p className="text-sm text-gray-500 mt-1">Hola {booking.customerName} 👋</p>
          )}
        </div>

        {/* Status banner */}
        {isCancelled && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4 text-center">
            <Ban size={32} className="mx-auto text-red-400 mb-2" />
            <p className="font-semibold text-red-700">Reserva cancelada</p>
            <p className="text-xs text-red-600 mt-1">
              {booking.cancelledBy === 'CUSTOMER'
                ? 'Cancelaste esta reserva.'
                : 'El negocio canceló esta reserva. Contacta para más información.'}
            </p>
          </div>
        )}

        {isCompleted && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-4 text-center">
            <CheckCircle size={32} className="mx-auto text-green-500 mb-2" />
            <p className="font-semibold text-green-700">Reserva completada</p>
          </div>
        )}

        {/* Appointment details */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
          <div className="flex items-start gap-3">
            <CalendarDays size={20} className="text-teal-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Fecha</p>
              <p className="text-base font-semibold text-gray-800 capitalize">{fechaPretty}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 mt-4">
            <Clock size={20} className="text-teal-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Hora</p>
              <p className="text-2xl font-bold text-teal-600">{booking.timeSlot}</p>
              <p className="text-xs text-gray-500 mt-0.5">Duración aproximada: {booking.duration} min</p>
            </div>
          </div>
          {booking.businessAddress && (
            <div className="flex items-start gap-3 mt-4">
              <MapPin size={20} className="text-teal-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Dirección</p>
                <p className="text-sm text-gray-800">{booking.businessAddress}</p>
              </div>
            </div>
          )}
        </div>

        {/* Cancel button */}
        {canCancelNow && (
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="w-full py-3 bg-red-50 text-red-700 font-semibold rounded-lg border border-red-200 hover:bg-red-100 transition-colors"
            >
              Cancelar mi cita
            </button>
            <p className="text-[11px] text-gray-500 text-center mt-2">
              Puedes cancelar hasta {booking.cancellationDeadlineHours}h antes de la cita.
            </p>
          </div>
        )}

        {isConfirmed && !canCancelNow && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 text-center text-sm text-amber-800">
            Las cancelaciones deben hacerse al menos {booking.cancellationDeadlineHours}h antes.
            Si necesitas cancelar, contacta directamente con el negocio.
          </div>
        )}

        <p className="text-center text-[11px] text-gray-400 mt-6">
          Esta página se actualiza automáticamente cada 30 segundos.
        </p>
      </div>

      {/* Cancel confirmation modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-2">¿Cancelar la reserva?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Vas a cancelar tu cita {booking.shortCode} del {fechaPretty} a las {booking.timeSlot}.
              Esta acción no se puede deshacer.
            </p>
            {cancelError && (
              <p className="text-xs text-red-600 mb-3">{cancelError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setShowCancelConfirm(false)}
                disabled={cancelling}
                className="flex-1 py-2.5 text-sm font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Volver
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex-1 py-2.5 text-sm font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {cancelling ? 'Cancelando...' : 'Sí, cancelar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
