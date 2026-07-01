import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import type { ModuleDefinition } from '../base/module.interface';
import {
  Ticket,
  ChevronDown, ChevronUp,
  Clock,
  Lock, Link as LinkIcon, Loader2,
} from 'lucide-react';
import {
  getDiscountCoupons,
  redeemCoupon,
  getCouponMerchantConfigStatus,
  setupCouponMerchantConfig,
} from '../../lib/api';
import { useAuthStore } from '../../store/useAuthStore';
import type { DiscountCoupon } from '../../lib/api';
import {
  getCouponStatus,
  STATUS_STYLES,
  formatDiscount,
  formatDate,
} from '../../lib/coupon-helpers';
// Phase 3b (B3) — schema imported from the shared package.
import {
  DiscountCouponConfigSchema,
  type DiscountCouponConfig,
} from '../../lib/shared/module-schemas/discount_coupon.schema';

export type { DiscountCouponConfig };

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

// ===== SETTINGS PANEL =====

const SettingsPanel: React.FC<{ data: DiscountCouponConfig; onChange: (d: DiscountCouponConfig) => void }> = ({ data, onChange }) => {
  const token = useAuthStore((s) => s.token) ?? '';

  // === Merchant Config state ===
  const [merchantOpen, setMerchantOpen] = useState(true);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [savingPin, setSavingPin] = useState(false);
  const [pinMsg, setPinMsg] = useState('');
  const [merchantConfigured, setMerchantConfigured] = useState(false);

  // === Display options state ===
  const [displayOpen, setDisplayOpen] = useState(false);

  const refreshMerchantStatus = useCallback(async () => {
    if (!data.appId || !token) return;
    try {
      const status = await getCouponMerchantConfigStatus(data.appId, token);
      setMerchantConfigured(status.configured);
    } catch { /* ignore */ }
  }, [data.appId, token]);

  useEffect(() => { if (token) refreshMerchantStatus(); }, [token, refreshMerchantStatus]);

  // === PIN Save handler ===
  const handleSavePin = async () => {
    if (!data.appId || !token) {
      alert('Guarda la app primero para configurar el PIN.');
      return;
    }
    if (pin.length < 6) {
      setPinMsg('El PIN debe tener al menos 6 caracteres');
      setTimeout(() => setPinMsg(''), 3000);
      return;
    }
    if (pin !== confirmPin) {
      setPinMsg('Los PIN no coinciden');
      setTimeout(() => setPinMsg(''), 3000);
      return;
    }
    setSavingPin(true);
    setPinMsg('');
    try {
      await setupCouponMerchantConfig(data.appId, pin, token);
      setMerchantConfigured(true);
      setPin('');
      setConfirmPin('');
      setPinMsg('PIN guardado correctamente');
    } catch (err) {
      setPinMsg(err instanceof Error ? err.message : 'Error al guardar el PIN');
    } finally {
      setSavingPin(false);
      setTimeout(() => setPinMsg(''), 3000);
    }
  };

  const redeemPageUrl = data.appId ? `${window.location.origin}/redeem/${data.appId}` : '';

  return (
    <div className="space-y-3 text-[11px]">
      {/* ============================================ */}
      {/* SECCIÓN 1: Configuración del negocio (PIN)    */}
      {/* ============================================ */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setMerchantOpen(!merchantOpen)}
          className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
            <Lock size={12} className="text-amber-600" />
            Configuración del negocio
            {merchantConfigured && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                Configurado
              </span>
            )}
          </span>
          {merchantOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {merchantOpen && (
          <div className="p-3 space-y-2">
            <p className="text-[10px] text-gray-500 leading-relaxed">
              Configura un PIN para que tú o tu personal puedan validar cupones físicamente en el negocio
              desde la página de canje.
            </p>
            <div>
              <label className="block text-[10px] font-semibold text-gray-600 mb-1">
                {merchantConfigured ? 'Cambiar PIN (mín. 6 caracteres)' : 'PIN nuevo (mín. 6 caracteres)'}
              </label>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder={merchantConfigured ? '••••••' : 'Mínimo 6 caracteres'}
                className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-600 mb-1">
                Confirmar PIN
              </label>
              <input
                type="password"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="Repite el PIN"
                className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
            <button
              onClick={handleSavePin}
              disabled={savingPin || !pin || !confirmPin}
              className="w-full py-1.5 bg-amber-600 text-white text-xs font-medium rounded hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
            >
              {savingPin && <Loader2 size={11} className="animate-spin" />}
              {merchantConfigured ? 'Actualizar PIN' : 'Guardar PIN'}
            </button>
            {pinMsg && (
              <p className={`text-[10px] text-center ${pinMsg.includes('Error') || pinMsg.includes('coinciden') || pinMsg.includes('caracteres') ? 'text-red-500' : 'text-green-600'}`}>
                {pinMsg}
              </p>
            )}

            {/* Redeem page link */}
            {merchantConfigured && redeemPageUrl && (
              <div className="bg-amber-50 border border-amber-100 rounded p-2 mt-2">
                <div className="flex items-center gap-1 mb-1">
                  <LinkIcon size={10} className="text-amber-600" />
                  <span className="text-[10px] font-semibold text-amber-700">Página de canje</span>
                </div>
                <p className="text-[9px] text-amber-700 break-all font-mono">{redeemPageUrl}</p>
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => navigator.clipboard.writeText(redeemPageUrl)}
                    className="text-[9px] text-amber-600 hover:text-amber-800 font-medium"
                  >
                    Copiar enlace
                  </button>
                  <a
                    href={redeemPageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[9px] text-amber-600 hover:text-amber-800 font-medium"
                  >
                    Abrir página ↗
                  </a>
                </div>
                <p className="text-[9px] text-amber-600 mt-1.5 italic">
                  Abre esta URL en la tablet/móvil del negocio para validar cupones.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ============================================ */}
      {/* SECCIÓN 2: Opciones de visualización         */}
      {/* ============================================ */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setDisplayOpen(!displayOpen)}
          className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <span className="text-xs font-semibold text-gray-700">Opciones de visualización</span>
          {displayOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {displayOpen && (
          <div className="p-3 space-y-2">
            <div>
              <label className="text-[10px] text-gray-500">Layout</label>
              <div className="flex gap-1 mt-0.5">
                {(['list', 'cards'] as const).map(l => (
                  <button
                    key={l}
                    onClick={() => onChange({ ...data, layout: l })}
                    className={`flex-1 text-[10px] py-1 rounded border ${data.layout === l ? 'bg-amber-100 border-amber-300' : 'border-gray-200'}`}
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
      </div>

      {/* Administrar cupones — página dedicada */}
      {data.appId && (
        <Link
          to={`/apps/${data.appId}/coupons`}
          className="flex items-center justify-between gap-2 w-full bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors rounded-lg px-3 py-2.5 text-sm"
        >
          <span className="flex items-center gap-2 text-primary font-medium">
            <Ticket size={16} />
            Administrar cupones
          </span>
        </Link>
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
