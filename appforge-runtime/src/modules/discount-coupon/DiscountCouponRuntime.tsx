import React, { useEffect, useState } from 'react';
import { Share } from '@capacitor/share';
import { Gift, Copy } from 'lucide-react';
import { getCoupons } from '../../lib/api';
import { resolveAssetUrl } from '../../lib/resolve-asset-url';
import { imgFallback } from '../../lib/img-fallback';
import { registerRuntimeModule } from '../registry';

const DiscountCouponRuntime: React.FC<{ data: Record<string, unknown> }> = ({ data }) => {
  const title = (data.title as string) ?? 'Cupones';
  const layout = (data.layout as string) ?? 'cards';
  const showExpiry = (data.showExpiry as boolean) ?? true;
  const showConditions = (data.showConditions as boolean) ?? true;
  const showUsageCount = (data.showUsageCount as boolean) ?? true;
  const currency = (data.currency as string) ?? '€';

  const [coupons, setCoupons] = useState<Awaited<ReturnType<typeof getCoupons>>>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getCoupons()
      .then(setCoupons)
      .catch((err) => setError(err?.message || 'Error al cargar cupones'))
      .finally(() => setLoading(false));
  }, []);

  const copyCode = async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      await Share.share({ text: `Usa el código ${code} para obtener un descuento.` }).catch(() => {});
    }
  };

  if (loading) return <div className="animate-pulse h-40 rounded-xl" style={{ backgroundColor: 'var(--color-surface-variant)' }} />;
  if (error) return <p className="text-sm text-center py-4" style={{ color: 'var(--color-feedback-error)' }}>{error}</p>;

  const activeCoupons = coupons.filter((c) => c.isActive);
  const discountLabel = (c: typeof coupons[number]) =>
    c.discountType === 'PERCENTAGE' ? `${c.discountValue}% OFF` : `${currency}${c.discountValue} OFF`;

  // ── List layout ──
  if (layout === 'list') {
    return (
      <div>
        <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>{title}</h3>
        <div className="space-y-1">
          {activeCoupons.map((coupon) => (
            <div
              key={coupon.id}
              className="flex items-center gap-3 py-3"
              style={{ borderBottom: '1px solid var(--color-divider, #e5e7eb)' }}
            >
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--color-accent, #f59e0b)20' }}>
                <Gift size={18} style={{ color: 'var(--color-accent, #f59e0b)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{coupon.title}</h4>
                <p className="text-xs font-bold" style={{ color: 'var(--color-primary)' }}>{discountLabel(coupon)}</p>
                <div className="flex flex-wrap gap-2 mt-0.5 text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
                  {showExpiry && coupon.validUntil && <span>Hasta {new Date(coupon.validUntil).toLocaleDateString('es')}</span>}
                  {showConditions && coupon.conditions && <span>{coupon.conditions}</span>}
                  {showUsageCount && (coupon as any).usageCount != null && <span>{(coupon as any).usageCount} usos</span>}
                </div>
              </div>
              <button
                onClick={() => copyCode(coupon.code, coupon.id)}
                className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-text-on-primary)', borderRadius: 'var(--radius-button)' }}
              >
                <Copy size={12} className="inline mr-1" />
                {copiedId === coupon.id ? 'Copiado' : coupon.code}
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Cards layout (default) ──
  return (
    <div>
      <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>{title}</h3>
      <div className="space-y-3">
        {activeCoupons.map((coupon) => (
          <div
            key={coupon.id}
            className="overflow-hidden"
            style={{ borderRadius: 'var(--radius-card, 16px)', backgroundColor: 'var(--color-surface-card)', boxShadow: 'var(--shadow-sm)' }}
          >
            {coupon.imageUrl && (
              <img src={resolveAssetUrl(coupon.imageUrl)} alt={coupon.title} className="w-full h-32 object-cover" onError={imgFallback} />
            )}

            <div className="flex items-center gap-3" style={{ padding: 'var(--spacing-card, 16px)' }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--color-accent, #f59e0b)20' }}>
                <Gift size={22} style={{ color: 'var(--color-accent, #f59e0b)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{coupon.title}</h4>
                <p className="text-xs font-bold" style={{ color: 'var(--color-primary)' }}>{discountLabel(coupon)}</p>
              </div>
              <button
                onClick={() => copyCode(coupon.code, coupon.id)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-text-on-primary)', borderRadius: 'var(--radius-button)' }}
              >
                <Copy size={12} />
                {copiedId === coupon.id ? 'Copiado' : coupon.code}
              </button>
            </div>

            {coupon.description && (
              <div className="px-4 pb-2">
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{coupon.description}</p>
              </div>
            )}

            {(showExpiry || showConditions || showUsageCount) && (
              <div className="px-4 py-2 text-[10px] border-t flex flex-wrap gap-2" style={{ borderColor: 'var(--color-divider)', color: 'var(--color-text-secondary)' }}>
                {showExpiry && coupon.validUntil && <span>Válido hasta {new Date(coupon.validUntil).toLocaleDateString('es')}</span>}
                {showConditions && coupon.conditions && <span>{coupon.conditions}</span>}
                {showUsageCount && (coupon as any).usageCount != null && <span>{(coupon as any).usageCount} usos</span>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

registerRuntimeModule({ id: 'discount_coupon', Component: DiscountCouponRuntime });
