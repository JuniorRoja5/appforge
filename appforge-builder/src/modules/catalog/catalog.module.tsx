import React, { useState, useEffect, useCallback } from 'react';
import type { ModuleDefinition } from '../base/module.interface';
import { z } from 'zod';
import {
  ShoppingBag, Plus, Pencil, Trash2, Save, X,
  ChevronDown, ChevronUp,
  ArrowUp, ArrowDown, ArrowLeft, ShoppingCart,
  Tag, AlertTriangle, ChevronLeft, ChevronRight,
} from 'lucide-react';
import {
  uploadFile,
  getCatalogCollections,
  getAppSmtpConfig,
  createCatalogCollection,
  updateCatalogCollection,
  deleteCatalogCollection,
  reorderCatalogCollections,
  createCatalogProduct,
  updateCatalogProduct,
  deleteCatalogProduct,
  reorderCatalogProducts,
  getOrders,
  updateOrderStatus,
  getOrderStats,
  createOrder,
  type OrderData,
} from '../../lib/api';
import { useAuthStore } from '../../store/useAuthStore';
import { resolveAssetUrl } from '../../lib/resolve-asset-url';
import type { CatalogCollection, CatalogProduct } from '../../lib/api';
import { Loader2, Package, Clock as ClockIcon, CheckCircle, XCircle, Truck } from 'lucide-react';

// ===== CONFIG =====

const CatalogConfigSchema = z.object({
  layout: z.enum(['grid', 'list']),
  columns: z.number().min(1).max(3),
  showPrices: z.boolean(),
  showComparePrice: z.boolean(),
  showTags: z.boolean(),
  enableCart: z.boolean(),
  currency: z.string(),
  appId: z.string().optional(),
  _refreshKey: z.number().optional(),
});

type CatalogConfig = z.infer<typeof CatalogConfigSchema>;

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

const MOCK_COLLECTIONS: CatalogCollection[] = [
  {
    id: '1', appId: '', name: 'Camisetas', description: null, imageUrl: null, order: 0, createdAt: '', updatedAt: '',
    products: [
      { id: 'p1', collectionId: '1', name: 'Camiseta Classic', description: 'Algodón 100%, corte regular', price: '24.99', comparePrice: '34.99', imageUrls: [], inStock: true, tags: ['Nuevo'], order: 0, createdAt: '', updatedAt: '' },
      { id: 'p2', collectionId: '1', name: 'Camiseta Sport', description: 'Tejido técnico transpirable', price: '29.99', comparePrice: null, imageUrls: [], inStock: true, tags: ['Oferta'], order: 1, createdAt: '', updatedAt: '' },
      { id: 'p3', collectionId: '1', name: 'Camiseta Premium', description: 'Edición limitada', price: '39.99', comparePrice: null, imageUrls: [], inStock: false, tags: [], order: 2, createdAt: '', updatedAt: '' },
    ],
  },
  {
    id: '2', appId: '', name: 'Accesorios', description: null, imageUrl: null, order: 1, createdAt: '', updatedAt: '',
    products: [
      { id: 'p4', collectionId: '2', name: 'Gorra Logo', description: null, price: '14.99', comparePrice: null, imageUrls: [], inStock: true, tags: [], order: 0, createdAt: '', updatedAt: '' },
      { id: 'p5', collectionId: '2', name: 'Mochila Urban', description: 'Resistente al agua, 20L', price: '49.99', comparePrice: '59.99', imageUrls: [], inStock: true, tags: ['Nuevo'], order: 1, createdAt: '', updatedAt: '' },
    ],
  },
];

// ===== TAG COLORS =====

const TAG_COLORS: Record<string, string> = {
  Nuevo: 'bg-emerald-100 text-emerald-700',
  Oferta: 'bg-red-100 text-red-700',
  Popular: 'bg-blue-100 text-blue-700',
  Limitado: 'bg-purple-100 text-purple-700',
};

// ===== CART TYPES =====

interface CartItem {
  product: CatalogProduct;
  quantity: number;
}

// ===== PREVIEW COMPONENT =====

