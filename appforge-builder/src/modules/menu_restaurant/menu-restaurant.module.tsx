import React, { useState, useEffect, useCallback } from 'react';
import type { ModuleDefinition } from '../base/module.interface';
import { z } from 'zod';
import {
  UtensilsCrossed, Plus, Pencil, Trash2, Save, X,
  ChevronDown, ChevronUp,
  ArrowUp, ArrowDown, AlertTriangle,
} from 'lucide-react';
import {
  getMenuCategories,
  createMenuCategory,
  updateMenuCategory,
  deleteMenuCategory,
  reorderMenuCategories,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  reorderMenuItems,
} from '../../lib/api';
import { useAuthStore } from '../../store/useAuthStore';
import { resolveAssetUrl } from '../../lib/resolve-asset-url';
import { ImageInputField } from '../../components/shared/ImageInputField';
import type { MenuCategory, MenuItemAPI } from '../../lib/api';

// ===== CONFIG =====

const MenuRestaurantConfigSchema = z.object({
  layout: z.enum(['accordion', 'tabs', 'scroll']),
  showImages: z.boolean(),
  showPrices: z.boolean(),
  showAllergens: z.boolean(),
  showDescription: z.boolean(),
  currency: z.string(),
  appId: z.string().optional(),
  _refreshKey: z.number().optional(),
});

type MenuRestaurantConfig = z.infer<typeof MenuRestaurantConfigSchema>;

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

// ===== ALLERGEN LABELS =====

const ALLERGEN_MAP: Record<string, { label: string; emoji: string }> = {
  gluten: { label: 'Gluten', emoji: '🌾' },
  lactosa: { label: 'Lácteos', emoji: '🥛' },
  huevo: { label: 'Huevo', emoji: '🥚' },
  frutos_secos: { label: 'Frutos secos', emoji: '🥜' },
  marisco: { label: 'Marisco', emoji: '🦐' },
  pescado: { label: 'Pescado', emoji: '🐟' },
  soja: { label: 'Soja', emoji: '🫘' },
  apio: { label: 'Apio', emoji: '🥬' },
};

// ===== MOCK DATA =====

const MOCK_CATEGORIES: MenuCategory[] = [
  {
    id: '1', appId: '', name: 'Entrantes', description: null, imageUrl: null, order: 0,
    createdAt: '', updatedAt: '',
    items: [
      { id: '1a', categoryId: '1', name: 'Ensalada César', description: 'Lechuga, pollo, parmesano, croutones', price: '9.50', imageUrl: null, allergens: ['gluten', 'lactosa'], available: true, order: 0, createdAt: '', updatedAt: '' },
      { id: '1b', categoryId: '1', name: 'Croquetas caseras', description: 'De jamón ibérico (8 uds)', price: '8.00', imageUrl: null, allergens: ['gluten', 'lactosa', 'huevo'], available: true, order: 1, createdAt: '', updatedAt: '' },
      { id: '1c', categoryId: '1', name: 'Gazpacho andaluz', description: null, price: '6.50', imageUrl: null, allergens: [], available: true, order: 2, createdAt: '', updatedAt: '' },
    ],
  },
  {
    id: '2', appId: '', name: 'Principales', description: null, imageUrl: null, order: 1,
    createdAt: '', updatedAt: '',
    items: [
      { id: '2a', categoryId: '2', name: 'Solomillo a la plancha', description: 'Con patatas panaderas y pimientos', price: '18.90', imageUrl: null, allergens: [], available: true, order: 0, createdAt: '', updatedAt: '' },
      { id: '2b', categoryId: '2', name: 'Paella valenciana', description: 'Arroz, pollo, conejo, verduras', price: '14.50', imageUrl: null, allergens: [], available: false, order: 1, createdAt: '', updatedAt: '' },
      { id: '2c', categoryId: '2', name: 'Lubina al horno', description: 'Con verduras de temporada', price: '16.00', imageUrl: null, allergens: ['pescado'], available: true, order: 2, createdAt: '', updatedAt: '' },
    ],
  },
  {
    id: '3', appId: '', name: 'Postres', description: null, imageUrl: null, order: 2,
    createdAt: '', updatedAt: '',
    items: [
      { id: '3a', categoryId: '3', name: 'Tarta de queso', description: null, price: '5.50', imageUrl: null, allergens: ['lactosa', 'huevo', 'gluten'], available: true, order: 0, createdAt: '', updatedAt: '' },
      { id: '3b', categoryId: '3', name: 'Helado artesano', description: '3 bolas a elegir', price: '4.50', imageUrl: null, allergens: ['lactosa'], available: true, order: 1, createdAt: '', updatedAt: '' },
    ],
  },
];

