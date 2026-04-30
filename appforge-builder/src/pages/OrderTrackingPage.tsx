import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { getPublicOrder, type PublicOrderData } from '../lib/api';
import {
  Loader2,
  XCircle,
  Package,
  CheckCircle,
  Clock,
  Truck,
  Ban,
} from 'lucide-react';

const STATUS_STEPS: Array<{ key: PublicOrderData['status']; label: string; icon: React.FC<{ size?: number }> }> = [
  { key: 'PENDING', label: 'Recibido', icon: Clock },
  { key: 'CONFIRMED', label: 'Confirmado', icon: CheckCircle },
  { key: 'READY', label: 'Listo', icon: Package },
  { key: 'DELIVERED', label: 'Entregado', icon: Truck },
];

const STATUS_INDEX: Record<PublicOrderData['status'], number> = {
  PENDING: 0,
  CONFIRMED: 1,
  READY: 2,
  DELIVERED: 3,
  CANCELLED: -1,
};

export const OrderTrackingPage: React.FC = () => {
  const { appId, orderId } = useParams<{ appId: string; orderId: string }>();
  const [searchParams] = useSearchParams();
  const trackingToken = searchParams.get('t') || '';

  const [order, setOrder] = useState<PublicOrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    if (!appId || !orderId || !trackingToken) {
      setError('Enlace incompleto');
      setLoading(false);
      return;
    }
    try {
      const data = await getPublicOrder(appId, orderId, trackingToken);
      setOrder(data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [appId, orderId, trackingToken]);

  // Initial load
  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Auto-refresh cada 30s, solo si la pestaña está visible
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchOrder();
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, [fetchOrder]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 size={32} className="animate-spin text-amber-500" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-sm">
          <XCircle size={48} className="mx-auto text-red-400 mb-3" />
          <h1 className="text-lg font-bold text-gray-800">Pedido no encontrado</h1>
          <p className="text-sm text-gray-500 mt-1">
            {error || 'El enlace puede haber caducado o ser incorrecto.'}
          </p>
        </div>
      </div>
    );
  }

  const isCancelled = order.status === 'CANCELLED';
  const currentStepIdx = STATUS_INDEX[order.status];
  const items = order.items || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-4">
      <div className="max-w-2xl mx-auto py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block px-4 py-1.5 bg-white rounded-full text-xs font-semibold text-gray-600 mb-3 shadow-sm">
            {order.app.name}
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Pedido {order.shortCode}</h1>
          <p className="text-sm text-gray-500 mt-1">Hola {order.customerName} 👋</p>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
          {isCancelled ? (
            <div className="text-center py-4">
              <Ban size={40} className="mx-auto text-red-400 mb-2" />
              <p className="font-semibold text-red-600">Pedido cancelado</p>
              <p className="text-xs text-gray-500 mt-1">
                Si tienes dudas, contacta directamente con el negocio.
              </p>
            </div>
          ) : (
            <div className="flex items-start justify-between relative">
              {STATUS_STEPS.map((step, idx) => {
                const Icon = step.icon;
                const isDone = idx <= currentStepIdx;
                const isCurrent = idx === currentStepIdx;
                return (
                  <React.Fragment key={step.key}>
                    <div className="flex flex-col items-center flex-1 relative z-10">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                          isDone ? 'bg-amber-500 text-white shadow-md' : 'bg-gray-100 text-gray-400'
                        } ${isCurrent ? 'ring-4 ring-amber-200' : ''}`}
                      >
                        <Icon size={18} />
                      </div>
                      <span
                        className={`text-[11px] mt-2 font-medium ${
                          isDone ? 'text-amber-700' : 'text-gray-400'
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                    {idx < STATUS_STEPS.length - 1 && (
                      <div
                        className={`flex-1 h-0.5 mt-5 -mx-1 ${
                          idx < currentStepIdx ? 'bg-amber-500' : 'bg-gray-200'
                        }`}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          )}
          <p className="text-[11px] text-gray-400 text-center mt-6">
            Última actualización: {new Date(order.updatedAt).toLocaleString('es')}
          </p>
        </div>

        {/* Items */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="text-sm font-bold text-gray-800 mb-4">Detalle del pedido</h3>
          <div className="divide-y divide-gray-100">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">{item.name}</p>
                  <p className="text-xs text-gray-500">Cantidad: {item.quantity}</p>
                </div>
                <p className="text-sm font-semibold text-gray-700">
                  {(Number(item.price) * item.quantity).toFixed(2)}€
                </p>
              </div>
            ))}
          </div>
          <div className="border-t-2 border-gray-200 mt-4 pt-4 flex items-center justify-between">
            <span className="text-base font-semibold text-gray-800">Total</span>
            <span className="text-xl font-bold text-amber-600">
              {Number(order.total).toFixed(2)}€
            </span>
          </div>
        </div>

        <p className="text-center text-[11px] text-gray-400 mt-6">
          Esta página se actualiza automáticamente cada 30 segundos.
        </p>
      </div>
    </div>
  );
};
