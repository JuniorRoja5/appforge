import React, { useState, useEffect, useCallback } from 'react';
import type { ModuleDefinition } from '../base/module.interface';
import { z } from 'zod';
import {
  Ticket, Plus, Pencil, Trash2, Save, X,
  ChevronDown, ChevronUp,
  Clock, AlertTriangle, RefreshCw,
} from 'lucide-react';
import {
  getDiscountCoupons,
  createDiscountCoupon,
  updateDiscountCoupon,
  deleteDiscountCoupon,
  generateCouponCode,
  redeemCoupon,
  getCouponRedemptions,
  resetCouponRedemptions,
  type CouponRedemptionItem,
} from '../../lib/api';
import { useAuthStore } from '../../store/useAuthStore';
import type { DiscountCoupon } from '../../lib/api';

// ===== CONFIG =====

const DiscountCouponConfigSchema = z.object({
  layout: z.enum(['list', 'cards']),
  showExpiry: z.boolean(),
  showConditions: z.boolean(),
  showUsageCount: z.boolean(),
  currency: z.string(),
  appId: z.string().optional(),
  _refreshKey: z.number().optional(),
});

type DiscountCouponConfig = z.infer<typeof DiscountCouponConfigSchema>;

// ===== CURRENCIES =====

const CURRENCIES = [
  // Común
  { code: '€', symbol: '€', name: 'Euro', flag: '🇪🇺', group: 'Común' },
  { code: '$', symbol: '$', name: 'Dólar estadounidense', flag: '🇺🇸', group: 'Común' },
  { code: 'MXN', symbol: 'MXN', name: 'Peso mexicano', flag: '🇲🇽', group: 'Común' },
  // Europa
  { code: 'GBP', symbol: '£', name: 'Libra esterlina', flag: '🇬🇧', group: 'Europa' },
  { code: 'CHF', symbol: 'CHF', name: 'Franco suizo', flag: '🇨🇭', group: 'Europa' },
  { code: 'SEK', symbol: 'SEK', name: 'Corona sueca', flag: '🇸🇪', group: 'Europa' },
  { code: 'NOK', symbol: 'NOK', name: 'Corona noruega', flag: '🇳🇴', group: 'Europa' },
  { code: 'DKK', symbol: 'DKK', name: 'Corona danesa', flag: '🇩🇰', group: 'Europa' },
  { code: 'PLN', symbol: 'PLN', name: 'Złoty polaco', flag: '🇵🇱', group: 'Europa' },
  { code: 'CZK', symbol: 'CZK', name: 'Corona checa', flag: '🇨🇿', group: 'Europa' },
  { code: 'RON', symbol: 'RON', name: 'Leu rumano', flag: '🇷🇴', group: 'Europa' },
  { code: 'HUF', symbol: 'HUF', name: 'Forinto húngaro', flag: '🇭🇺', group: 'Europa' },
  { code: 'BGN', symbol: 'BGN', name: 'Lev búlgaro', flag: '🇧🇬', group: 'Europa' },
  { code: 'HRK', symbol: 'HRK', name: 'Kuna croata', flag: '🇭🇷', group: 'Europa' },
  // América
  { code: 'ARS', symbol: 'ARS', name: 'Peso argentino', flag: '🇦🇷', group: 'América' },
  { code: 'BRL', symbol: 'BRL', name: 'Real brasileño', flag: '🇧🇷', group: 'América' },
  { code: 'CLP', symbol: 'CLP', name: 'Peso chileno', flag: '🇨🇱', group: 'América' },
  { code: 'COP', symbol: 'COP', name: 'Peso colombiano', flag: '🇨🇴', group: 'América' },
  { code: 'PEN', symbol: 'PEN', name: 'Sol peruano', flag: '🇵🇪', group: 'América' },
  { code: 'UYU', symbol: 'UYU', name: 'Peso uruguayo', flag: '🇺🇾', group: 'América' },
  { code: 'BOB', symbol: 'BOB', name: 'Boliviano', flag: '🇧🇴', group: 'América' },
  { code: 'PYG', symbol: 'PYG', name: 'Guaraní paraguayo', flag: '🇵🇾', group: 'América' },
  { code: 'VES', symbol: 'VES', name: 'Bolívar venezolano', flag: '🇻🇪', group: 'América' },
  { code: 'CRC', symbol: 'CRC', name: 'Colón costarricense', flag: '🇨🇷', group: 'América' },
  { code: 'PAB', symbol: 'PAB', name: 'Balboa panameño', flag: '🇵🇦', group: 'América' },
  { code: 'DOP', symbol: 'DOP', name: 'Peso dominicano', flag: '🇩🇴', group: 'América' },
  { code: 'GTQ', symbol: 'GTQ', name: 'Quetzal guatemalteco', flag: '🇬🇹', group: 'América' },
  { code: 'HNL', symbol: 'HNL', name: 'Lempira hondureño', flag: '🇭🇳', group: 'América' },
  { code: 'NIO', symbol: 'NIO', name: 'Córdoba nicaragüense', flag: '🇳🇮', group: 'América' },
  { code: 'SVC', symbol: 'SVC', name: 'Colón salvadoreño', flag: '🇸🇻', group: 'América' },
] as const;