// ===== PREVIEW COMPONENT =====

const PreviewComponent: React.FC<{ data: MenuRestaurantConfig; isSelected: boolean }> = ({ data, isSelected }) => {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<string>('');
  const hasRealData = categories.length > 0;
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!data.appId || !token) return;
    let cancelled = false;
    (async () => {
      try {
        const cats = await getMenuCategories(data.appId!, token);
        if (!cancelled) {
          setCategories(cats);
          if (cats.length > 0 && !activeTab) setActiveTab(cats[0].id);
        }
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [data.appId, data._refreshKey, token]);

  const displayCats = hasRealData ? categories : MOCK_CATEGORIES;
  const currency = data.currency || '€';

  // Initialize expanded state for accordion
  useEffect(() => {
    if (data.layout === 'accordion' && expandedCats.size === 0 && displayCats.length > 0) {
      setExpandedCats(new Set([displayCats[0].id]));
    }
  }, [displayCats, data.layout]);

  useEffect(() => {
    if (data.layout === 'tabs' && displayCats.length > 0 && !displayCats.find(c => c.id === activeTab)) {
      setActiveTab(displayCats[0].id);
    }
  }, [displayCats, data.layout, activeTab]);

  const toggleCat = (id: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const renderItem = (item: MenuItemAPI) => (
    <div
      key={item.id}
      className={`flex items-start gap-2 py-1.5 ${!item.available ? 'opacity-50' : ''}`}
    >
      {data.showImages && item.imageUrl && (
        <img src={resolveAssetUrl(item.imageUrl)} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className="text-[11px] font-medium text-gray-900 truncate">
            {item.name}
            {!item.available && <span className="text-[9px] text-red-500 ml-1">(Agotado)</span>}
          </span>
          {data.showPrices && (
            <span className="text-[11px] font-bold text-emerald-600 flex-shrink-0">
              {parseFloat(item.price).toFixed(2)}{currency}
            </span>
          )}
        </div>
        {data.showDescription && item.description && (
          <p className="text-[10px] text-gray-500 line-clamp-1">{item.description}</p>
        )}
        {data.showAllergens && item.allergens.length > 0 && (
          <div className="flex gap-0.5 mt-0.5">
            {item.allergens.map(a => (
              <span key={a} className="text-[9px]" title={ALLERGEN_MAP[a]?.label || a}>
                {ALLERGEN_MAP[a]?.emoji || '⚠️'}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderCategoryItems = (cat: MenuCategory) => (
    <div className="divide-y divide-gray-100 px-2">
      {cat.items.length === 0 ? (
        <p className="text-[10px] text-gray-400 py-2 text-center">Sin platos</p>
      ) : (
        cat.items.map(renderItem)
      )}
    </div>
  );

  return (
    <div className={`transition-all ${isSelected ? 'ring-2 ring-blue-500 rounded p-1' : ''}`}>
      <div className="bg-white rounded-lg overflow-hidden">
        {/* Header */}
        <div className="px-2 py-1.5 flex items-center gap-1.5" style={{ background: 'linear-gradient(to right, var(--af-color-primary, #d97706), var(--af-color-secondary, #f97316))' }}>
          <UtensilsCrossed size={13} className="text-white" />
          <span className="text-white text-xs font-bold">Carta</span>
        </div>

        {displayCats.length === 0 ? (
          <div className="p-6 text-center">
            <UtensilsCrossed size={28} className="mx-auto text-gray-300 mb-2" />
            <p className="text-xs text-gray-400">Añade categorías en el panel</p>
          </div>
        ) : data.layout === 'tabs' ? (
          /* ---- TABS ---- */
          <div>
            <div className="flex border-b border-gray-200 overflow-x-auto">
              {displayCats.map(cat => (
                <button
                  key={cat.id}
                  onClick={(e) => { e.stopPropagation(); setActiveTab(cat.id); }}
                  className={`px-2 py-1 text-[10px] font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === cat.id
                      ? ''
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                  style={activeTab === cat.id ? { borderColor: 'var(--af-color-primary, #f59e0b)', color: 'var(--af-color-primary, #d97706)' } : undefined}
                >
                  {cat.name}
                </button>
              ))}
            </div>
            {displayCats.filter(c => c.id === activeTab).map(cat => (
              <div key={cat.id} className="py-1">
                {renderCategoryItems(cat)}
              </div>
            ))}
          </div>
        ) : data.layout === 'scroll' ? (
          /* ---- SCROLL ---- */
          <div className="max-h-[350px] overflow-y-auto">
            {displayCats.map(cat => (
              <div key={cat.id} className="border-b border-gray-100 last:border-0">
                <div className="px-2 py-1.5 bg-gray-50">
                  <span className="text-[11px] font-bold text-gray-700">{cat.name}</span>
                  {cat.description && <p className="text-[9px] text-gray-400">{cat.description}</p>}
                </div>
                {renderCategoryItems(cat)}
              </div>
            ))}
          </div>
        ) : (
          /* ---- ACCORDION (default) ---- */
          <div className="max-h-[350px] overflow-y-auto">
            {displayCats.map(cat => (
              <div key={cat.id} className="border-b border-gray-100 last:border-0">
                <button
                  onClick={(e) => { e.stopPropagation(); toggleCat(cat.id); }}
                  className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    {data.showImages && cat.imageUrl && (
                      <img src={resolveAssetUrl(cat.imageUrl)} alt="" className="w-6 h-6 rounded object-cover" />
                    )}
                    <div className="text-left">
                      <span className="text-[11px] font-bold text-gray-700">{cat.name}</span>
                      <span className="text-[9px] text-gray-400 ml-1">({cat.items.length})</span>
                    </div>
                  </div>
                  {expandedCats.has(cat.id) ? <ChevronUp size={12} className="text-gray-400" /> : <ChevronDown size={12} className="text-gray-400" />}
                </button>
                {expandedCats.has(cat.id) && renderCategoryItems(cat)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ===== RUNTIME COMPONENT =====

const RuntimeComponent: React.FC<{ data: MenuRestaurantConfig }> = ({ data: _data }) => (
  <div className="p-4">
    <h2 className="text-lg font-bold mb-2">Carta del Restaurante</h2>
    <p className="text-sm text-gray-500">Contenido renderizado en la app generada.</p>
  </div>
);

// ===== SETTINGS PANEL =====

interface ItemForm {
  name: string;
  description: string;
  price: string;
  imageUrl: string;
  allergens: string[];
  available: boolean;
}

const emptyItemForm = (): ItemForm => ({
  name: '', description: '', price: '', imageUrl: '', allergens: [], available: true,
});

const SettingsPanel: React.FC<{ data: MenuRestaurantConfig; onChange: (d: MenuRestaurantConfig) => void }> = ({ data, onChange }) => {
  const [cats, setCats] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const token = useAuthStore((s) => s.token) ?? '';
  const [error, setError] = useState('');

  // Category editing
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catName, setCatName] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [expandedCatId, setExpandedCatId] = useState<string | null>(null);

  // Item editing
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState<ItemForm>(emptyItemForm());
  const [addingItemToCat, setAddingItemToCat] = useState<string | null>(null);

  const [showVisual, setShowVisual] = useState(true);

  const refresh = useCallback(async () => {
    if (!data.appId || !token) return;
    setLoading(true);
    try {
      const result = await getMenuCategories(data.appId, token);
      setCats(result);
    } catch { setError('Error al cargar menú'); }
    setLoading(false);
  }, [data.appId, token]);

  useEffect(() => { if (token) refresh(); }, [token, refresh]);

  const triggerRefresh = () => onChange({ ...data, _refreshKey: (data._refreshKey || 0) + 1 });

  // ---- Category CRUD ----
  const handleAddCategory = async () => {
    if (!newCatName.trim() || !data.appId) return;
    try {
      await createMenuCategory(data.appId, { name: newCatName.trim() }, token);
      setNewCatName('');
      await refresh();
      triggerRefresh();
    } catch { setError('Error al crear categoría'); }
  };

  const handleUpdateCategory = async (catId: string) => {
    if (!catName.trim() || !data.appId) return;
    try {
      await updateMenuCategory(data.appId, catId, { name: catName.trim() }, token);
      setEditingCatId(null);
      await refresh();
      triggerRefresh();
    } catch { setError('Error al actualizar categoría'); }
  };

  const handleDeleteCategory = async (catId: string) => {
    if (!data.appId) return;
    try {
      await deleteMenuCategory(data.appId, catId, token);
      await refresh();
      triggerRefresh();
    } catch { setError('Error al eliminar categoría'); }
  };

  const handleMoveCat = async (index: number, dir: -1 | 1) => {
    if (!data.appId) return;
    const newCats = [...cats];
    const [moved] = newCats.splice(index, 1);
    newCats.splice(index + dir, 0, moved);
    const items = newCats.map((c, i) => ({ id: c.id, order: i }));
    try {
      await reorderMenuCategories(data.appId, items, token);
      await refresh();
      triggerRefresh();
    } catch { setError('Error al reordenar'); }
  };

  // ---- Item CRUD ----
  const handleAddItem = async (catId: string) => {
    if (!itemForm.name.trim() || !itemForm.price || !data.appId) return;
    try {
      await createMenuItem(data.appId, catId, {
        name: itemForm.name.trim(),
        description: itemForm.description || undefined,
        price: parseFloat(itemForm.price),
        imageUrl: itemForm.imageUrl || undefined,
        allergens: itemForm.allergens,
        available: itemForm.available,
      }, token);
      setItemForm(emptyItemForm());
      setAddingItemToCat(null);
      await refresh();
      triggerRefresh();
    } catch { setError('Error al crear plato'); }
  };

  const handleUpdateItem = async (catId: string, itemId: string) => {
    if (!data.appId) return;
    try {
      await updateMenuItem(data.appId, catId, itemId, {
        name: itemForm.name.trim() || undefined,
        description: itemForm.description,
        price: itemForm.price ? parseFloat(itemForm.price) : undefined,
        imageUrl: itemForm.imageUrl || undefined,
        allergens: itemForm.allergens,
        available: itemForm.available,
      }, token);
      setEditingItemId(null);
      setItemForm(emptyItemForm());
      await refresh();
      triggerRefresh();
    } catch { setError('Error al actualizar plato'); }
  };

  const handleDeleteItem = async (catId: string, itemId: string) => {
    if (!data.appId) return;
    try {
      await deleteMenuItem(data.appId, catId, itemId, token);
      await refresh();
      triggerRefresh();
    } catch { setError('Error al eliminar plato'); }
  };

  const handleMoveItem = async (catId: string, items: MenuItemAPI[], index: number, dir: -1 | 1) => {
    if (!data.appId) return;
    const newItems = [...items];
    const [moved] = newItems.splice(index, 1);
    newItems.splice(index + dir, 0, moved);
    const reorder = newItems.map((it, i) => ({ id: it.id, order: i }));
    try {
      await reorderMenuItems(data.appId, catId, reorder, token);
      await refresh();
      triggerRefresh();
    } catch { setError('Error al reordenar'); }
  };

  const toggleAllergen = (a: string) => {
    setItemForm(prev => ({
      ...prev,
      allergens: prev.allergens.includes(a) ? prev.allergens.filter(x => x !== a) : [...prev.allergens, a],
    }));
  };

  const renderItemForm = (catId: string, isEditing: boolean) => (
    <div className="space-y-2 bg-gray-50 p-2 rounded border">
      <input
        type="text" placeholder="Nombre del plato *" value={itemForm.name}
        onChange={e => setItemForm(prev => ({ ...prev, name: e.target.value }))}
        className="w-full text-xs border rounded px-2 py-1"
      />
      <div className="flex gap-2">
        <input
          type="number" step="0.01" min="0" placeholder="Precio *" value={itemForm.price}
          onChange={e => setItemForm(prev => ({ ...prev, price: e.target.value }))}
          className="w-24 text-xs border rounded px-2 py-1"
        />
        <input
          type="text" placeholder="Descripción" value={itemForm.description}
          onChange={e => setItemForm(prev => ({ ...prev, description: e.target.value }))}
          className="flex-1 text-xs border rounded px-2 py-1"
        />
      </div>
      {/* Allergens */}
      <div>
        <p className="text-[10px] text-gray-500 mb-1">Alérgenos:</p>
        <div className="flex flex-wrap gap-1">
          {Object.entries(ALLERGEN_MAP).map(([key, val]) => (
            <button
              key={key}
              onClick={() => toggleAllergen(key)}
              className={`text-[10px] px-1.5 py-0.5 rounded-full border transition-colors ${
                itemForm.allergens.includes(key) ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-white border-gray-200 text-gray-500'
              }`}
            >
              {val.emoji} {val.label}
            </button>
          ))}
        </div>
      </div>
      {/* Image upload */}
      <ImageInputField
        value={itemForm.imageUrl}
        onChange={(url) => setItemForm(prev => ({ ...prev, imageUrl: url }))}
        accentColor="blue"
        shape="square"
        previewSize="sm"
        label="Imagen del plato"
        urlPlaceholder="URL (opcional)"
        maxSizeMB={10}
        onError={(msg) => setError(msg)}
      />
      {/* Available toggle */}
      <label className="flex items-center gap-1.5 text-[10px] text-gray-600">
        <input
          type="checkbox" checked={itemForm.available}
          onChange={e => setItemForm(prev => ({ ...prev, available: e.target.checked }))}
        />
        Disponible
      </label>
      {/* Actions */}
      <div className="flex gap-1">
        <button
          onClick={() => isEditing ? handleUpdateItem(catId, editingItemId!) : handleAddItem(catId)}
          disabled={!itemForm.name.trim() || !itemForm.price}
          className="flex items-center gap-1 bg-emerald-600 text-white text-[10px] px-2 py-1 rounded hover:bg-emerald-700 disabled:opacity-50"
        >
          <Save size={10} /> {isEditing ? 'Guardar' : 'Añadir'}
        </button>
        <button
          onClick={() => { setAddingItemToCat(null); setEditingItemId(null); setItemForm(emptyItemForm()); }}
          className="flex items-center gap-1 text-gray-500 text-[10px] px-2 py-1 rounded hover:bg-gray-100"
        >
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

      {/* Visual Config */}
      <button onClick={() => setShowVisual(!showVisual)} className="w-full flex items-center justify-between font-bold text-gray-700">
        Configuración Visual {showVisual ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {showVisual && (
        <div className="space-y-2 pl-1">
          <div>
            <label className="text-[10px] text-gray-500">Layout</label>
            <div className="flex gap-1 mt-0.5">
              {(['accordion', 'tabs', 'scroll'] as const).map(l => (
                <button
                  key={l}
                  onClick={() => onChange({ ...data, layout: l })}
                  className={`text-[10px] px-2 py-1 rounded border ${data.layout === l ? 'bg-amber-100 border-amber-300' : 'border-gray-200'}`}
                >
                  {l === 'accordion' ? 'Acordeón' : l === 'tabs' ? 'Pestañas' : 'Scroll'}
                </button>
              ))}
            </div>
          </div>
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
            ['showImages', 'Mostrar imágenes'],
            ['showPrices', 'Mostrar precios'],
            ['showAllergens', 'Mostrar alérgenos'],
            ['showDescription', 'Mostrar descripción'],
          ] as const).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-[11px]">
              <input
                type="checkbox"
                checked={data[key]}
                onChange={e => onChange({ ...data, [key]: e.target.checked })}
              />
              {label}
            </label>
          ))}
        </div>
      )}

      {/* Menu Management */}
      {data.appId ? (
        <>
          <div className="border-t pt-2">
            <span className="font-bold text-gray-700">Gestión del Menú</span>
            {loading && <span className="text-[10px] text-gray-400 ml-2">Cargando...</span>}
          </div>

          {/* Add Category */}
          <div className="flex gap-1">
            <input
              type="text" placeholder="Nueva categoría..." value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
              className="flex-1 text-xs border rounded px-2 py-1"
            />
            <button
              onClick={handleAddCategory}
              disabled={!newCatName.trim()}
              className="flex items-center gap-1 bg-amber-600 text-white text-[10px] px-2 py-1 rounded hover:bg-amber-700 disabled:opacity-50"
            >
              <Plus size={10} /> Categoría
            </button>
          </div>

          {/* Categories list */}
          {cats.map((cat, catIdx) => (
            <div key={cat.id} className="border rounded">
              {/* Category header */}
              <div className="flex items-center gap-1 px-2 py-1.5 bg-gray-50 border-b">
                <button onClick={() => setExpandedCatId(expandedCatId === cat.id ? null : cat.id)} className="flex-1 text-left">
                  <div className="flex items-center gap-1">
                    {expandedCatId === cat.id ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                    {editingCatId === cat.id ? (
                      <input
                        type="text" value={catName} autoFocus
                        onChange={e => setCatName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleUpdateCategory(cat.id)}
                        onClick={e => e.stopPropagation()}
                        className="text-xs border rounded px-1 py-0.5 w-32"
                      />
                    ) : (
                      <span className="text-[11px] font-semibold">{cat.name}</span>
                    )}
                    <span className="text-[9px] text-gray-400">({cat.items.length})</span>
                  </div>
                </button>
                <div className="flex gap-0.5">
                  {catIdx > 0 && (
                    <button onClick={() => handleMoveCat(catIdx, -1)} className="text-gray-400 hover:text-gray-600 p-0.5"><ArrowUp size={10} /></button>
                  )}
                  {catIdx < cats.length - 1 && (
                    <button onClick={() => handleMoveCat(catIdx, 1)} className="text-gray-400 hover:text-gray-600 p-0.5"><ArrowDown size={10} /></button>
                  )}
                  {editingCatId === cat.id ? (
                    <>
                      <button onClick={() => handleUpdateCategory(cat.id)} className="text-emerald-600 p-0.5"><Save size={10} /></button>
                      <button onClick={() => setEditingCatId(null)} className="text-gray-400 p-0.5"><X size={10} /></button>
                    </>
                  ) : (
                    <button onClick={() => { setEditingCatId(cat.id); setCatName(cat.name); }} className="text-blue-500 p-0.5"><Pencil size={10} /></button>
                  )}
                  <button onClick={() => handleDeleteCategory(cat.id)} className="text-red-400 hover:text-red-600 p-0.5"><Trash2 size={10} /></button>
                </div>
              </div>

              {/* Items */}
              {expandedCatId === cat.id && (
                <div className="p-2 space-y-1">
                  {cat.items.map((item, itemIdx) => (
                    <div key={item.id} className="flex items-center gap-1 py-1 border-b border-gray-50 last:border-0">
                      {item.imageUrl && <img src={resolveAssetUrl(item.imageUrl)} alt="" className="w-6 h-6 rounded object-cover" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-medium truncate">{item.name}</span>
                          <span className="text-[10px] text-emerald-600 font-bold ml-auto">{parseFloat(item.price).toFixed(2)}{data.currency}</span>
                        </div>
                        {item.allergens.length > 0 && (
                          <span className="text-[9px] text-gray-400">{item.allergens.map(a => ALLERGEN_MAP[a]?.emoji || '⚠️').join(' ')}</span>
                        )}
                      </div>
                      <div className="flex gap-0.5">
                        {itemIdx > 0 && <button onClick={() => handleMoveItem(cat.id, cat.items, itemIdx, -1)} className="text-gray-400 p-0.5"><ArrowUp size={9} /></button>}
                        {itemIdx < cat.items.length - 1 && <button onClick={() => handleMoveItem(cat.id, cat.items, itemIdx, 1)} className="text-gray-400 p-0.5"><ArrowDown size={9} /></button>}
                        <button
                          onClick={() => {
                            setEditingItemId(item.id);
                            setAddingItemToCat(cat.id);
                            setItemForm({
                              name: item.name,
                              description: item.description || '',
                              price: parseFloat(item.price).toString(),
                              imageUrl: item.imageUrl || '',
                              allergens: item.allergens,
                              available: item.available,
                            });
                          }}
                          className="text-blue-500 p-0.5"
                        ><Pencil size={9} /></button>
                        <button onClick={() => handleDeleteItem(cat.id, item.id)} className="text-red-400 p-0.5"><Trash2 size={9} /></button>
                      </div>
                    </div>
                  ))}

                  {/* Add/Edit item form */}
                  {addingItemToCat === cat.id ? (
                    renderItemForm(cat.id, !!editingItemId)
                  ) : (
                    <button
                      onClick={() => { setAddingItemToCat(cat.id); setEditingItemId(null); setItemForm(emptyItemForm()); }}
                      className="flex items-center gap-1 text-[10px] text-amber-600 hover:text-amber-700 mt-1"
                    >
                      <Plus size={10} /> Añadir plato
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </>
      ) : (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 text-[10px] p-2 rounded">
          Guarda la app primero para gestionar el menú.
        </div>
      )}
    </div>
  );
};

// ===== MODULE EXPORT =====

export const MenuRestaurantModule: ModuleDefinition<MenuRestaurantConfig> = {
  id: 'menu_restaurant',
  name: 'Carta / Menú',
  description: 'Carta digital de restaurante con categorías y platos',
  icon: <UtensilsCrossed size={20} />,
  schema: MenuRestaurantConfigSchema,
  defaultConfig: {
    layout: 'accordion',
    showImages: true,
    showPrices: true,
    showAllergens: true,
    showDescription: true,
    currency: '€',
  },
  PreviewComponent,
  RuntimeComponent,
  SettingsPanel,
};
