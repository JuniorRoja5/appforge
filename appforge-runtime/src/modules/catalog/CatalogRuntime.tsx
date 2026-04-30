import React, { useEffect, useState, useRef } from 'react';
import { ShoppingCart, ArrowLeft, Check, Minus, Plus, LogIn } from 'lucide-react';
import { getCatalogCollections, createOrder } from '../../lib/api';
import { getCurrentUser, isAuthenticated, login as appUserLogin, register as appUserRegister, onAuthChange } from '../../lib/auth';
import { resolveAssetUrl } from '../../lib/resolve-asset-url';
import { imgFallback } from '../../lib/img-fallback';
import { registerRuntimeModule } from '../registry';

type Collections = Awaited<ReturnType<typeof getCatalogCollections>>;
type Product = Collections[number]['products'][number];

interface CartItem {
  product: Product;
  quantity: number;
}

type View = 'shopping' | 'cart' | 'login-gate' | 'checkout' | 'confirmation';

const CatalogRuntime: React.FC<{ data: Record<string, unknown> }> = ({ data }) => {
  const title = (data.title as string) ?? 'Catálogo';
  const enableCart = (data.enableCart as boolean) ?? true;
  const currency = (data.currency as string) ?? '$';
  const layout = (data.layout as string) ?? 'grid';
  const columns = Math.min(3, Math.max(1, (data.columns as number) ?? 2));
  const showPrices = (data.showPrices as boolean) ?? true;
  const showComparePrice = (data.showComparePrice as boolean) ?? true;
  const showTags = (data.showTags as boolean) ?? true;

  const [collections, setCollections] = useState<Collections>([]);
  const [activeCollection, setActiveCollection] = useState(0);
  const [loading, setLoading] = useState(true);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [view, setView] = useState<View>('shopping');
  const [checkoutForm, setCheckoutForm] = useState({ name: '', phone: '', notes: '' });
  const [confirmedOrder, setConfirmedOrder] = useState<{ id: string; total: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const checkoutRef = useRef<HTMLDivElement>(null);

  // Login gate state
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authForm, setAuthForm] = useState({ email: '', password: '', firstName: '', lastName: '' });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    getCatalogCollections().then(setCollections).catch(console.error).finally(() => setLoading(false));
  }, []);

  // Auto-advance to checkout when user logs in via the gate
  useEffect(() => {
    return onAuthChange((user) => {
      if (user && view === 'login-gate') {
        if (user.firstName) {
          setCheckoutForm((p) => ({ ...p, name: p.name || `${user.firstName} ${user.lastName ?? ''}`.trim() }));
        }
        setView('checkout');
        setTimeout(() => checkoutRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    });
  }, [view]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      if (authMode === 'login') {
        await appUserLogin(authForm.email, authForm.password);
      } else {
        await appUserRegister(authForm.email, authForm.password, authForm.firstName || undefined, authForm.lastName || undefined);
      }
      // onAuthChange listener handles the view transition
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Error');
    } finally {
      setAuthLoading(false);
    }
  };

  // Cart helpers
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + parseFloat(item.product.price) * item.quantity, 0);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) return prev.map((i) => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.product.id !== productId ? i : { ...i, quantity: i.quantity + delta }))
        .filter((i) => i.quantity > 0),
    );
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutForm.name.trim() || cart.length === 0) return;
    setSubmitting(true);
    try {
      const user = getCurrentUser();
      const order = await createOrder({
        customerName: checkoutForm.name.trim(),
        customerPhone: checkoutForm.phone || undefined,
        customerNotes: checkoutForm.notes || undefined,
        items: cart.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
      });
      setConfirmedOrder({ id: order.id, total: order.total ?? String(cartTotal.toFixed(2)) });
      setCart([]);
      setView('confirmation');
      setCheckoutForm({ name: user?.firstName ? `${user.firstName} ${user.lastName ?? ''}`.trim() : '', phone: '', notes: '' });
    } catch {
      // silent
    }
    setSubmitting(false);
  };

  if (loading) return <div className="animate-pulse h-40 rounded-xl" style={{ backgroundColor: 'var(--color-surface-variant)' }} />;
  if (collections.length === 0) return <p style={{ color: 'var(--color-text-secondary)' }}>No hay productos disponibles.</p>;

  // ── Confirmation view ──
  if (view === 'confirmation') {
    return (
      <div className="text-center p-8" style={{ borderRadius: 'var(--radius-card)', backgroundColor: 'var(--color-surface-card)' }}>
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: 'var(--color-feedback-success, #22c55e)20' }}>
          <Check size={28} style={{ color: 'var(--color-feedback-success, #22c55e)' }} />
        </div>
        <h4 className="font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>Pedido recibido</h4>
        {confirmedOrder && (
          <>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>N.° {confirmedOrder.id.slice(0, 8).toUpperCase()}</p>
            <p className="text-sm font-bold mt-1" style={{ color: 'var(--color-primary)' }}>
              {currency}{parseFloat(confirmedOrder.total).toFixed(2)}
            </p>
          </>
        )}
        <p className="text-xs mt-2" style={{ color: 'var(--color-text-secondary)' }}>
          Tu pedido ha sido recibido. El negocio se pondrá en contacto contigo.
        </p>
        <button
          onClick={() => { setView('shopping'); setConfirmedOrder(null); }}
          className="mt-4 text-sm font-medium"
          style={{ color: 'var(--color-primary)' }}
        >
          Volver al catálogo
        </button>
      </div>
    );
  }

  // ── Checkout view ──
  if (view === 'checkout') {
    return (
      <div ref={checkoutRef}>
        <button
          onClick={() => setView('cart')}
          className="flex items-center gap-1 text-sm font-medium mb-3"
          style={{ color: 'var(--color-primary)' }}
        >
          <ArrowLeft size={16} /> Volver al carrito
        </button>
        <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>Finalizar pedido</h3>

        <form onSubmit={handleCheckout} className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Nombre *</label>
            <input
              type="text"
              value={checkoutForm.name}
              onChange={(e) => setCheckoutForm((p) => ({ ...p, name: e.target.value }))}
              required
              placeholder="Tu nombre"
              className="w-full px-3 py-2.5 text-sm border rounded-lg"
              style={{ borderColor: 'var(--color-divider)', borderRadius: 'var(--radius-input)' }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Teléfono</label>
            <input
              type="tel"
              value={checkoutForm.phone}
              onChange={(e) => setCheckoutForm((p) => ({ ...p, phone: e.target.value }))}
              placeholder="(Opcional)"
              className="w-full px-3 py-2.5 text-sm border rounded-lg"
              style={{ borderColor: 'var(--color-divider)', borderRadius: 'var(--radius-input)' }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Notas</label>
            <textarea
              value={checkoutForm.notes}
              onChange={(e) => setCheckoutForm((p) => ({ ...p, notes: e.target.value }))}
              rows={2}
              placeholder="Instrucciones especiales..."
              className="w-full px-3 py-2.5 text-sm border rounded-lg resize-none"
              style={{ borderColor: 'var(--color-divider)', borderRadius: 'var(--radius-input)' }}
            />
          </div>

          <div className="flex justify-between items-center pt-2 border-t" style={{ borderColor: 'var(--color-divider)' }}>
            <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Total</span>
            <span className="text-base font-bold" style={{ color: 'var(--color-primary)' }}>{currency}{cartTotal.toFixed(2)}</span>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 text-sm font-semibold rounded-xl disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-text-on-primary)', borderRadius: 'var(--radius-button)' }}
          >
            {submitting ? 'Enviando...' : 'Confirmar pedido'}
          </button>
        </form>
      </div>
    );
  }

  // ── Login gate ──
  if (view === 'login-gate') {
    return (
      <div>
        <button
          onClick={() => setView('cart')}
          className="flex items-center gap-1 text-sm font-medium mb-3"
          style={{ color: 'var(--color-primary)' }}
        >
          <ArrowLeft size={16} /> Volver al carrito
        </button>

        <div className="text-center mb-4">
          <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-2" style={{ backgroundColor: 'var(--color-primary, #4F46E5)15' }}>
            <LogIn size={20} style={{ color: 'var(--color-primary)' }} />
          </div>
          <h3 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {authMode === 'login' ? 'Inicia sesión para continuar' : 'Crear cuenta'}
          </h3>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            Necesitamos identificarte para procesar tu pedido y avisarte cuando esté listo.
          </p>
        </div>

        <form onSubmit={handleAuthSubmit} className="space-y-2">
          {authMode === 'register' && (
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Nombre"
                value={authForm.firstName}
                onChange={(e) => setAuthForm({ ...authForm, firstName: e.target.value })}
                className="px-3 py-2 text-sm border rounded-lg"
                style={{ borderColor: 'var(--color-divider)', borderRadius: 'var(--radius-input)' }}
              />
              <input
                type="text"
                placeholder="Apellido"
                value={authForm.lastName}
                onChange={(e) => setAuthForm({ ...authForm, lastName: e.target.value })}
                className="px-3 py-2 text-sm border rounded-lg"
                style={{ borderColor: 'var(--color-divider)', borderRadius: 'var(--radius-input)' }}
              />
            </div>
          )}
          <input
            type="email"
            placeholder="Email"
            value={authForm.email}
            onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
            required
            className="w-full px-3 py-2 text-sm border rounded-lg"
            style={{ borderColor: 'var(--color-divider)', borderRadius: 'var(--radius-input)' }}
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={authForm.password}
            onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
            required
            minLength={6}
            className="w-full px-3 py-2 text-sm border rounded-lg"
            style={{ borderColor: 'var(--color-divider)', borderRadius: 'var(--radius-input)' }}
          />
          {authError && (
            <p className="text-xs" style={{ color: 'var(--color-feedback-error, #ef4444)' }}>{authError}</p>
          )}
          <button
            type="submit"
            disabled={authLoading}
            className="w-full py-2.5 text-sm font-semibold rounded-xl disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-text-on-primary)', borderRadius: 'var(--radius-button)' }}
          >
            {authLoading ? '...' : authMode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
          </button>
        </form>

        <div className="text-center mt-3">
          <button
            type="button"
            onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError(''); }}
            className="text-xs underline"
            style={{ color: 'var(--color-primary)' }}
          >
            {authMode === 'login' ? '¿No tienes cuenta? Crear una' : '¿Ya tienes cuenta? Iniciar sesión'}
          </button>
        </div>
      </div>
    );
  }

  // ── Cart view ──
  if (view === 'cart') {
    return (
      <div>
        <button
          onClick={() => setView('shopping')}
          className="flex items-center gap-1 text-sm font-medium mb-3"
          style={{ color: 'var(--color-primary)' }}
        >
          <ArrowLeft size={16} /> Seguir comprando
        </button>
        <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>
          Carrito ({cartCount})
        </h3>

        {cart.length === 0 ? (
          <div className="text-center py-8">
            <ShoppingCart size={32} className="mx-auto mb-2" style={{ color: 'var(--color-text-secondary)' }} />
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>El carrito está vacío</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {cart.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-center gap-3 p-3"
                  style={{ borderRadius: 'var(--radius-card, 12px)', backgroundColor: 'var(--color-surface-card)', boxShadow: 'var(--shadow-sm)' }}
                >
                  {item.product.imageUrls[0] ? (
                    <img src={resolveAssetUrl(item.product.imageUrls[0])} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" onError={imgFallback} />
                  ) : (
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--color-surface-variant)' }}>
                      <ShoppingCart size={16} style={{ color: 'var(--color-text-secondary)' }} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{item.product.name}</p>
                    <p className="text-xs font-bold" style={{ color: 'var(--color-primary)' }}>
                      {currency}{(parseFloat(item.product.price) * item.quantity).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.product.id, -1)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: 'var(--color-surface-variant)' }}
                    >
                      <Minus size={14} style={{ color: 'var(--color-text-primary)' }} />
                    </button>
                    <span className="text-xs font-semibold w-4 text-center" style={{ color: 'var(--color-text-primary)' }}>{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, 1)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: 'var(--color-surface-variant)' }}
                    >
                      <Plus size={14} style={{ color: 'var(--color-text-primary)' }} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t" style={{ borderColor: 'var(--color-divider)' }}>
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Total</span>
                <span className="text-base font-bold" style={{ color: 'var(--color-primary)' }}>{currency}{cartTotal.toFixed(2)}</span>
              </div>
              <button
                onClick={() => {
                  if (!isAuthenticated()) {
                    setView('login-gate');
                    return;
                  }
                  const user = getCurrentUser();
                  if (user?.firstName) {
                    setCheckoutForm((p) => ({ ...p, name: p.name || `${user.firstName} ${user.lastName ?? ''}`.trim() }));
                  }
                  setView('checkout');
                  setTimeout(() => checkoutRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                }}
                className="w-full py-3 text-sm font-semibold rounded-xl"
                style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-text-on-primary)', borderRadius: 'var(--radius-button)' }}
              >
                Realizar pedido
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // ── Shopping view (default) ──
  const current = collections[activeCollection];

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{title}</h3>
        {enableCart && cartCount > 0 && (
          <button
            onClick={() => setView('cart')}
            className="relative flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-text-on-primary)' }}
          >
            <ShoppingCart size={14} />
            {cartCount}
          </button>
        )}
      </div>

      {/* Collection tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4" style={{ scrollbarWidth: 'none' }}>
        {collections.map((col, i) => (
          <button
            key={col.id}
            onClick={() => setActiveCollection(i)}
            className="shrink-0 px-4 py-2 rounded-full text-xs font-semibold"
            style={{
              backgroundColor: i === activeCollection ? 'var(--color-primary)' : 'var(--color-surface-variant)',
              color: i === activeCollection ? 'var(--color-text-on-primary)' : 'var(--color-text-secondary)',
            }}
          >
            {col.name}
          </button>
        ))}
      </div>

      {/* Products */}
      {layout === 'list' ? (
        <div className="space-y-2">
          {current?.products.map((product) => (
            <div
              key={product.id}
              className="flex gap-3"
              style={{ padding: 'var(--spacing-card, 12px)', borderRadius: 'var(--radius-card, 12px)', backgroundColor: 'var(--color-surface-card)', boxShadow: 'var(--shadow-sm)', opacity: product.inStock ? 1 : 0.5 }}
            >
              {product.imageUrls[0] && (
                <img src={resolveAssetUrl(product.imageUrls[0])} alt={product.name} className="w-16 h-16 object-cover shrink-0" style={{ borderRadius: 'var(--radius-card, 8px)' }} onError={imgFallback} />
              )}
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-semibold line-clamp-1" style={{ color: 'var(--color-text-primary)' }}>{product.name}</h4>
                {showTags && product.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {product.tags.map((tag) => (
                      <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--color-primary, #9333ea)15', color: 'var(--color-primary)' }}>{tag}</span>
                    ))}
                  </div>
                )}
                {product.description && <p className="text-[10px] line-clamp-1 mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{product.description}</p>}
                {showPrices && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-sm font-bold" style={{ color: 'var(--color-primary)' }}>{currency}{product.price}</span>
                    {showComparePrice && product.comparePrice && (
                      <span className="text-xs line-through" style={{ color: 'var(--color-text-secondary)' }}>{currency}{product.comparePrice}</span>
                    )}
                  </div>
                )}
                {!product.inStock && <span className="text-[10px] font-medium" style={{ color: 'var(--color-feedback-error)' }}>Agotado</span>}
              </div>
              {enableCart && product.inStock && (
                <button
                  onClick={() => addToCart(product)}
                  className="shrink-0 self-center px-3 py-1.5 text-xs font-semibold rounded-lg"
                  style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-text-on-primary)', borderRadius: 'var(--radius-button)' }}
                >
                  Añadir
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: '12px' }}>
          {current?.products.map((product) => (
            <div
              key={product.id}
              style={{ borderRadius: 'var(--radius-card, 12px)', backgroundColor: 'var(--color-surface-card)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}
            >
              {product.imageUrls[0] && (
                <img src={resolveAssetUrl(product.imageUrls[0])} alt={product.name} className="w-full h-32 object-cover" onError={imgFallback} />
              )}
              <div className="p-3">
                {showTags && product.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-1">
                    {product.tags.map((tag) => (
                      <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--color-primary, #9333ea)15', color: 'var(--color-primary)' }}>{tag}</span>
                    ))}
                  </div>
                )}
                <h4 className="text-xs font-semibold line-clamp-1" style={{ color: 'var(--color-text-primary)' }}>{product.name}</h4>
                {showPrices && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-sm font-bold" style={{ color: 'var(--color-primary)' }}>{currency}{product.price}</span>
                    {showComparePrice && product.comparePrice && (
                      <span className="text-xs line-through" style={{ color: 'var(--color-text-secondary)' }}>{currency}{product.comparePrice}</span>
                    )}
                  </div>
                )}
                {!product.inStock && <span className="text-[10px] font-medium" style={{ color: 'var(--color-feedback-error)' }}>Agotado</span>}
                {enableCart && product.inStock && (
                  <button
                    onClick={() => addToCart(product)}
                    className="w-full mt-2 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1"
                    style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-text-on-primary)', borderRadius: 'var(--radius-button)' }}
                  >
                    <ShoppingCart size={12} /> Añadir
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

registerRuntimeModule({ id: 'catalog', Component: CatalogRuntime });