const CURRENCY_GROUPS = ['Común', 'Europa', 'América'] as const;

// ===== HELPERS =====

const getCouponStatus = (c: DiscountCoupon): 'active' | 'expired' | 'depleted' | 'inactive' => {
  if (!c.isActive) return 'inactive';
  if (c.validUntil && new Date(c.validUntil) < new Date()) return 'expired';
  if (c.maxUses && c.currentUses >= c.maxUses) return 'depleted';
  return 'active';
};

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: 'bg-emerald-50', text: 'text-emerald-600', label: 'Activo' },
  expired: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Expirado' },
  depleted: { bg: 'bg-red-50', text: 'text-red-500', label: 'Agotado' },
  inactive: { bg: 'bg-gray-100', text: 'text-gray-400', label: 'Inactivo' },
};

const formatDiscount = (c: DiscountCoupon, currency: string = '€') =>
  c.discountType === 'PERCENTAGE' ? `-${parseFloat(c.discountValue)}%` : `-${parseFloat(c.discountValue).toFixed(2)}${currency}`;

const formatDate = (d: string) => new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });

// ===== MOCK DATA =====

const MOCK_COUPONS: DiscountCoupon[] = [
  { id: '1', appId: '', title: 'Verano 2026', description: 'Descuento de bienvenida', code: 'VERANO25', discountType: 'PERCENTAGE', discountValue: '25.00', imageUrl: null, conditions: 'Compra mínima 30€', maxUses: 100, currentUses: 42, validFrom: '2026-06-01', validUntil: '2026-09-30', isActive: true, createdAt: '', updatedAt: '' },
  { id: '2', appId: '', title: 'Envío gratis', description: null, code: 'FREESHIP', discountType: 'FIXED_AMOUNT', discountValue: '5.00', imageUrl: null, conditions: null, maxUses: null, currentUses: 18, validFrom: '2026-01-01', validUntil: null, isActive: true, createdAt: '', updatedAt: '' },
  { id: '3', appId: '', title: 'Black Friday', description: 'Oferta limitada', code: 'BLACK50', discountType: 'PERCENTAGE', discountValue: '50.00', imageUrl: null, conditions: 'Solo productos seleccionados', maxUses: 50, currentUses: 50, validFrom: '2025-11-25', validUntil: '2025-11-30', isActive: false, createdAt: '', updatedAt: '' },
];

// ===== PREVIEW COMPONENT =====

