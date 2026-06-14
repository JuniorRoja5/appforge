import type { DiscountCoupon } from './api';

export type CouponStatus = 'active' | 'expired' | 'depleted' | 'inactive';

export const getCouponStatus = (c: DiscountCoupon): CouponStatus => {
  if (!c.isActive) return 'inactive';
  if (c.validUntil && new Date(c.validUntil) < new Date()) return 'expired';
  if (c.maxUses && c.currentUses >= c.maxUses) return 'depleted';
  return 'active';
};

export const STATUS_STYLES: Record<CouponStatus, { bg: string; text: string; label: string }> = {
  active: { bg: 'bg-emerald-50', text: 'text-emerald-600', label: 'Activo' },
  expired: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Expirado' },
  depleted: { bg: 'bg-red-50', text: 'text-red-500', label: 'Agotado' },
  inactive: { bg: 'bg-gray-100', text: 'text-gray-400', label: 'Inactivo' },
};

export const formatDiscount = (c: DiscountCoupon, currency: string = '€') =>
  c.discountType === 'PERCENTAGE' ? `-${parseFloat(c.discountValue)}%` : `-${parseFloat(c.discountValue).toFixed(2)}${currency}`;

export const formatDate = (d: string) => new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
