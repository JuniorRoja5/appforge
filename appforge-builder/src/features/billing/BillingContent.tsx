import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import {
  getSubscription,
  cancelStripeSubscription,
  createPortalSession,
  getInvoices,
  type SubscriptionInfo,
  type Invoice,
} from '../../lib/api';

// ─── Helpers ─────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount);
}

const STATUS_LABEL: Record<string, { text: string; className: string }> = {
  paid: { text: 'Pagada', className: 'bg-green-50 text-green-700 border-green-100' },
  open: { text: 'Pendiente', className: 'bg-amber-50 text-amber-700 border-amber-100' },
  void: { text: 'Anulada', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  uncollectible: { text: 'No cobrada', className: 'bg-red-50 text-red-700 border-red-100' },
  draft: { text: 'Borrador', className: 'bg-gray-100 text-gray-600 border-gray-200' },
};

const InvoiceStatusBadge: React.FC<{ status: string | null }> = ({ status }) => {
  const entry = (status && STATUS_LABEL[status]) || { text: status ?? '—', className: 'bg-gray-100 text-gray-600 border-gray-200' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${entry.className}`}>
      {entry.text}
    </span>
  );
};

// ─── Componente compartido ───────────────────────────────────────────

export const BillingContent: React.FC = () => {
  const token = useAuthStore((s) => s.token);

  const [sub, setSub] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [billingMsg, setBillingMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [createdAfter, setCreatedAfter] = useState<string>('');
  const [createdBefore, setCreatedBefore] = useState<string>('');

  // Carga inicial de subscription
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    getSubscription(token)
      .then((data) => { if (!cancelled) setSub(data); })
      .catch(() => { if (!cancelled) setSub(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  /**
   * Cursor recibido por argumento (no leído del closure), para que la
   * referencia de fetchInvoices NO se recree al actualizarse `nextCursor`
   * tras la primera carga. Si fuese del closure y estuviese en las deps
   * del useCallback, el useEffect de filtros (más abajo) capturaría una
   * versión stale tras cada paginación — bug latente que solo se
   * manifestaría al combinar filtro + "Cargar más" en la misma sesión.
   *
   * - `fetchInvoices()` / `fetchInvoices(undefined)` → primera página
   *   (reemplaza la lista).
   * - `fetchInvoices(cursor)` → página siguiente (concatena, con
   *   `starting_after=cursor`).
   */
  const fetchInvoices = useCallback(async (cursor?: string) => {
    if (!token) return;
    const append = !!cursor;
    setLoadingInvoices(true);
    try {
      const page = await getInvoices(token, {
        limit: 25,
        startingAfter: cursor,
        createdAfter: createdAfter || undefined,
        createdBefore: createdBefore || undefined,
      });
      setInvoices((prev) => append ? [...prev, ...page.invoices] : page.invoices);
      setHasMore(page.hasMore);
      setNextCursor(page.nextCursor);
    } catch {
      // Silent — Stripe puede no estar configurado en este entorno.
    } finally {
      setLoadingInvoices(false);
    }
  }, [token, createdAfter, createdBefore]);

  // Recargar facturas al cambiar filtros de fecha (o al montar con sub activa).
  // TODO (cuando haya facturas reales): añadir debounce o botón "Aplicar"
  // para no disparar fetch en cada tecleo si el usuario escribe a mano.
  useEffect(() => {
    if (!token || !sub?.subscription.stripeSubscriptionId) return;
    fetchInvoices();
  }, [token, sub?.subscription.stripeSubscriptionId, createdAfter, createdBefore, fetchInvoices]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Cliente sin subscription (FREE puro, sin Stripe) — empty state con CTA
  if (!sub) {
    return (
      <div className="bg-white rounded-[24px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Plan</h2>
        <p className="text-sm font-medium text-gray-500">Actualmente no estás suscrito a ningún plan de pago.</p>
        <Link
          to="/pricing"
          className="inline-flex items-center px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm shadow-indigo-200"
        >
          Explorar planes
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Plan + uso */}
      <div className="bg-white rounded-[24px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 space-y-6">
        <h2 className="text-lg font-bold text-gray-900">Tu plan</h2>

        <div className="flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center px-4 py-1.5 bg-indigo-50 text-indigo-700 text-sm font-bold rounded-lg border border-indigo-100">
            {sub.subscription.plan.name}
          </span>
          {sub.subscription.plan.priceMonthly > 0 && (
            <span className="text-sm font-semibold text-gray-600 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-lg">
              ${sub.subscription.plan.priceMonthly}/mes
            </span>
          )}
          {sub.subscription.cancelAtPeriodEnd && sub.subscription.stripeCurrentPeriodEnd && (
            <span className="text-xs text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded-full">
              Se cancela el {new Date(sub.subscription.stripeCurrentPeriodEnd).toLocaleDateString('es-ES')}
            </span>
          )}
        </div>

        {/* Usage bars */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 py-4">
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Aplicaciones</p>
            <p className="text-xl font-extrabold text-gray-900">
              {sub.usage.appsCount} <span className="text-sm font-medium text-gray-400">/ {sub.subscription.plan.maxApps}</span>
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Entregas / mes</p>
            <p className="text-xl font-extrabold text-gray-900">
              {sub.usage.buildsThisMonth} <span className="text-sm font-medium text-gray-400">/ {sub.subscription.plan.maxBuildsPerMonth}</span>
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Almacenamiento</p>
            <p className="text-xl font-extrabold text-gray-900">
              {(sub.usage.storageBytes / 1024 / 1024).toFixed(1)} <span className="text-sm font-medium text-gray-400">MB / {sub.subscription.plan.storageGb} GB</span>
            </p>
          </div>
        </div>

        {billingMsg && (
          <div className={`text-sm px-3 py-2 rounded-lg ${billingMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
            {billingMsg.text}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Link
            to="/pricing"
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm shadow-indigo-200"
          >
            {sub.subscription.plan.planType === 'FREE' ? 'Ver todos los planes' : 'Cambiar de plan'}
          </Link>

          {sub.subscription.stripeSubscriptionId && (
            <>
              <button
                onClick={async () => {
                  try {
                    const { url } = await createPortalSession(token!);
                    window.location.href = url;
                  } catch {
                    setBillingMsg({ type: 'error', text: 'No pudimos abrir el portal de Stripe. Inténtalo de nuevo.' });
                  }
                }}
                className="px-5 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 text-sm font-semibold rounded-xl transition-all"
              >
                Gestionar pagos (Stripe)
              </button>

              {!sub.subscription.cancelAtPeriodEnd && (
                <button
                  onClick={async () => {
                    if (!confirm('¿Seguro que quieres cancelar tu suscripción? Tu plan permanecerá activo hasta el final del período actual.')) return;
                    setCancelling(true);
                    setBillingMsg(null);
                    try {
                      await cancelStripeSubscription(token!);
                      setSub((prev) => prev ? {
                        ...prev,
                        subscription: { ...prev.subscription, cancelAtPeriodEnd: true },
                      } : prev);
                      setBillingMsg({ type: 'success', text: 'Suscripción cancelada. Tu plan permanecerá activo hasta el final del período.' });
                    } catch (err) {
                      setBillingMsg({ type: 'error', text: err instanceof Error ? err.message : 'Error al cancelar.' });
                    } finally {
                      setCancelling(false);
                    }
                  }}
                  disabled={cancelling}
                  className="px-5 py-2.5 text-red-600 hover:bg-red-50 hover:text-red-700 text-sm font-semibold rounded-xl transition-all disabled:opacity-50 ml-auto"
                >
                  {cancelling ? 'Procesando...' : 'Cancelar suscripción'}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Tabla de facturas — solo si hay subscription activa */}
      {sub.subscription.stripeSubscriptionId && (
        <div className="bg-white rounded-[24px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Tus facturas</h2>

          {/* Filtros de fecha */}
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Desde</label>
              <input
                type="date"
                value={createdAfter}
                onChange={(e) => setCreatedAfter(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Hasta</label>
              <input
                type="date"
                value={createdBefore}
                onChange={(e) => setCreatedBefore(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
            {(createdAfter || createdBefore) && (
              <button
                onClick={() => { setCreatedAfter(''); setCreatedBefore(''); }}
                className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
              >
                Quitar filtros
              </button>
            )}
          </div>

          {invoices.length === 0 && !loadingInvoices ? (
            <p className="text-sm text-gray-500">
              {(createdAfter || createdBefore)
                ? 'No hay facturas en ese rango de fechas.'
                : 'Aún no tienes facturas emitidas. Cuando se genere tu próxima factura aparecerá aquí.'}
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs font-medium text-gray-500 uppercase border-b border-gray-100">
                      <th className="text-left py-2">Fecha</th>
                      <th className="text-left py-2">Número</th>
                      <th className="text-right py-2">Importe</th>
                      <th className="text-left py-2 pl-3">Estado</th>
                      <th className="text-right py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="border-b border-gray-50 last:border-0">
                        <td className="py-3 text-gray-700">{formatDate(inv.created)}</td>
                        <td className="py-3 text-gray-500 font-mono text-xs">{inv.number ?? '—'}</td>
                        <td className="py-3 text-right text-gray-900 font-medium">{formatAmount(inv.amountPaid, inv.currency)}</td>
                        <td className="py-3 pl-3"><InvoiceStatusBadge status={inv.status} /></td>
                        <td className="py-3 text-right">
                          {inv.invoicePdf ? (
                            <a
                              href={inv.invoicePdf}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                            >
                              <Download size={14} /> Descargar
                            </a>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {hasMore && (
                <div className="flex justify-center pt-4">
                  <button
                    onClick={() => fetchInvoices(nextCursor ?? undefined)}
                    disabled={loadingInvoices}
                    className="px-4 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50"
                  >
                    {loadingInvoices ? 'Cargando...' : 'Cargar más'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