const PreviewComponent: React.FC<{ data: DiscountCouponConfig; isSelected: boolean }> = ({ data, isSelected }) => {
  const [coupons, setCoupons] = useState<DiscountCoupon[]>([]);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [redeemFeedback, setRedeemFeedback] = useState<{ id: string; ok: boolean; msg: string } | null>(null);
  const hasRealData = coupons.length > 0;
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!data.appId || !token) return;
    let cancelled = false;
    (async () => {
      try {
        const result = await getDiscountCoupons(data.appId!, token);
        if (!cancelled) setCoupons(result);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [data.appId, data._refreshKey, token]);

  const handleRedeem = async (coupon: DiscountCoupon) => {
    if (!data.appId || !hasRealData) return;
    setRedeemingId(coupon.id);
    setRedeemFeedback(null);
    try {
      // Generate a simple anonymous deviceId for tracking
      let deviceId = localStorage.getItem('af_device_id');
      if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem('af_device_id', deviceId);
      }
      const result = await redeemCoupon(data.appId, coupon.id, { deviceId });
      setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, currentUses: result.currentUses } : c));
      setRedeemFeedback({ id: coupon.id, ok: true, msg: '¡Cupón canjeado!' });
    } catch (err) {
      setRedeemFeedback({ id: coupon.id, ok: false, msg: err instanceof Error ? err.message : 'Error al canjear' });
    } finally {
      setRedeemingId(null);
      setTimeout(() => setRedeemFeedback(null), 3000);
    }
  };

  const displayCoupons = hasRealData ? coupons : MOCK_COUPONS;

  const RedeemButton: React.FC<{ coupon: DiscountCoupon }> = ({ coupon }) => {
    const status = getCouponStatus(coupon);
    if (!hasRealData) return null; // No redeem for mock data
    const isRedeeming = redeemingId === coupon.id;
    const feedback = redeemFeedback?.id === coupon.id ? redeemFeedback : null;

    if (feedback) {
      return (
        <div className={`text-[9px] font-medium text-center py-1 rounded ${feedback.ok ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'}`}>
          {feedback.msg}
        </div>
      );
    }

    if (status !== 'active') return null;

    return (
      <button
        onClick={(e) => { e.stopPropagation(); handleRedeem(coupon); }}
        disabled={isRedeeming}
        className="w-full mt-1.5 py-1 text-[10px] font-semibold text-white rounded transition-all disabled:opacity-60"
        style={{ background: 'linear-gradient(to right, var(--af-color-primary, #f59e0b), var(--af-color-secondary, #f97316))' }}
      >
        {isRedeeming ? 'Canjeando...' : 'Canjear cupón'}
      </button>
    );
  };

  const renderCoupon = (coupon: DiscountCoupon) => {
    const status = getCouponStatus(coupon);
    const st = STATUS_STYLES[status];
    const isExpiredOrInactive = status === 'expired' || status === 'inactive' || status === 'depleted';

    return (
      <div
        key={coupon.id}
        className={`relative border-2 border-dashed rounded-lg overflow-hidden transition-opacity ${
          isExpiredOrInactive ? 'opacity-60 border-gray-300' : 'border-amber-300'
        }`}
      >
        {/* Discount badge */}
        <div
          className={`absolute top-0 right-0 ${isExpiredOrInactive ? 'bg-gray-400' : ''} text-white text-[11px] font-bold px-2 py-0.5 rounded-bl-lg`}
          style={!isExpiredOrInactive ? { background: 'linear-gradient(to right, var(--af-color-primary, #f59e0b), var(--af-color-secondary, #f97316))' } : undefined}
        >
          {formatDiscount(coupon, data.currency || '€')}
        </div>

        <div className="p-2.5">
          {/* Title + Status */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex-1 min-w-0">
              <h4 className="text-[11px] font-bold text-gray-800 truncate">{coupon.title}</h4>
              {coupon.description && <p className="text-[9px] text-gray-500 line-clamp-1">{coupon.description}</p>}
            </div>
            <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-medium ${st.bg} ${st.text}`}>{st.label}</span>
          </div>

          {/* Code */}
          <div className="bg-gray-50 border border-gray-200 rounded px-2 py-1 text-center mb-1.5">
            <span className="font-mono text-xs font-bold tracking-wider text-gray-800">{coupon.code}</span>
          </div>

          {/* Meta */}
          <div className="flex items-center justify-between text-[9px] text-gray-400">
            {data.showExpiry && coupon.validUntil && (
              <span className="flex items-center gap-0.5"><Clock size={9} /> Hasta {formatDate(coupon.validUntil)}</span>
            )}
            {data.showUsageCount && (
              <span>{coupon.currentUses}{coupon.maxUses ? `/${coupon.maxUses}` : ''} usos</span>
            )}
          </div>
          {data.showConditions && coupon.conditions && (
            <p className="text-[9px] text-gray-400 mt-1 italic">{coupon.conditions}</p>
          )}

          {/* Redeem button */}
          <RedeemButton coupon={coupon} />
        </div>
      </div>
    );
  };

  return (
    <div className={`transition-all ${isSelected ? 'ring-2 ring-blue-500 rounded p-1' : ''}`}>
      <div className="bg-white rounded-lg overflow-hidden">
        {/* Header */}
        <div className="px-2 py-1.5 flex items-center gap-1.5" style={{ background: 'linear-gradient(to right, var(--af-color-primary, #f59e0b), var(--af-color-secondary, #f97316))' }}>
          <Ticket size={13} className="text-white" />
          <span className="text-white text-xs font-bold">Cupones</span>
        </div>

        {displayCoupons.length === 0 ? (
          <div className="p-6 text-center">
            <Ticket size={28} className="mx-auto text-gray-300 mb-2" />
            <p className="text-xs text-gray-400">Añade cupones en el panel</p>
          </div>
        ) : data.layout === 'cards' ? (
          <div className="p-2 grid grid-cols-1 gap-2">
            {displayCoupons.map(renderCoupon)}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {displayCoupons.map(coupon => {
              const status = getCouponStatus(coupon);
              const st = STATUS_STYLES[status];
              const isOff = status !== 'active';
              return (
                <div key={coupon.id} className={`px-2 py-1.5 ${isOff ? 'opacity-60' : ''}`}>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-10 h-10 rounded flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 ${isOff ? 'bg-gray-400' : ''}`}
                      style={!isOff ? { background: 'linear-gradient(to bottom right, var(--af-color-primary, #f59e0b), var(--af-color-secondary, #f97316))' } : undefined}
                    >
                      {formatDiscount(coupon, data.currency || '€')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] font-semibold truncate">{coupon.title}</span>
                        <span className={`text-[8px] px-1 py-0.5 rounded-full ${st.bg} ${st.text}`}>{st.label}</span>
                      </div>
                      <span className="font-mono text-[10px] text-gray-600">{coupon.code}</span>
                      {data.showExpiry && coupon.validUntil && (
                        <span className="text-[9px] text-gray-400 ml-2">Hasta {formatDate(coupon.validUntil)}</span>
                      )}
                    </div>
                  </div>
                  <RedeemButton coupon={coupon} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ===== RUNTIME COMPONENT =====

const RuntimeComponent: React.FC<{ data: DiscountCouponConfig }> = ({ data: _data }) => (
  <div className="p-4">
    <h2 className="text-lg font-bold mb-2">Cupones de Descuento</h2>
    <p className="text-sm text-gray-500">Contenido renderizado en la app generada.</p>
  </div>
);

// ===== COUPON LIST ITEM (with redemption) =====

const CouponListItem: React.FC<{
  coupon: DiscountCoupon;
  data: DiscountCouponConfig;
  token: string;
  onToggleActive: (c: DiscountCoupon) => void;
  onEdit: (c: DiscountCoupon) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}> = ({ coupon, data, token, onToggleActive, onEdit, onDelete, onRefresh }) => {
  const [redemptionsOpen, setRedemptionsOpen] = useState(false);
  const [redemptions, setRedemptions] = useState<CouponRedemptionItem[]>([]);
  const [loadingRedemptions, setLoadingRedemptions] = useState(false);
  const [resetting, setResetting] = useState(false);

  const status = getCouponStatus(coupon);
  const st = STATUS_STYLES[status];

  const loadRedemptions = async () => {
    if (!data.appId) return;
    setLoadingRedemptions(true);
    try {
      const r = await getCouponRedemptions(data.appId, coupon.id, token);
      setRedemptions(r);
    } catch { /* ignore */ }
    setLoadingRedemptions(false);
  };

  const handleReset = async () => {
    if (!data.appId || !confirm('¿Resetear todos los canjes de este cupón? Se pondrá el contador a 0.')) return;
    setResetting(true);
    try {
      await resetCouponRedemptions(data.appId, coupon.id, token);
      setRedemptions([]);
      onRefresh();
    } catch { /* ignore */ }
    setResetting(false);
  };

  const toggleRedemptions = () => {
    const next = !redemptionsOpen;
    setRedemptionsOpen(next);
    if (next && redemptions.length === 0) loadRedemptions();
  };

  return (
    <div className="border rounded p-2 space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-medium ${st.bg} ${st.text}`}>{st.label}</span>
          <span className="text-[11px] font-semibold truncate">{coupon.title}</span>
        </div>
        <div className="flex gap-0.5">
          <button onClick={() => onToggleActive(coupon)} className={`text-[9px] px-1.5 py-0.5 rounded ${coupon.isActive ? 'bg-gray-100 text-gray-600' : 'bg-emerald-50 text-emerald-600'}`}>
            {coupon.isActive ? 'Desactivar' : 'Activar'}
          </button>
          <button onClick={() => onEdit(coupon)} className="text-blue-500 p-0.5"><Pencil size={10} /></button>
          <button onClick={() => onDelete(coupon.id)} className="text-red-400 p-0.5"><Trash2 size={10} /></button>
        </div>
      </div>
      <div className="flex items-center gap-2 text-[10px]">
        <span className="font-mono bg-gray-50 px-1.5 py-0.5 rounded border text-gray-700">{coupon.code}</span>
        <span className="font-bold text-amber-600">{formatDiscount(coupon, data.currency || '€')}</span>
        <span className="text-gray-400">
          Canjeado {coupon.currentUses}{coupon.maxUses ? `/${coupon.maxUses}` : ''} veces
        </span>
      </div>

      {/* Redemption section */}
      <div className="pt-1">
        <button
          onClick={toggleRedemptions}
          className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-700"
        >
          {redemptionsOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
          Historial de canjes
        </button>
        {redemptionsOpen && (
          <div className="mt-1 space-y-1">
            {loadingRedemptions ? (
              <p className="text-[10px] text-gray-400 text-center py-2">Cargando...</p>
            ) : redemptions.length === 0 ? (
              <p className="text-[10px] text-gray-400 text-center py-2">Sin canjes</p>
            ) : (
              <>
                {redemptions.slice(0, 10).map(r => (
                  <div key={r.id} className="flex items-center justify-between bg-gray-50 rounded px-2 py-1 text-[10px]">
                    <span className="text-gray-600">
                      {r.appUser ? r.appUser.email : r.deviceId ? `Anónimo (${r.deviceId.slice(0, 8)}...)` : 'Anónimo'}
                    </span>
                    <span className="text-gray-400">{formatDate(r.redeemedAt)}</span>
                  </div>
                ))}
                {redemptions.length > 10 && (
                  <p className="text-[10px] text-gray-400 text-center">...y {redemptions.length - 10} más</p>
                )}
              </>
            )}
            {coupon.currentUses > 0 && (
              <button
                onClick={handleReset}
                disabled={resetting}
                className="text-[10px] text-red-500 hover:text-red-700 flex items-center gap-1 mt-1"
              >
                <RefreshCw size={10} className={resetting ? 'animate-spin' : ''} />
                Resetear canjes
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ===== SETTINGS PANEL =====

interface CouponForm {
  title: string;
  description: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: string;
  imageUrl: string;
  conditions: string;
  maxUses: string;
  validFrom: string;
  validUntil: string;
}

const emptyCouponForm = (): CouponForm => ({
  title: '', description: '', code: '', discountType: 'PERCENTAGE', discountValue: '',
  imageUrl: '', conditions: '', maxUses: '', validFrom: '', validUntil: '',
});

const SettingsPanel: React.FC<{ data: DiscountCouponConfig; onChange: (d: DiscountCouponConfig) => void }> = ({ data, onChange }) => {
  const [coupons, setCoupons] = useState<DiscountCoupon[]>([]);
  const [loading, setLoading] = useState(false);
  const token = useAuthStore((s) => s.token) ?? '';
  const [error, setError] = useState('');
  const [showVisual, setShowVisual] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CouponForm>(emptyCouponForm());
  const [generatingCode, setGeneratingCode] = useState(false);

  const refresh = useCallback(async () => {
    if (!data.appId || !token) return;
    setLoading(true);
    try {
      setCoupons(await getDiscountCoupons(data.appId, token));
    } catch { setError('Error al cargar cupones'); }
    setLoading(false);
  }, [data.appId, token]);

  useEffect(() => { if (token) refresh(); }, [token, refresh]);

  const triggerRefresh = () => onChange({ ...data, _refreshKey: (data._refreshKey || 0) + 1 });

  const handleGenCode = async () => {
    if (!data.appId) return;
    setGeneratingCode(true);
    try {
      const { code } = await generateCouponCode(data.appId, token);
      setForm(prev => ({ ...prev, code }));
    } catch { setError('Error al generar código'); }
    setGeneratingCode(false);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.code.trim() || !form.discountValue || !data.appId) return;
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description || undefined,
        code: form.code.trim(),
        discountType: form.discountType,
        discountValue: parseFloat(form.discountValue),
        imageUrl: form.imageUrl || undefined,
        conditions: form.conditions || undefined,
        maxUses: form.maxUses ? parseInt(form.maxUses) : undefined,
        validFrom: form.validFrom || undefined,
        validUntil: form.validUntil || undefined,
      };
      if (editingId) {
        await updateDiscountCoupon(data.appId, editingId, payload, token);
      } else {
        await createDiscountCoupon(data.appId, payload as Parameters<typeof createDiscountCoupon>[1], token);
      }
      setForm(emptyCouponForm());
      setEditingId(null);
      setShowForm(false);
      await refresh();
      triggerRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar cupón');
    }
  };

  const handleDelete = async (id: string) => {
    if (!data.appId) return;
    try {
      await deleteDiscountCoupon(data.appId, id, token);
      await refresh();
      triggerRefresh();
    } catch { setError('Error al eliminar cupón'); }
  };

  const handleToggleActive = async (coupon: DiscountCoupon) => {
    if (!data.appId) return;
    try {
      await updateDiscountCoupon(data.appId, coupon.id, { isActive: !coupon.isActive }, token);
      await refresh();
      triggerRefresh();
    } catch { setError('Error al cambiar estado'); }
  };

  const startEdit = (c: DiscountCoupon) => {
    setEditingId(c.id);
    setForm({
      title: c.title,
      description: c.description || '',
      code: c.code,
      discountType: c.discountType,
      discountValue: parseFloat(c.discountValue).toString(),
      imageUrl: c.imageUrl || '',
      conditions: c.conditions || '',
      maxUses: c.maxUses?.toString() || '',
      validFrom: c.validFrom ? c.validFrom.slice(0, 10) : '',
      validUntil: c.validUntil ? c.validUntil.slice(0, 10) : '',
    });
    setShowForm(true);
  };

  return (
    <div className="space-y-3 text-xs">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-[10px] p-2 rounded flex items-center gap-1">
          <AlertTriangle size={12} /> {error}
          <button onClick={() => setError('')} className="ml-auto"><X size={10} /></button>
        </div>
      )}

      {/* Visual Config */}
      <button onClick={() => setShowVisual(!showVisual)} className="w-full flex items-center justify-between font-bold text-gray-700">
        Configuración Visual {showVisual ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {showVisual && (
        <div className="space-y-2 pl-1">
          <div>
            <label className="text-[10px] text-gray-500">Layout</label>
            <div className="flex gap-1 mt-0.5">
              {(['list', 'cards'] as const).map(l => (
                <button
                  key={l}
                  onClick={() => onChange({ ...data, layout: l })}
                  className={`text-[10px] px-2 py-1 rounded border ${data.layout === l ? 'bg-amber-100 border-amber-300' : 'border-gray-200'}`}
                >
                  {l === 'list' ? 'Lista' : 'Tarjetas'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] text-gray-500">Moneda</label>
            <select
              value={data.currency || '€'}
              onChange={e => onChange({ ...data, currency: e.target.value })}
              className="w-full text-xs border rounded px-2 py-1 mt-0.5"
            >
              {CURRENCY_GROUPS.map(group => (
                <optgroup key={group} label={group}>
                  {CURRENCIES.filter(c => c.group === group).map(c => (
                    <option key={c.code} value={c.symbol}>
                      {c.flag} {c.code} — {c.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          {([
            ['showExpiry', 'Mostrar expiración'],
            ['showConditions', 'Mostrar condiciones'],
            ['showUsageCount', 'Mostrar usos'],
          ] as const).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-[11px]">
              <input type="checkbox" checked={data[key]} onChange={e => onChange({ ...data, [key]: e.target.checked })} />
              {label}
            </label>
          ))}
        </div>
      )}

      {/* Coupon Management */}
      {data.appId ? (
        <>
          <div className="border-t pt-2 flex items-center justify-between">
            <span className="font-bold text-gray-700">Gestión de Cupones</span>
            {loading && <span className="text-[10px] text-gray-400">Cargando...</span>}
          </div>

          {/* Form */}
          {showForm ? (
            <div className="space-y-2 bg-gray-50 p-2 rounded border">
              <input
                type="text" placeholder="Título del cupón *" value={form.title}
                onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                className="w-full text-xs border rounded px-2 py-1"
              />
              <input
                type="text" placeholder="Descripción" value={form.description}
                onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                className="w-full text-xs border rounded px-2 py-1"
              />
              <div className="flex gap-1 items-end">
                <div className="flex-1">
                  <label className="text-[10px] text-gray-500">Código *</label>
                  <input
                    type="text" value={form.code}
                    onChange={e => setForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    className="w-full text-xs border rounded px-2 py-1 font-mono"
                  />
                </div>
                <button
                  onClick={handleGenCode}
                  disabled={generatingCode}
                  className="flex items-center gap-1 text-[10px] text-amber-600 hover:text-amber-700 px-2 py-1 border rounded"
                >
                  <RefreshCw size={10} className={generatingCode ? 'animate-spin' : ''} /> Generar
                </button>
              </div>
              <div className="flex gap-2">
                <div>
                  <label className="text-[10px] text-gray-500">Tipo</label>
                  <select
                    value={form.discountType}
                    onChange={e => setForm(prev => ({ ...prev, discountType: e.target.value as 'PERCENTAGE' | 'FIXED_AMOUNT' }))}
                    className="w-full text-xs border rounded px-2 py-1"
                  >
                    <option value="PERCENTAGE">Porcentaje (%)</option>
                    <option value="FIXED_AMOUNT">Monto fijo ({data.currency || '€'})</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500">Valor *</label>
                  <input
                    type="number" step="0.01" min="0" value={form.discountValue}
                    onChange={e => setForm(prev => ({ ...prev, discountValue: e.target.value }))}
                    className="w-20 text-xs border rounded px-2 py-1"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500">Máx. usos</label>
                  <input
                    type="number" min="0" value={form.maxUses} placeholder="∞"
                    onChange={e => setForm(prev => ({ ...prev, maxUses: e.target.value }))}
                    className="w-16 text-xs border rounded px-2 py-1"
                  />
                </div>
              </div>
              <input
                type="text" placeholder="Condiciones (opcional)" value={form.conditions}
                onChange={e => setForm(prev => ({ ...prev, conditions: e.target.value }))}
                className="w-full text-xs border rounded px-2 py-1"
              />
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] text-gray-500">Válido desde</label>
                  <input type="date" value={form.validFrom} onChange={e => setForm(prev => ({ ...prev, validFrom: e.target.value }))} className="w-full text-xs border rounded px-2 py-1" />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-gray-500">Válido hasta</label>
                  <input type="date" value={form.validUntil} onChange={e => setForm(prev => ({ ...prev, validUntil: e.target.value }))} className="w-full text-xs border rounded px-2 py-1" />
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={handleSave}
                  disabled={!form.title.trim() || !form.code.trim() || !form.discountValue}
                  className="flex items-center gap-1 bg-emerald-600 text-white text-[10px] px-2 py-1 rounded hover:bg-emerald-700 disabled:opacity-50"
                >
                  <Save size={10} /> {editingId ? 'Guardar' : 'Crear cupón'}
                </button>
                <button
                  onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyCouponForm()); }}
                  className="flex items-center gap-1 text-gray-500 text-[10px] px-2 py-1 rounded hover:bg-gray-100"
                >
                  <X size={10} /> Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyCouponForm()); }}
              className="flex items-center gap-1 bg-amber-600 text-white text-[10px] px-2 py-1 rounded hover:bg-amber-700 w-full justify-center"
            >
              <Plus size={10} /> Nuevo cupón
            </button>
          )}

          {/* Coupon list */}
          {coupons.map(coupon => (
            <CouponListItem
              key={coupon.id}
              coupon={coupon}
              data={data}
              token={token}
              onToggleActive={handleToggleActive}
              onEdit={startEdit}
              onDelete={handleDelete}
              onRefresh={() => { refresh(); triggerRefresh(); }}
            />
          ))}
        </>
      ) : (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 text-[10px] p-2 rounded">
          Guarda la app primero para gestionar cupones.
        </div>
      )}
    </div>
  );
};

// ===== MODULE EXPORT =====

export const DiscountCouponModule: ModuleDefinition<DiscountCouponConfig> = {
  id: 'discount_coupon',
  name: 'Cupones',
  description: 'Cupones de descuento con código, tipo y expiración',
  icon: <Ticket size={20} />,
  schema: DiscountCouponConfigSchema,
  defaultConfig: {
    layout: 'cards',
    showExpiry: true,
    showConditions: true,
    showUsageCount: true,
    currency: '€',
  },
  PreviewComponent,
  RuntimeComponent,
  SettingsPanel,
};
