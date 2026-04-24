import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { getBillingAnalytics } from '../lib/api';
import type { BillingData, StripeInvoice } from '../lib/api';
import { KpiCard } from '../components/KpiCard';
import { StatusBadge, invoiceStatusVariant, invoiceStatusLabel } from '../components/StatusBadge';
import { DollarSign, Users, AlertTriangle, ExternalLink } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts';

function formatCurrency(amount: number, currency = 'usd'): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function InvoiceTable({
  invoices,
  title,
  emptyMessage,
  navigate,
}: {
  invoices: StripeInvoice[];
  title: string;
  emptyMessage: string;
  navigate: ReturnType<typeof useNavigate>;
}) {
  return (
    <div className="bg-white rounded-[24px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
      <div className="px-8 py-6 border-b border-gray-100">
        <h2 className="text-[15px] font-bold text-gray-900">{title}</h2>
      </div>
      {invoices.length === 0 ? (
        <p className="px-5 py-8 text-center text-gray-400 text-sm">{emptyMessage}</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/50 text-xs text-gray-500 uppercase tracking-wider">
              <th className="px-4 py-2 text-left">Factura</th>
              <th className="px-4 py-2 text-left">Cliente</th>
              <th className="px-4 py-2 text-right">Monto</th>
              <th className="px-4 py-2 text-left">Estado</th>
              <th className="px-4 py-2 text-left">Fecha</th>
              <th className="px-4 py-2 text-right">Enlace</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="px-4 py-2.5 font-medium text-gray-900">
                  {inv.number ?? '—'}
                </td>
                <td className="px-4 py-2.5 text-gray-500">
                  {inv.tenantId ? (
                    <button
                      onClick={() => navigate(`/tenants/${inv.tenantId}`)}
                      className="hover:text-orange-600 hover:underline"
                    >
                      {inv.tenantName ?? '—'}
                    </button>
                  ) : (
                    <span className="text-gray-400">Sin tenant</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right font-medium text-gray-900">
                  {formatCurrency(inv.amountDue, inv.currency)}
                </td>
                <td className="px-4 py-2.5">
                  <StatusBadge
                    label={invoiceStatusLabel(inv.status)}
                    variant={invoiceStatusVariant(inv.status)}
                  />
                </td>
                <td className="px-4 py-2.5 text-gray-400">
                  {formatDate(inv.created)}
                </td>
                <td className="px-4 py-2.5 text-right">
                  {inv.hostedInvoiceUrl && (
                    <a
                      href={inv.hostedInvoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1 text-xs font-medium text-orange-600 hover:text-orange-700"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Ver en Stripe</span>
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export const BillingPage: React.FC = () => {
  const token = useAuthStore((s) => s.token)!;
  const navigate = useNavigate();
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBillingAnalytics(token)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-gray-500">Error al cargar datos de facturación.</p>;
  }

  const activeSubscriptions = Object.values(data.mrr.byPlan).reduce(
    (sum, p) => sum + p.count,
    0,
  );

  const mrrChartData = data.mrrHistory.map((h) => ({
    ...h,
    label: formatMonth(h.month),
  }));

  const planChartData = Object.entries(data.mrr.byPlan).map(([plan, info]) => ({
    plan,
    revenue: info.revenue,
    count: info.count,
  }));

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Facturación</h1>
        <p className="text-[15px] font-medium text-gray-500 mt-2">
          Ingresos recurrentes, facturas y alertas de pago
        </p>
      </div>

      {/* Failed payments alert banner */}
      {data.failedPayments.length > 0 && (
        <div className="flex items-center gap-3 px-6 py-4 bg-red-50 border border-red-200 rounded-2xl">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <p className="text-sm font-semibold text-red-800">
            {data.failedPayments.length} pago{data.failedPayments.length !== 1 ? 's' : ''} fallido{data.failedPayments.length !== 1 ? 's' : ''} requiere{data.failedPayments.length !== 1 ? 'n' : ''} atención
          </p>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          label="MRR"
          value={formatCurrency(data.mrr.total)}
          icon={<DollarSign className="w-5 h-5" />}
        />
        <KpiCard
          label="Suscripciones activas"
          value={activeSubscriptions}
          icon={<Users className="w-5 h-5" />}
        />
        <KpiCard
          label="Pagos fallidos"
          value={data.failedPayments.length}
          icon={<AlertTriangle className="w-5 h-5" />}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* MRR History */}
        <div className="bg-white rounded-[24px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8">
          <h2 className="text-[15px] font-bold text-gray-900 mb-6">MRR mensual</h2>
          {mrrChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={mrrChartData}>
                <defs>
                  <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Area
                  type="monotone"
                  dataKey="mrr"
                  stroke="#f97316"
                  fillOpacity={1}
                  fill="url(#mrrGrad)"
                  name="MRR"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-gray-400 text-sm py-12">Sin datos de MRR aún</p>
          )}
        </div>

        {/* Revenue by plan */}
        <div className="bg-white rounded-[24px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8">
          <h2 className="text-[15px] font-bold text-gray-900 mb-6">Ingresos por plan</h2>
          {planChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={planChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis
                  type="category"
                  dataKey="plan"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  width={130}
                />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="revenue" fill="#f97316" radius={[0, 4, 4, 0]} name="Ingresos" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-gray-400 text-sm py-12">Sin suscripciones de pago</p>
          )}
        </div>
      </div>

      {/* Failed Payments Table */}
      {data.failedPayments.length > 0 && (
        <InvoiceTable
          invoices={data.failedPayments}
          title="Pagos fallidos"
          emptyMessage=""
          navigate={navigate}
        />
      )}

      {/* Recent Invoices Table */}
      <InvoiceTable
        invoices={data.recentInvoices}
        title="Facturas recientes"
        emptyMessage="No hay facturas de Stripe aún."
        navigate={navigate}
      />
    </div>
  );
};
