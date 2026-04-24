import React from 'react';

type Variant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const variantStyles: Record<Variant, string> = {
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  warning: 'bg-yellow-50 text-yellow-800 ring-yellow-600/20',
  danger: 'bg-red-50 text-red-700 ring-red-600/10',
  info: 'bg-blue-50 text-blue-700 ring-blue-700/10',
  neutral: 'bg-gray-50 text-gray-600 ring-gray-500/10',
};

interface Props {
  label: string;
  variant: Variant;
}

export const StatusBadge: React.FC<Props> = ({ label, variant }) => {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${variantStyles[variant]}`}
    >
      {label}
    </span>
  );
};

// Helpers for common status mappings
export function tenantStatusVariant(status: string): Variant {
  switch (status) {
    case 'ACTIVE': return 'success';
    case 'SUSPENDED': return 'danger';
    default: return 'neutral';
  }
}

export function userStatusVariant(status: string): Variant {
  switch (status) {
    case 'ACTIVE': return 'success';
    case 'SUSPENDED': return 'warning';
    case 'PENDING_DELETION': return 'danger';
    default: return 'neutral';
  }
}

export function buildStatusVariant(status: string): Variant {
  switch (status) {
    case 'COMPLETED': return 'success';
    case 'FAILED': return 'danger';
    case 'QUEUED': return 'neutral';
    case 'BUILDING':
    case 'PREPARING':
    case 'SIGNING': return 'info';
    default: return 'neutral';
  }
}

export function invoiceStatusVariant(status: string | null): Variant {
  switch (status) {
    case 'paid': return 'success';
    case 'open': return 'warning';
    case 'uncollectible': return 'danger';
    case 'void': return 'neutral';
    case 'draft': return 'neutral';
    default: return 'neutral';
  }
}

export function invoiceStatusLabel(status: string | null): string {
  switch (status) {
    case 'paid': return 'Pagada';
    case 'open': return 'Pendiente';
    case 'uncollectible': return 'Incobrable';
    case 'void': return 'Anulada';
    case 'draft': return 'Borrador';
    default: return status ?? 'Desconocido';
  }
}
