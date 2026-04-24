import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { getMenuCategories } from '../../lib/api';
import { resolveAssetUrl } from '../../lib/resolve-asset-url';
import { imgFallback } from '../../lib/img-fallback';
import { registerRuntimeModule } from '../registry';

type Categories = Awaited<ReturnType<typeof getMenuCategories>>;
type MenuItem = Categories[number]['items'][number];

const ALLERGEN_MAP: Record<string, { emoji: string; label: string }> = {
  gluten: { emoji: '🌾', label: 'Gluten' },
  lactosa: { emoji: '🥛', label: 'Lácteos' },
  huevo: { emoji: '🥚', label: 'Huevo' },
  frutos_secos: { emoji: '🥜', label: 'Frutos secos' },
  marisco: { emoji: '🦐', label: 'Marisco' },
  pescado: { emoji: '🐟', label: 'Pescado' },
  soja: { emoji: '🫘', label: 'Soja' },
  apio: { emoji: '🥬', label: 'Apio' },
};

const MenuRestaurantRuntime: React.FC<{ data: Record<string, unknown> }> = ({ data }) => {
  const title = (data.title as string) ?? 'Menú';
  const layout = (data.layout as string) ?? 'accordion';
  const showImages = (data.showImages as boolean) ?? true;
  const showPrices = (data.showPrices as boolean) ?? true;
  const showAllergens = (data.showAllergens as boolean) ?? true;
  const showDescription = (data.showDescription as boolean) ?? true;
  const currency = (data.currency as string) ?? '€';

  const [categories, setCategories] = useState<Categories>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Accordion state
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  // Tabs state
  const [activeTab, setActiveTab] = useState('');

  useEffect(() => {
    getMenuCategories()
      .then((cats) => {
        setCategories(cats);
        if (cats.length > 0) {
          setExpandedCats(new Set([cats[0].id]));
          setActiveTab(cats[0].id);
        }
      })
      .catch((err) => setError(err?.message || 'Error al cargar el menú'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="animate-pulse h-40 rounded-xl" style={{ backgroundColor: 'var(--color-surface-variant)' }} />;
  if (error) return <p className="text-sm text-center py-4" style={{ color: 'var(--color-feedback-error)' }}>{error}</p>;
  if (categories.length === 0) return <p style={{ color: 'var(--color-text-secondary)' }}>No hay menú disponible.</p>;

  const toggleCat = (id: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // ── Shared item renderer ──
  const renderItem = (item: MenuItem) => (
    <div
      key={item.id}
      className="flex items-start gap-2 py-2"
      style={{ opacity: item.available ? 1 : 0.5 }}
    >
      {showImages && item.imageUrl && (
        <img src={resolveAssetUrl(item.imageUrl)} alt={item.name} className="w-12 h-12 rounded object-cover shrink-0" onError={imgFallback} />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>
            {item.name}
            {!item.available && <span className="text-[9px] ml-1" style={{ color: 'var(--color-feedback-error)' }}>(Agotado)</span>}
          </span>
          {showPrices && (
            <span className="text-xs font-bold shrink-0" style={{ color: 'var(--color-primary)' }}>
              {parseFloat(item.price).toFixed(2)}{currency}
            </span>
          )}
        </div>
        {showDescription && item.description && (
          <p className="text-[10px] line-clamp-1 mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{item.description}</p>
        )}
        {showAllergens && item.allergens.length > 0 && (
          <div className="flex gap-0.5 mt-0.5">
            {item.allergens.map((a) => (
              <span key={a} className="text-[9px]" title={ALLERGEN_MAP[a]?.label || a}>
                {ALLERGEN_MAP[a]?.emoji || '⚠️'}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderCategoryItems = (cat: Categories[number]) => (
    <div className="divide-y px-2" style={{ borderColor: 'var(--color-divider)' }}>
      {cat.items.length === 0 ? (
        <p className="text-[10px] py-2 text-center" style={{ color: 'var(--color-text-secondary)' }}>Sin platos</p>
      ) : (
        cat.items.map(renderItem)
      )}
    </div>
  );

  return (
    <div>
      <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>{title}</h3>

      {/* ── TABS layout ── */}
      {layout === 'tabs' && (
        <div>
          <div className="flex overflow-x-auto pb-2 mb-2 gap-2" style={{ scrollbarWidth: 'none' }}>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className="shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-colors"
                style={{
                  backgroundColor: activeTab === cat.id ? 'var(--color-primary)' : 'var(--color-surface-variant)',
                  color: activeTab === cat.id ? 'var(--color-text-on-primary)' : 'var(--color-text-secondary)',
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>
          {categories.filter((c) => c.id === activeTab).map((cat) => (
            <div key={cat.id}>{renderCategoryItems(cat)}</div>
          ))}
        </div>
      )}

      {/* ── ACCORDION layout ── */}
      {layout === 'accordion' && (
        <div className="space-y-1">
          {categories.map((cat) => (
            <div key={cat.id} style={{ borderRadius: 'var(--radius-card, 12px)', backgroundColor: 'var(--color-surface-card)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
              <button
                onClick={() => toggleCat(cat.id)}
                className="w-full flex items-center justify-between px-3 py-2.5"
              >
                <div className="flex items-center gap-2">
                  {showImages && cat.imageUrl && (
                    <img src={resolveAssetUrl(cat.imageUrl)} alt="" className="w-8 h-8 rounded object-cover" onError={imgFallback} />
                  )}
                  <div className="text-left">
                    <span className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>{cat.name}</span>
                    <span className="text-[9px] ml-1" style={{ color: 'var(--color-text-secondary)' }}>({cat.items.length})</span>
                  </div>
                </div>
                {expandedCats.has(cat.id) ? (
                  <ChevronUp size={14} style={{ color: 'var(--color-text-secondary)' }} />
                ) : (
                  <ChevronDown size={14} style={{ color: 'var(--color-text-secondary)' }} />
                )}
              </button>
              {expandedCats.has(cat.id) && renderCategoryItems(cat)}
            </div>
          ))}
        </div>
      )}

      {/* ── SCROLL layout ── */}
      {layout === 'scroll' && (
        <div className="space-y-3">
          {categories.map((cat) => (
            <div key={cat.id}>
              <div className="px-2 py-1.5 mb-1" style={{ backgroundColor: 'var(--color-surface-variant)', borderRadius: 'var(--radius-card, 8px)' }}>
                <span className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>{cat.name}</span>
                {cat.description && <p className="text-[9px]" style={{ color: 'var(--color-text-secondary)' }}>{cat.description}</p>}
              </div>
              {renderCategoryItems(cat)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

registerRuntimeModule({ id: 'menu_restaurant', Component: MenuRestaurantRuntime });