const PreviewComponent: React.FC<{ data: CatalogConfig; isSelected: boolean }> = ({ data, isSelected }) => {
  const [collections, setCollections] = useState<CatalogCollection[]>([]);
  const [activeColId, setActiveColId] = useState<string>('');
  const [viewingProduct, setViewingProduct] = useState<CatalogProduct | null>(null);
  const [imageIdx, setImageIdx] = useState(0);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartView, setCartView] = useState<'shopping' | 'cart' | 'checkout' | 'confirmation'>('shopping');
  const [checkoutForm, setCheckoutForm] = useState({ name: '', phone: '', notes: '' });
  const [confirmedOrder, setConfirmedOrder] = useState<{ id: string; total: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const hasRealData = collections.length > 0;
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!data.appId || !token) return;
    let cancelled = false;
    (async () => {
      try {
        const cols = await getCatalogCollections(data.appId!, token);
        if (!cancelled) {
          setCollections(cols);
          if (cols.length > 0 && !activeColId) setActiveColId(cols[0].id);
        }
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [data.appId, data._refreshKey, token]);

  const displayCols = hasRealData ? collections : MOCK_COLLECTIONS;
  const currency = data.currency || '€';

  useEffect(() => {
    if (displayCols.length > 0 && !displayCols.find(c => c.id === activeColId)) {
      setActiveColId(displayCols[0].id);
    }
  }, [displayCols, activeColId]);

  const activeCol = displayCols.find(c => c.id === activeColId);
  const products = activeCol?.products || [];

  // ---- Cart Helpers ----
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + parseFloat(item.product.price) * item.quantity, 0);

  const addToCart = (product: CatalogProduct) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.product.id !== productId) return i;
      const newQty = i.quantity + delta;
      return newQty > 0 ? { ...i, quantity: newQty } : i;
    }).filter(i => i.quantity > 0));
  };

  const handleCheckout = async () => {
    if (!checkoutForm.name.trim() || !data.appId || cart.length === 0) return;
    setSubmitting(true);
    try {
      const order = await createOrder(data.appId, {
        customerName: checkoutForm.name.trim(),
        customerPhone: checkoutForm.phone || undefined,
        customerNotes: checkoutForm.notes || undefined,
        items: cart.map(i => ({ productId: i.product.id, quantity: i.quantity })),
      });
      setConfirmedOrder({ id: order.id, total: String(order.total) });
      setCart([]);
      setCartView('confirmation');
      setCheckoutForm({ name: '', phone: '', notes: '' });
    } catch { /* ignore */ }
    setSubmitting(false);
  };

  // ---- Cart View ----
  if (cartView === 'cart') {
    return (
      <div className={`transition-all ${isSelected ? 'ring-2 ring-blue-500 rounded p-1' : ''}`}>
        <div className="bg-white rounded-lg overflow-hidden">
          <div className="px-2 py-1.5 flex items-center gap-2" style={{ background: 'linear-gradient(to right, var(--af-color-primary, #6366f1), var(--af-color-secondary, #a855f7))' }}>
            <button onClick={(e) => { e.stopPropagation(); setCartView('shopping'); }} className="text-white hover:bg-white/20 rounded p-0.5">
              <ArrowLeft size={14} />
            </button>
            <ShoppingCart size={13} className="text-white" />
            <span className="text-white text-xs font-bold flex-1">Carrito ({cartCount})</span>
          </div>
          {cart.length === 0 ? (
            <div className="p-6 text-center">
              <ShoppingCart size={28} className="mx-auto text-gray-300 mb-2" />
              <p className="text-xs text-gray-400">El carrito esta vacio</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto">
                {cart.map(item => (
                  <div key={item.product.id} className="flex items-center gap-2 px-2 py-1.5">
                    {item.product.imageUrls[0] ? (
                      <img src={resolveAssetUrl(item.product.imageUrls[0])} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded bg-gray-50 flex items-center justify-center flex-shrink-0">
                        <ShoppingBag size={12} className="text-gray-200" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-medium truncate">{item.product.name}</p>
                      <p className="text-[10px] font-bold" style={{ color: 'var(--af-color-primary, #6366f1)' }}>
                        {(parseFloat(item.product.price) * item.quantity).toFixed(2)}{currency}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={(e) => { e.stopPropagation(); updateCartQuantity(item.product.id, -1); }}
                        className="w-5 h-5 rounded bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-600 hover:bg-gray-200">-</button>
                      <span className="text-[10px] font-medium w-4 text-center">{item.quantity}</span>
                      <button onClick={(e) => { e.stopPropagation(); updateCartQuantity(item.product.id, 1); }}
                        className="w-5 h-5 rounded bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-600 hover:bg-gray-200">+</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t p-2 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-semibold">Total</span>
                  <span className="text-sm font-bold" style={{ color: 'var(--af-color-primary, #6366f1)' }}>{cartTotal.toFixed(2)}{currency}</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setCartView('checkout'); }}
                  className="w-full text-white text-xs py-1.5 rounded font-medium"
                  style={{ backgroundColor: 'var(--af-color-primary, #6366f1)' }}
                >
                  Realizar pedido
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ---- Checkout View ----
  if (cartView === 'checkout') {
    return (
      <div className={`transition-all ${isSelected ? 'ring-2 ring-blue-500 rounded p-1' : ''}`}>
        <div className="bg-white rounded-lg overflow-hidden">
          <div className="px-2 py-1.5 flex items-center gap-2" style={{ background: 'linear-gradient(to right, var(--af-color-primary, #6366f1), var(--af-color-secondary, #a855f7))' }}>
            <button onClick={(e) => { e.stopPropagation(); setCartView('cart'); }} className="text-white hover:bg-white/20 rounded p-0.5">
              <ArrowLeft size={14} />
            </button>
            <span className="text-white text-xs font-bold flex-1">Finalizar pedido</span>
          </div>
          <div className="p-3 space-y-2">
            <div>
              <label className="text-[10px] text-gray-500 font-medium">Nombre *</label>
              <input type="text" value={checkoutForm.name}
                onChange={e => setCheckoutForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Tu nombre"
                className="w-full text-xs border rounded px-2 py-1.5 mt-0.5" />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 font-medium">Telefono</label>
              <input type="tel" value={checkoutForm.phone}
                onChange={e => setCheckoutForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="(Opcional)"
                className="w-full text-xs border rounded px-2 py-1.5 mt-0.5" />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 font-medium">Notas</label>
              <textarea value={checkoutForm.notes} rows={2}
                onChange={e => setCheckoutForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Instrucciones especiales..."
                className="w-full text-xs border rounded px-2 py-1.5 mt-0.5" />
            </div>
            <div className="border-t pt-2 flex justify-between items-center">
              <span className="text-[11px] font-semibold">Total: <span className="font-bold" style={{ color: 'var(--af-color-primary, #6366f1)' }}>{cartTotal.toFixed(2)}{currency}</span></span>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); handleCheckout(); }}
              disabled={!checkoutForm.name.trim() || submitting}
              className="w-full text-white text-xs py-2 rounded font-medium disabled:opacity-50 flex items-center justify-center gap-1"
              style={{ backgroundColor: 'var(--af-color-primary, #6366f1)' }}
            >
              {submitting ? <><Loader2 size={12} className="animate-spin" /> Enviando...</> : 'Confirmar pedido'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Confirmation View ----
  if (cartView === 'confirmation') {
    return (
      <div className={`transition-all ${isSelected ? 'ring-2 ring-blue-500 rounded p-1' : ''}`}>
        <div className="bg-white rounded-lg overflow-hidden">
          <div className="px-2 py-1.5" style={{ background: 'linear-gradient(to right, var(--af-color-primary, #6366f1), var(--af-color-secondary, #a855f7))' }}>
            <span className="text-white text-xs font-bold">Pedido confirmado</span>
          </div>
          <div className="p-4 text-center space-y-2">
            <CheckCircle size={32} className="mx-auto text-green-500" />
            <h3 className="text-sm font-bold text-gray-800">Pedido recibido!</h3>
            {confirmedOrder && (
              <>
                <p className="text-[10px] text-gray-500">N. {confirmedOrder.id.slice(0, 8).toUpperCase()}</p>
                <p className="text-sm font-bold" style={{ color: 'var(--af-color-primary, #6366f1)' }}>
                  {parseFloat(confirmedOrder.total).toFixed(2)}{currency}
                </p>
              </>
            )}
            <p className="text-[10px] text-gray-400">Te contactaremos pronto</p>
            <button
              onClick={(e) => { e.stopPropagation(); setCartView('shopping'); setConfirmedOrder(null); }}
              className="text-xs text-white px-4 py-1.5 rounded"
              style={{ backgroundColor: 'var(--af-color-primary, #6366f1)' }}
            >
              Volver al catalogo
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Product Detail View ----
  if (viewingProduct) {
    const p = viewingProduct;
    const hasImages = p.imageUrls.length > 0;
    return (
      <div className={`transition-all ${isSelected ? 'ring-2 ring-blue-500 rounded p-1' : ''}`}>
        <div className="bg-white rounded-lg overflow-hidden">
          <div className="px-2 py-1.5 flex items-center gap-2" style={{ background: 'linear-gradient(to right, var(--af-color-primary, #6366f1), var(--af-color-secondary, #a855f7))' }}>
            <button onClick={(e) => { e.stopPropagation(); setViewingProduct(null); setImageIdx(0); }} className="text-white hover:bg-white/20 rounded p-0.5">
              <ArrowLeft size={14} />
            </button>
            <span className="text-white text-xs font-bold truncate flex-1">{p.name}</span>
          </div>

          {hasImages ? (
            <div className="relative">
              <img src={resolveAssetUrl(p.imageUrls[imageIdx])} alt="" className="w-full aspect-square object-cover" />
              {p.imageUrls.length > 1 && (
                <>
                  {imageIdx > 0 && (
                    <button onClick={(e) => { e.stopPropagation(); setImageIdx(i => i - 1); }} className="absolute left-1 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-0.5">
                      <ChevronLeft size={14} />
                    </button>
                  )}
                  {imageIdx < p.imageUrls.length - 1 && (
                    <button onClick={(e) => { e.stopPropagation(); setImageIdx(i => i + 1); }} className="absolute right-1 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-0.5">
                      <ChevronRight size={14} />
                    </button>
                  )}
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
                    {p.imageUrls.map((_, i) => (
                      <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === imageIdx ? 'bg-white' : 'bg-white/50'}`} />
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="w-full aspect-video bg-gray-100 flex items-center justify-center">
              <ShoppingBag size={32} className="text-gray-300" />
            </div>
          )}

          <div className="p-3 space-y-2">
            <div className="flex items-center gap-2">
              {data.showTags && p.tags.map(tag => (
                <span key={tag} className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${TAG_COLORS[tag] || 'bg-gray-100 text-gray-600'}`}>{tag}</span>
              ))}
            </div>
            <h3 className="text-sm font-bold">{p.name}</h3>
            {data.showPrices && (
              <div className="flex items-center gap-2">
                <span className="text-base font-bold" style={{ color: 'var(--af-color-primary, #6366f1)' }}>{parseFloat(p.price).toFixed(2)}{currency}</span>
                {data.showComparePrice && p.comparePrice && (
                  <span className="text-xs text-gray-400 line-through">{parseFloat(p.comparePrice).toFixed(2)}{currency}</span>
                )}
              </div>
            )}
            {p.description && <p className="text-[11px] text-gray-600">{p.description}</p>}
            {!p.inStock && <span className="text-[10px] text-red-500 font-medium">Agotado</span>}
            {data.enableCart && p.inStock && (
              <button
                onClick={(e) => { e.stopPropagation(); addToCart(p); }}
                className="w-full text-white text-xs py-1.5 flex items-center justify-center gap-1"
                style={{ backgroundColor: 'var(--af-color-primary, #6366f1)', borderRadius: 'var(--af-radius-button, 8px)' }}
              >
                <ShoppingCart size={13} /> Añadir al carrito
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---- Listing View ----
  return (
    <div className={`transition-all ${isSelected ? 'ring-2 ring-blue-500 rounded p-1' : ''}`}>
      <div className="bg-white rounded-lg overflow-hidden">
        {/* Header */}
        <div className="px-2 py-1.5 flex items-center gap-1.5" style={{ background: 'linear-gradient(to right, var(--af-color-primary, #6366f1), var(--af-color-secondary, #a855f7))' }}>
          <ShoppingBag size={13} className="text-white" />
          <span className="text-white text-xs font-bold flex-1">Catálogo</span>
          {data.enableCart && cartCount > 0 && (
            <button onClick={(e) => { e.stopPropagation(); setCartView('cart'); }} className="relative">
              <ShoppingCart size={14} className="text-white" />
              <span className="absolute -top-1 -right-1.5 bg-red-500 text-white text-[8px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold">{cartCount}</span>
            </button>
          )}
        </div>

        {displayCols.length === 0 ? (
          <div className="p-6 text-center">
            <ShoppingBag size={28} className="mx-auto text-gray-300 mb-2" />
            <p className="text-xs text-gray-400">Añade colecciones en el panel</p>
          </div>
        ) : (
          <>
            {/* Collection tabs */}
            <div className="flex border-b border-gray-200 overflow-x-auto">
              {displayCols.map(col => (
                <button
                  key={col.id}
                  onClick={(e) => { e.stopPropagation(); setActiveColId(col.id); }}
                  className={`px-2 py-1 text-[10px] font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeColId === col.id ? '' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                  style={activeColId === col.id ? { borderColor: 'var(--af-color-primary, #6366f1)', color: 'var(--af-color-primary, #6366f1)' } : undefined}
                >
                  {col.name}
                </button>
              ))}
            </div>

            {/* Products */}
            {data.layout === 'grid' ? (
              <div className={`p-2 grid gap-2`} style={{ gridTemplateColumns: `repeat(${data.columns}, 1fr)` }}>
                {products.map(p => (
                  <div
                    key={p.id}
                    onClick={(e) => { e.stopPropagation(); setViewingProduct(p); setImageIdx(0); }}
                    className={`cursor-pointer rounded overflow-hidden border border-gray-100 hover:shadow-sm transition-shadow ${!p.inStock ? 'opacity-60' : ''}`}
                  >
                    {p.imageUrls[0] ? (
                      <img src={resolveAssetUrl(p.imageUrls[0])} alt="" className="w-full aspect-square object-cover" />
                    ) : (
                      <div className="w-full aspect-square bg-gray-50 flex items-center justify-center">
                        <ShoppingBag size={20} className="text-gray-200" />
                      </div>
                    )}
                    <div className="p-1.5">
                      {data.showTags && p.tags.length > 0 && (
                        <div className="flex gap-0.5 mb-0.5">
                          {p.tags.map(tag => (
                            <span key={tag} className={`text-[8px] px-1 py-0.5 rounded-full ${TAG_COLORS[tag] || 'bg-gray-100 text-gray-600'}`}>{tag}</span>
                          ))}
                        </div>
                      )}
                      <p className="text-[10px] font-medium text-gray-800 line-clamp-1">{p.name}</p>
                      {data.showPrices && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[10px] font-bold" style={{ color: 'var(--af-color-primary, #6366f1)' }}>{parseFloat(p.price).toFixed(2)}{currency}</span>
                          {data.showComparePrice && p.comparePrice && (
                            <span className="text-[8px] text-gray-400 line-through">{parseFloat(p.comparePrice).toFixed(2)}{currency}</span>
                          )}
                        </div>
                      )}
                      {!p.inStock && <span className="text-[8px] text-red-500">Agotado</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {products.map(p => (
                  <div
                    key={p.id}
                    onClick={(e) => { e.stopPropagation(); setViewingProduct(p); setImageIdx(0); }}
                    className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-gray-50 ${!p.inStock ? 'opacity-60' : ''}`}
                  >
                    {p.imageUrls[0] ? (
                      <img src={resolveAssetUrl(p.imageUrls[0])} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-gray-50 flex items-center justify-center flex-shrink-0">
                        <ShoppingBag size={16} className="text-gray-200" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] font-medium truncate">{p.name}</span>
                        {data.showTags && p.tags.map(tag => (
                          <span key={tag} className={`text-[8px] px-1 py-0.5 rounded-full ${TAG_COLORS[tag] || 'bg-gray-100 text-gray-600'}`}>{tag}</span>
                        ))}
                      </div>
                      {p.description && <p className="text-[9px] text-gray-500 line-clamp-1">{p.description}</p>}
                    </div>
                    {data.showPrices && (
                      <div className="text-right flex-shrink-0">
                        <span className="text-[11px] font-bold text-indigo-600">{parseFloat(p.price).toFixed(2)}{currency}</span>
                        {data.showComparePrice && p.comparePrice && (
                          <div className="text-[8px] text-gray-400 line-through">{parseFloat(p.comparePrice).toFixed(2)}{currency}</div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ===== RUNTIME COMPONENT =====

const RuntimeComponent: React.FC<{ data: CatalogConfig }> = ({ data: _data }) => (
  <div className="p-4">
    <h2 className="text-lg font-bold mb-2">Catálogo</h2>
    <p className="text-sm text-gray-500">Contenido renderizado en la app generada.</p>
  </div>
);

// ===== ORDER STATUS =====

const STATUS_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-700', icon: <ClockIcon size={12} /> },
  CONFIRMED: { label: 'Confirmado', color: 'bg-blue-100 text-blue-700', icon: <CheckCircle size={12} /> },
  READY: { label: 'Preparado', color: 'bg-green-100 text-green-700', icon: <Package size={12} /> },
  DELIVERED: { label: 'Entregado', color: 'bg-gray-100 text-gray-600', icon: <Truck size={12} /> },
  CANCELLED: { label: 'Cancelado', color: 'bg-red-100 text-red-700', icon: <XCircle size={12} /> },
};

const STATUS_TRANSITIONS: Record<string, { status: string; label: string; color: string }[]> = {
  PENDING: [
    { status: 'CONFIRMED', label: 'Confirmar', color: 'bg-blue-600 hover:bg-blue-700' },
    { status: 'CANCELLED', label: 'Cancelar', color: 'bg-red-600 hover:bg-red-700' },
  ],
  CONFIRMED: [
    { status: 'READY', label: 'Preparado', color: 'bg-green-600 hover:bg-green-700' },
    { status: 'CANCELLED', label: 'Cancelar', color: 'bg-red-600 hover:bg-red-700' },
  ],
  READY: [
    { status: 'DELIVERED', label: 'Entregado', color: 'bg-gray-600 hover:bg-gray-700' },
  ],
};

// ===== ORDERS TAB =====

const OrdersTab: React.FC<{ appId: string; currency: string }> = ({ appId, currency }) => {
  const token = useAuthStore((s) => s.token) ?? '';
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [stats, setStats] = useState<{ pendingCount: number; todayCount: number; totalRevenue: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await getOrders(appId, token, { status: statusFilter || undefined, page });
      setOrders(res.data);
      setTotal(res.total);
    } catch { /* ignore */ }
    setLoading(false);
  }, [appId, token, statusFilter, page]);

  const fetchStats = useCallback(async () => {
    if (!token) return;
    try { setStats(await getOrderStats(appId, token)); } catch { /* ignore */ }
  }, [appId, token]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      await updateOrderStatus(appId, orderId, newStatus, token);
      await Promise.all([fetchOrders(), fetchStats()]);
    } catch { /* ignore */ }
    setUpdatingId(null);
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-3">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-center">
            <div className="text-lg font-bold text-yellow-700">{stats.pendingCount}</div>
            <div className="text-[9px] text-yellow-600">Pendientes</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded p-2 text-center">
            <div className="text-lg font-bold text-blue-700">{stats.todayCount}</div>
            <div className="text-[9px] text-blue-600">Hoy</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded p-2 text-center">
            <div className="text-lg font-bold text-green-700">{stats.totalRevenue.toFixed(2)}</div>
            <div className="text-[9px] text-green-600">Ingresos</div>
          </div>
        </div>
      )}

      {/* Status filter */}
      <div className="flex gap-1 flex-wrap">
        <button
          onClick={() => { setStatusFilter(''); setPage(1); }}
          className={`text-[10px] px-2 py-0.5 rounded-full border ${!statusFilter ? 'bg-indigo-100 border-indigo-300' : 'border-gray-200'}`}
        >Todos</button>
        {Object.entries(STATUS_LABELS).map(([key, { label }]) => (
          <button key={key}
            onClick={() => { setStatusFilter(key); setPage(1); }}
            className={`text-[10px] px-2 py-0.5 rounded-full border ${statusFilter === key ? 'bg-indigo-100 border-indigo-300' : 'border-gray-200'}`}
          >{label}</button>
        ))}
      </div>

      {/* Orders list */}
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 size={16} className="animate-spin text-gray-400" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-6 text-gray-400 text-[11px]">
          <Package size={24} className="mx-auto mb-2 text-gray-300" />
          No hay pedidos {statusFilter ? 'con este estado' : 'todavia'}
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map(order => {
            const statusInfo = STATUS_LABELS[order.status] || STATUS_LABELS.PENDING;
            const items = order.items as Array<{ name: string; quantity: number; price: number }>;
            const transitions = STATUS_TRANSITIONS[order.status] || [];
            return (
              <div key={order.id} className="border rounded p-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold">{order.customerName}</span>
                    {order.customerPhone && <span className="text-[9px] text-gray-400 ml-1">{order.customerPhone}</span>}
                  </div>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${statusInfo.color}`}>
                    {statusInfo.icon} {statusInfo.label}
                  </span>
                </div>
                <div className="text-[10px] text-gray-500">
                  {items.map((item, i) => (
                    <span key={i}>{i > 0 ? ', ' : ''}{item.quantity}x {item.name}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold" style={{ color: 'var(--af-color-primary, #6366f1)' }}>
                    {parseFloat(String(order.total)).toFixed(2)}{currency}
                  </span>
                  <span className="text-[9px] text-gray-400">{new Date(order.createdAt).toLocaleString('es')}</span>
                </div>
                {order.customerNotes && (
                  <div className="text-[9px] text-gray-500 bg-gray-50 rounded p-1">Nota: {order.customerNotes}</div>
                )}
                {transitions.length > 0 && (
                  <div className="flex gap-1 pt-0.5">
                    {transitions.map(t => (
                      <button key={t.status}
                        onClick={() => handleStatusChange(order.id, t.status)}
                        disabled={updatingId === order.id}
                        className={`text-[9px] text-white px-2 py-0.5 rounded ${t.color} disabled:opacity-50`}
                      >
                        {updatingId === order.id ? <Loader2 size={10} className="animate-spin" /> : t.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
            className="text-[10px] text-gray-500 disabled:opacity-30"><ChevronLeft size={14} /></button>
          <span className="text-[10px] text-gray-500">{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
            className="text-[10px] text-gray-500 disabled:opacity-30"><ChevronRight size={14} /></button>
        </div>
      )}
    </div>
  );
};

// ===== SETTINGS PANEL =====

interface ProductForm {
  name: string;
  description: string;
  price: string;
  comparePrice: string;
  imageUrls: string[];
  inStock: boolean;
  tags: string[];
  newTag: string;
}

const emptyProductForm = (): ProductForm => ({
  name: '', description: '', price: '', comparePrice: '', imageUrls: [], inStock: true, tags: [], newTag: '',
});

const SettingsPanel: React.FC<{ data: CatalogConfig; onChange: (d: CatalogConfig) => void }> = ({ data, onChange }) => {
  const [cols, setCols] = useState<CatalogCollection[]>([]);
  const [loading, setLoading] = useState(false);
  const token = useAuthStore((s) => s.token) ?? '';
  const [error, setError] = useState('');
  const [showVisual, setShowVisual] = useState(true);
  const [settingsTab, setSettingsTab] = useState<'products' | 'orders'>('products');
  const [pendingCount, setPendingCount] = useState(0);
  const [smtpConfigured, setSmtpConfigured] = useState<boolean | null>(null);

  // Collection editing
  const [editingColId, setEditingColId] = useState<string | null>(null);
  const [colName, setColName] = useState('');
  const [newColName, setNewColName] = useState('');
  const [expandedColId, setExpandedColId] = useState<string | null>(null);

  // Product editing
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState<ProductForm>(emptyProductForm());
  const [addingProductToCol, setAddingProductToCol] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const refresh = useCallback(async () => {
    if (!data.appId || !token) return;
    setLoading(true);
    try { setCols(await getCatalogCollections(data.appId, token)); } catch { setError('Error al cargar catálogo'); }
    setLoading(false);
  }, [data.appId, token]);

  useEffect(() => { if (token) refresh(); }, [token, refresh]);

  // Fetch pending orders count for tab badge
  useEffect(() => {
    if (!data.appId || !token) return;
    getOrderStats(data.appId, token).then(s => setPendingCount(s.pendingCount)).catch(() => {});
  }, [data.appId, token]);

  // Check SMTP config to show warning banner
  useEffect(() => {
    if (!data.appId || !token) return;
    getAppSmtpConfig(data.appId, token)
      .then((r) => setSmtpConfigured(r.configured))
      .catch(() => setSmtpConfigured(false));
  }, [data.appId, token]);

  const triggerRefresh = () => onChange({ ...data, _refreshKey: (data._refreshKey || 0) + 1 });

  // ---- Collection CRUD ----
  const handleAddCol = async () => {
    if (!newColName.trim() || !data.appId) return;
    try { await createCatalogCollection(data.appId, { name: newColName.trim() }, token); setNewColName(''); await refresh(); triggerRefresh(); } catch { setError('Error al crear colección'); }
  };

  const handleUpdateCol = async (colId: string) => {
    if (!colName.trim() || !data.appId) return;
    try { await updateCatalogCollection(data.appId, colId, { name: colName.trim() }, token); setEditingColId(null); await refresh(); triggerRefresh(); } catch { setError('Error al actualizar'); }
  };

  const handleDeleteCol = async (colId: string) => {
    if (!data.appId) return;
    try { await deleteCatalogCollection(data.appId, colId, token); await refresh(); triggerRefresh(); } catch { setError('Error al eliminar'); }
  };

  const handleMoveCol = async (index: number, dir: -1 | 1) => {
    if (!data.appId) return;
    const newCols = [...cols];
    const [moved] = newCols.splice(index, 1);
    newCols.splice(index + dir, 0, moved);
    try { await reorderCatalogCollections(data.appId, newCols.map((c, i) => ({ id: c.id, order: i })), token); await refresh(); triggerRefresh(); } catch { setError('Error al reordenar'); }
  };

  // ---- Product CRUD ----
  const handleAddProduct = async (colId: string) => {
    if (!productForm.name.trim() || !productForm.price || !data.appId) return;
    if (productForm.comparePrice && parseFloat(productForm.comparePrice) <= parseFloat(productForm.price)) {
      alert('El precio anterior debe ser mayor al precio actual');
      return;
    }
    try {
      await createCatalogProduct(data.appId, colId, {
        name: productForm.name.trim(),
        description: productForm.description || undefined,
        price: parseFloat(productForm.price),
        comparePrice: productForm.comparePrice ? parseFloat(productForm.comparePrice) : undefined,
        imageUrls: productForm.imageUrls,
        inStock: productForm.inStock,
        tags: productForm.tags,
      }, token);
      setProductForm(emptyProductForm()); setAddingProductToCol(null);
      await refresh(); triggerRefresh();
    } catch { setError('Error al crear producto'); }
  };

  const handleUpdateProduct = async (colId: string, productId: string) => {
    if (!data.appId) return;
    if (productForm.comparePrice && productForm.price && parseFloat(productForm.comparePrice) <= parseFloat(productForm.price)) {
      alert('El precio anterior debe ser mayor al precio actual');
      return;
    }
    try {
      await updateCatalogProduct(data.appId, colId, productId, {
        name: productForm.name.trim() || undefined,
        description: productForm.description,
        price: productForm.price ? parseFloat(productForm.price) : undefined,
        comparePrice: productForm.comparePrice ? parseFloat(productForm.comparePrice) : undefined,
        imageUrls: productForm.imageUrls,
        inStock: productForm.inStock,
        tags: productForm.tags,
      }, token);
      setEditingProductId(null); setProductForm(emptyProductForm());
      await refresh(); triggerRefresh();
    } catch { setError('Error al actualizar producto'); }
  };

  const handleDeleteProduct = async (colId: string, productId: string) => {
    if (!data.appId) return;
    try { await deleteCatalogProduct(data.appId, colId, productId, token); await refresh(); triggerRefresh(); } catch { setError('Error al eliminar producto'); }
  };

  const handleMoveProduct = async (colId: string, products: CatalogProduct[], index: number, dir: -1 | 1) => {
    if (!data.appId) return;
    const newProducts = [...products];
    const [moved] = newProducts.splice(index, 1);
    newProducts.splice(index + dir, 0, moved);
    try { await reorderCatalogProducts(data.appId, colId, newProducts.map((p, i) => ({ id: p.id, order: i })), token); await refresh(); triggerRefresh(); } catch { setError('Error al reordenar'); }
  };

  const handleImageUpload = async (file: File) => {
    setUploadingImage(true);
    try {
      const res = await uploadFile(file, token);
      setProductForm(prev => ({ ...prev, imageUrls: [...prev.imageUrls, res.url] }));
    } catch { setError('Error al subir imagen'); }
    setUploadingImage(false);
  };

  const removeImage = (idx: number) => {
    setProductForm(prev => ({ ...prev, imageUrls: prev.imageUrls.filter((_, i) => i !== idx) }));
  };

  const addTag = () => {
    if (!productForm.newTag.trim()) return;
    setProductForm(prev => ({
      ...prev,
      tags: [...prev.tags, prev.newTag.trim()],
      newTag: '',
    }));
  };

  const removeTag = (idx: number) => {
    setProductForm(prev => ({ ...prev, tags: prev.tags.filter((_, i) => i !== idx) }));
  };

  const renderProductForm = (colId: string, isEditing: boolean) => (
    <div className="space-y-2 bg-gray-50 p-2 rounded border">
      <input type="text" placeholder="Nombre del producto *" value={productForm.name}
        onChange={e => setProductForm(prev => ({ ...prev, name: e.target.value }))}
        className="w-full text-xs border rounded px-2 py-1" />
      <textarea placeholder="Descripción" value={productForm.description} rows={2}
        onChange={e => setProductForm(prev => ({ ...prev, description: e.target.value }))}
        className="w-full text-xs border rounded px-2 py-1" />
      <div className="flex gap-2">
        <div>
          <label className="text-[10px] text-gray-500">Precio *</label>
          <input type="number" step="0.01" min="0" value={productForm.price}
            onChange={e => setProductForm(prev => ({ ...prev, price: e.target.value }))}
            className="w-20 text-xs border rounded px-2 py-1" />
        </div>
        <div>
          <label className="text-[10px] text-gray-500">Precio anterior</label>
          <input type="number" step="0.01" min="0" value={productForm.comparePrice} placeholder="—"
            onChange={e => setProductForm(prev => ({ ...prev, comparePrice: e.target.value }))}
            className="w-20 text-xs border rounded px-2 py-1" />
        </div>
      </div>
      {/* Images */}
      <div>
        <label className="text-[10px] text-gray-500">Imágenes</label>
        <div className="flex flex-wrap gap-1 mt-0.5">
          {productForm.imageUrls.map((url, i) => (
            <div key={i} className="relative">
              <img src={resolveAssetUrl(url)} alt="" className="w-10 h-10 rounded object-cover" />
              <button onClick={() => removeImage(i)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center text-[8px]">×</button>
            </div>
          ))}
          <label className="w-10 h-10 rounded border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-indigo-400">
            <Plus size={14} className="text-gray-400" />
            <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />
          </label>
          {uploadingImage && <span className="text-[10px] text-gray-400 self-center">Subiendo...</span>}
        </div>
      </div>
      {/* Tags */}
      <div>
        <label className="text-[10px] text-gray-500">Etiquetas</label>
        <div className="flex flex-wrap gap-1 mt-0.5">
          {productForm.tags.map((tag, i) => (
            <span key={i} className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
              {tag} <button onClick={() => removeTag(i)} className="text-indigo-400 hover:text-indigo-600">×</button>
            </span>
          ))}
        </div>
        <div className="flex gap-1 mt-1">
          <input type="text" placeholder="Nueva etiqueta..." value={productForm.newTag}
            onChange={e => setProductForm(prev => ({ ...prev, newTag: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && addTag()}
            className="flex-1 text-xs border rounded px-2 py-0.5" />
          <button onClick={addTag} disabled={!productForm.newTag.trim()} className="text-[10px] text-indigo-600 px-1.5">
            <Tag size={10} />
          </button>
        </div>
      </div>
      <label className="flex items-center gap-1.5 text-[10px] text-gray-600">
        <input type="checkbox" checked={productForm.inStock}
          onChange={e => setProductForm(prev => ({ ...prev, inStock: e.target.checked }))} />
        En stock
      </label>
      <div className="flex gap-1">
        <button
          onClick={() => isEditing ? handleUpdateProduct(colId, editingProductId!) : handleAddProduct(colId)}
          disabled={!productForm.name.trim() || !productForm.price}
          className="flex items-center gap-1 bg-emerald-600 text-white text-[10px] px-2 py-1 rounded hover:bg-emerald-700 disabled:opacity-50"
        >
          <Save size={10} /> {isEditing ? 'Guardar' : 'Añadir'}
        </button>
        <button onClick={() => { setAddingProductToCol(null); setEditingProductId(null); setProductForm(emptyProductForm()); }}
          className="flex items-center gap-1 text-gray-500 text-[10px] px-2 py-1 rounded hover:bg-gray-100">
          <X size={10} /> Cancelar
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-3 text-xs">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-[10px] p-2 rounded flex items-center gap-1">
          <AlertTriangle size={12} /> {error}
          <button onClick={() => setError('')} className="ml-auto"><X size={10} /></button>
        </div>
      )}

      {/* SMTP not configured banner */}
      {data.appId && smtpConfigured === false && (
        <div className="bg-amber-50 border border-amber-300 rounded-md p-3 flex items-start gap-2">
          <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-600" />
          <div className="flex-1 text-[11px]">
            <p className="font-semibold text-amber-800">SMTP no configurado</p>
            <p className="text-amber-700 mt-0.5">
              Los pedidos se crearán pero no se enviarán emails de confirmación ni a ti ni a tu cliente.
            </p>
            <a
              href={`/apps/${data.appId}/settings#smtp`}
              className="inline-block mt-1 text-amber-900 underline font-medium"
            >
              Configurar ahora →
            </a>
          </div>
        </div>
      )}

      {/* Tabs: Productos | Pedidos */}
      {data.appId && (
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setSettingsTab('products')}
            className={`flex-1 text-[11px] font-semibold py-1.5 border-b-2 transition-colors ${settingsTab === 'products' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Productos
          </button>
          <button
            onClick={() => setSettingsTab('orders')}
            className={`flex-1 text-[11px] font-semibold py-1.5 border-b-2 transition-colors flex items-center justify-center gap-1 ${settingsTab === 'orders' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Pedidos
            {pendingCount > 0 && (
              <span className="bg-red-500 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{pendingCount}</span>
            )}
          </button>
        </div>
      )}

      {/* Orders Tab */}
      {settingsTab === 'orders' && data.appId && (
        <OrdersTab appId={data.appId} currency={data.currency} />
      )}

      {/* Products Tab */}
      {settingsTab === 'products' && <>

      {/* Visual Config */}
      <button onClick={() => setShowVisual(!showVisual)} className="w-full flex items-center justify-between font-bold text-gray-700">
        Configuracion Visual {showVisual ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {showVisual && (
        <div className="space-y-2 pl-1">
          <div>
            <label className="text-[10px] text-gray-500">Layout</label>
            <div className="flex gap-1 mt-0.5">
              {(['grid', 'list'] as const).map(l => (
                <button key={l} onClick={() => onChange({ ...data, layout: l })}
                  className={`text-[10px] px-2 py-1 rounded border ${data.layout === l ? 'bg-indigo-100 border-indigo-300' : 'border-gray-200'}`}>
                  {l === 'grid' ? 'Cuadrícula' : 'Lista'}
                </button>
              ))}
            </div>
          </div>
          {data.layout === 'grid' && (
            <div>
              <label className="text-[10px] text-gray-500">Columnas: {data.columns}</label>
              <input type="range" min={1} max={3} value={data.columns}
                onChange={e => onChange({ ...data, columns: parseInt(e.target.value) })}
                className="w-full" />
            </div>
          )}
          <div>
            <label className="text-[10px] text-gray-500">Moneda</label>
            <select
              value={data.currency}
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
            ['showPrices', 'Mostrar precios'],
            ['showComparePrice', 'Precio comparado (tachado)'],
            ['showTags', 'Mostrar etiquetas'],
            ['enableCart', 'Habilitar carrito'],
          ] as const).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-[11px]">
              <input type="checkbox" checked={data[key]} onChange={e => onChange({ ...data, [key]: e.target.checked })} />
              {label}
            </label>
          ))}
        </div>
      )}

      {/* Catalog Management */}
      {data.appId ? (
        <>
          <div className="border-t pt-2">
            <span className="font-bold text-gray-700">Gestión del Catálogo</span>
            {loading && <span className="text-[10px] text-gray-400 ml-2">Cargando...</span>}
          </div>

          <div className="flex gap-1">
            <input type="text" placeholder="Nueva colección..." value={newColName}
              onChange={e => setNewColName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddCol()}
              className="flex-1 text-xs border rounded px-2 py-1" />
            <button onClick={handleAddCol} disabled={!newColName.trim()}
              className="flex items-center gap-1 bg-indigo-600 text-white text-[10px] px-2 py-1 rounded hover:bg-indigo-700 disabled:opacity-50">
              <Plus size={10} /> Colección
            </button>
          </div>

          {cols.map((col, colIdx) => (
            <div key={col.id} className="border rounded">
              <div className="flex items-center gap-1 px-2 py-1.5 bg-gray-50 border-b">
                <button onClick={() => setExpandedColId(expandedColId === col.id ? null : col.id)} className="flex-1 text-left">
                  <div className="flex items-center gap-1">
                    {expandedColId === col.id ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                    {editingColId === col.id ? (
                      <input type="text" value={colName} autoFocus
                        onChange={e => setColName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleUpdateCol(col.id)}
                        onClick={e => e.stopPropagation()}
                        className="text-xs border rounded px-1 py-0.5 w-32" />
                    ) : (
                      <span className="text-[11px] font-semibold">{col.name}</span>
                    )}
                    <span className="text-[9px] text-gray-400">({col.products.length})</span>
                  </div>
                </button>
                <div className="flex gap-0.5">
                  {colIdx > 0 && <button onClick={() => handleMoveCol(colIdx, -1)} className="text-gray-400 hover:text-gray-600 p-0.5"><ArrowUp size={10} /></button>}
                  {colIdx < cols.length - 1 && <button onClick={() => handleMoveCol(colIdx, 1)} className="text-gray-400 hover:text-gray-600 p-0.5"><ArrowDown size={10} /></button>}
                  {editingColId === col.id ? (
                    <>
                      <button onClick={() => handleUpdateCol(col.id)} className="text-emerald-600 p-0.5"><Save size={10} /></button>
                      <button onClick={() => setEditingColId(null)} className="text-gray-400 p-0.5"><X size={10} /></button>
                    </>
                  ) : (
                    <button onClick={() => { setEditingColId(col.id); setColName(col.name); }} className="text-blue-500 p-0.5"><Pencil size={10} /></button>
                  )}
                  <button onClick={() => handleDeleteCol(col.id)} className="text-red-400 hover:text-red-600 p-0.5"><Trash2 size={10} /></button>
                </div>
              </div>

              {expandedColId === col.id && (
                <div className="p-2 space-y-1">
                  {col.products.map((product, pIdx) => (
                    <div key={product.id} className="flex items-center gap-1 py-1 border-b border-gray-50 last:border-0">
                      {product.imageUrls[0] ? (
                        <img src={resolveAssetUrl(product.imageUrls[0])} alt="" className="w-6 h-6 rounded object-cover" />
                      ) : (
                        <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center"><ShoppingBag size={10} className="text-gray-300" /></div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-medium truncate">{product.name}</span>
                          <span className="text-[10px] text-indigo-600 font-bold ml-auto">{parseFloat(product.price).toFixed(2)}{data.currency}</span>
                        </div>
                        {product.tags.length > 0 && (
                          <div className="flex gap-0.5">{product.tags.map(t => <span key={t} className="text-[8px] bg-gray-100 px-1 rounded">{t}</span>)}</div>
                        )}
                      </div>
                      <div className="flex gap-0.5">
                        {pIdx > 0 && <button onClick={() => handleMoveProduct(col.id, col.products, pIdx, -1)} className="text-gray-400 p-0.5"><ArrowUp size={9} /></button>}
                        {pIdx < col.products.length - 1 && <button onClick={() => handleMoveProduct(col.id, col.products, pIdx, 1)} className="text-gray-400 p-0.5"><ArrowDown size={9} /></button>}
                        <button
                          onClick={() => {
                            setEditingProductId(product.id);
                            setAddingProductToCol(col.id);
                            setProductForm({
                              name: product.name,
                              description: product.description || '',
                              price: parseFloat(product.price).toString(),
                              comparePrice: product.comparePrice ? parseFloat(product.comparePrice).toString() : '',
                              imageUrls: product.imageUrls,
                              inStock: product.inStock,
                              tags: product.tags,
                              newTag: '',
                            });
                          }}
                          className="text-blue-500 p-0.5"><Pencil size={9} /></button>
                        <button onClick={() => handleDeleteProduct(col.id, product.id)} className="text-red-400 p-0.5"><Trash2 size={9} /></button>
                      </div>
                    </div>
                  ))}

                  {addingProductToCol === col.id ? (
                    renderProductForm(col.id, !!editingProductId)
                  ) : (
                    <button
                      onClick={() => { setAddingProductToCol(col.id); setEditingProductId(null); setProductForm(emptyProductForm()); }}
                      className="flex items-center gap-1 text-[10px] text-indigo-600 hover:text-indigo-700 mt-1">
                      <Plus size={10} /> Añadir producto
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </>
      ) : (
        <div className="bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] p-2 rounded">
          Guarda la app primero para gestionar el catalogo.
        </div>
      )}

      </>}
    </div>
  );
};

// ===== MODULE EXPORT =====

export const CatalogModule: ModuleDefinition<CatalogConfig> = {
  id: 'catalog',
  name: 'Catálogo',
  description: 'Catálogo de productos con colecciones, precios y carrito',
  icon: <ShoppingBag size={20} />,
  schema: CatalogConfigSchema,
  defaultConfig: {
    layout: 'grid',
    columns: 2,
    showPrices: true,
    showComparePrice: true,
    showTags: true,
    enableCart: true,
    currency: '€',
  },
  PreviewComponent,
  RuntimeComponent,
  SettingsPanel,
};
