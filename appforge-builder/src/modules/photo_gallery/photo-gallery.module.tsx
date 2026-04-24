import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { ModuleDefinition } from '../base/module.interface';
import { z } from 'zod';
import {
  Camera, Plus, Trash2, Save, X,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  ArrowUp, ArrowDown, Loader2, ImageIcon,
} from 'lucide-react';
import {
  uploadFile,
  getGalleryItems,
  createGalleryItem,
  updateGalleryItem,
  deleteGalleryItem,
  reorderGalleryItems,
  type GalleryItem,
} from '../../lib/api';
import { useAuthStore } from '../../store/useAuthStore';
import { resolveAssetUrl } from '../../lib/resolve-asset-url';

// --- Zod schema ---
const PhotoGalleryConfigSchema = z.object({
  title: z.string().default('Galería'),
  columns: z.number().min(1).max(4),
  gap: z.number(),
  showTitles: z.boolean(),
  enableLightbox: z.boolean(),
  appId: z.string().optional(),
  _refreshKey: z.number().optional(),
});

export type PhotoGalleryConfig = z.infer<typeof PhotoGalleryConfigSchema>;

// --- Mock data for preview without real data ---
const MOCK_PHOTOS = [
  { id: '1', color: 'from-pink-200 to-purple-200' },
  { id: '2', color: 'from-blue-200 to-cyan-200' },
  { id: '3', color: 'from-green-200 to-emerald-200' },
  { id: '4', color: 'from-amber-200 to-orange-200' },
  { id: '5', color: 'from-red-200 to-pink-200' },
  { id: '6', color: 'from-indigo-200 to-blue-200' },
];

// --- Preview Component ---
const PreviewComponent: React.FC<{ data: PhotoGalleryConfig; isSelected: boolean }> = ({ data, isSelected }) => {
  const [photos, setPhotos] = useState<GalleryItem[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const token = useAuthStore((s) => s.token);
  const hasRealData = photos.length > 0;

  useEffect(() => {
    if (!data.appId || !token) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await getGalleryItems(data.appId!, token);
        if (!cancelled) setPhotos(list);
      } catch {
        // fallback to mock
      }
    })();
    return () => { cancelled = true; };
  }, [data.appId, data._refreshKey, token]);

  const cols = data.columns;
  const gapClass = data.gap <= 2 ? 'gap-0.5' : data.gap <= 4 ? 'gap-1' : data.gap <= 6 ? 'gap-1.5' : 'gap-2';

  // ====== LIGHTBOX ======
  if (lightboxIndex !== null && data.enableLightbox && hasRealData && photos[lightboxIndex]) {
    const photo = photos[lightboxIndex];
    const hasPrev = lightboxIndex > 0;
    const hasNext = lightboxIndex < photos.length - 1;

    return (
      <div className={`transition-all ${isSelected ? 'ring-2 ring-blue-500 rounded bg-blue-50 p-1' : ''}`}>
        <div className="bg-black rounded-lg overflow-hidden relative" style={{ minHeight: '280px' }}>
          {/* Close button */}
          <button
            onClick={(e) => { e.stopPropagation(); setLightboxIndex(null); }}
            className="absolute top-2 right-2 z-10 bg-black/50 text-white rounded-full p-1 hover:bg-black/70 transition-colors"
          >
            <X size={14} />
          </button>

          {/* Image */}
          <div className="flex items-center justify-center p-2" style={{ minHeight: '200px' }}>
            <img
              src={resolveAssetUrl(photo.imageUrl)}
              alt={photo.title ?? ''}
              className="max-w-full max-h-[200px] object-contain rounded"
            />
          </div>

          {/* Caption */}
          {(photo.title || photo.description) && (
            <div className="px-3 pb-2">
              {photo.title && (
                <p className="text-white text-xs font-semibold">{photo.title}</p>
              )}
              {photo.description && (
                <p className="text-gray-300 text-[10px] mt-0.5">{photo.description}</p>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between px-2 pb-2">
            <button
              onClick={(e) => { e.stopPropagation(); if (hasPrev) setLightboxIndex(lightboxIndex - 1); }}
              disabled={!hasPrev}
              className={`flex items-center gap-0.5 text-[10px] font-medium px-2 py-1 rounded transition-colors ${
                hasPrev ? 'text-white hover:bg-white/20' : 'text-gray-600 cursor-not-allowed'
              }`}
            >
              <ChevronLeft size={12} /> Anterior
            </button>
            <span className="text-[9px] text-gray-400">{lightboxIndex + 1} / {photos.length}</span>
            <button
              onClick={(e) => { e.stopPropagation(); if (hasNext) setLightboxIndex(lightboxIndex + 1); }}
              disabled={!hasNext}
              className={`flex items-center gap-0.5 text-[10px] font-medium px-2 py-1 rounded transition-colors ${
                hasNext ? 'text-white hover:bg-white/20' : 'text-gray-600 cursor-not-allowed'
              }`}
            >
              Siguiente <ChevronRight size={12} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ====== GRID VIEW ======
  return (
    <div className={`transition-all ${isSelected ? 'ring-2 ring-blue-500 rounded bg-blue-50 p-1' : ''}`}>
      <div className="bg-white rounded-lg overflow-hidden">
        {/* Header */}
        <div className="px-3 py-2 flex items-center justify-between" style={{ background: 'linear-gradient(to right, var(--af-color-primary, #8b5cf6), var(--af-color-secondary, #a855f7))' }}>
          <span className="text-white text-xs font-bold flex items-center gap-1">
            <Camera size={12} /> {data.title || 'GALERÍA'}
          </span>
          {hasRealData && (
            <span className="text-white/80 text-[9px]">{photos.length} foto{photos.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        {/* Grid */}
        <div className={`p-2 grid ${gapClass}`} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {hasRealData ? (
            photos.map((photo, i) => (
              <div
                key={photo.id}
                className={`relative group ${data.enableLightbox ? 'cursor-pointer' : ''}`}
                onClick={data.enableLightbox ? (e) => { e.stopPropagation(); setLightboxIndex(i); } : undefined}
              >
                <img
                  src={resolveAssetUrl(photo.imageUrl)}
                  alt={photo.title ?? ''}
                  className="w-full aspect-square object-cover rounded"
                />
                {data.showTitles && photo.title && (
                  <p className="text-[8px] text-gray-600 mt-0.5 truncate px-0.5 leading-tight">{photo.title}</p>
                )}
                {data.enableLightbox && (
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded transition-colors" />
                )}
              </div>
            ))
          ) : (
            MOCK_PHOTOS.map((mock) => (
              <div key={mock.id}>
                <div className={`w-full aspect-square rounded bg-gradient-to-br ${mock.color} flex items-center justify-center`}>
                  <ImageIcon size={cols <= 2 ? 16 : 12} className="text-white/60" />
                </div>
                {data.showTitles && (
                  <div className="h-2 bg-gray-200 rounded mt-0.5 mx-0.5" />
                )}
              </div>
            ))
          )}
        </div>

        {!hasRealData && (
          <p className="text-[9px] text-gray-300 text-center pb-2 italic">Vista previa con datos de ejemplo</p>
        )}
      </div>
    </div>
  );
};

// --- Runtime Component ---
const RuntimeComponent: React.FC<{ data: PhotoGalleryConfig }> = ({ data }) => (
  <div style={{ padding: '16px' }}>
    <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px' }}>Galería de Fotos</h2>
    <p style={{ color: '#888', fontSize: '14px' }}>
      Galería ({data.columns} columnas) con lightbox {data.enableLightbox ? 'activado' : 'desactivado'}.
      Se renderizará dinámicamente en la app generada.
    </p>
  </div>
);

// --- Inline photo editor ---
const PhotoEditor: React.FC<{
  photo: GalleryItem;
  onSave: (title: string, description: string) => Promise<void>;
  onCancel: () => void;
}> = ({ photo, onSave, onCancel }) => {
  const [title, setTitle] = useState(photo.title ?? '');
  const [description, setDescription] = useState(photo.description ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(title, description);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-2 space-y-2 bg-blue-50 rounded-md">
      <input
        type="text"
        placeholder="Título (opcional)"
        value={title}
        onChange={e => setTitle(e.target.value)}
        className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-blue-500 focus:border-blue-500"
      />
      <textarea
        placeholder="Descripción (opcional)"
        value={description}
        onChange={e => setDescription(e.target.value)}
        rows={2}
        className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-blue-500 focus:border-blue-500 resize-none"
      />
      <div className="flex gap-1">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
        >
          <Save size={10} /> {saving ? '...' : 'Guardar'}
        </button>
        <button onClick={onCancel} className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300">
          <X size={10} />
        </button>
      </div>
    </div>
  );
};

// --- Settings Panel ---
const SettingsPanel: React.FC<{ data: PhotoGalleryConfig; onChange: (data: PhotoGalleryConfig) => void }> = ({ data, onChange }) => {
  const [photos, setPhotos] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const token = useAuthStore((s) => s.token);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [configOpen, setConfigOpen] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadPhotos = useCallback(async () => {
    if (!data.appId || !token) return;
    try {
      setLoading(true);
      const list = await getGalleryItems(data.appId, token);
      setPhotos(list);
    } catch (err) {
      console.error('Error cargando galería:', err);
    } finally {
      setLoading(false);
    }
  }, [data.appId, token]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  const refreshPreview = () => {
    onChange({ ...data, _refreshKey: (data._refreshKey ?? 0) + 1 });
  };

  // --- Batch upload ---
  const handleBatchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !data.appId || !token) return;

    try {
      setUploading(true);
      const total = files.length;

      for (let i = 0; i < total; i++) {
        setUploadProgress(`Subiendo ${i + 1} de ${total}...`);
        const res = await uploadFile(files[i], token);
        await createGalleryItem(data.appId, { imageUrl: res.url, title: files[i].name.replace(/\.[^.]+$/, '') }, token);
      }

      setUploadProgress('');
      await loadPhotos();
      refreshPreview();
    } catch (err) {
      console.error('Error subiendo fotos:', err);
      alert('Error al subir una o más fotos');
    } finally {
      setUploading(false);
      setUploadProgress('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // --- Update photo metadata ---
  const handleUpdatePhoto = async (photoId: string, title: string, description: string) => {
    if (!data.appId || !token) return;
    await updateGalleryItem(data.appId, photoId, { title, description }, token);
    setEditingId(null);
    await loadPhotos();
    refreshPreview();
  };

  // --- Delete photo ---
  const handleDeletePhoto = async (photoId: string) => {
    if (!data.appId || !confirm('¿Eliminar esta foto?') || !token) return;
    await deleteGalleryItem(data.appId, photoId, token);
    await loadPhotos();
    refreshPreview();
  };

  // --- Reorder ---
  const handleMoveUp = async (index: number) => {
    if (index <= 0 || !data.appId || !token) return;
    const newPhotos = [...photos];
    [newPhotos[index - 1], newPhotos[index]] = [newPhotos[index], newPhotos[index - 1]];
    const items = newPhotos.map((p, i) => ({ id: p.id, order: i }));
    await reorderGalleryItems(data.appId, items, token);
    await loadPhotos();
    refreshPreview();
  };

  const handleMoveDown = async (index: number) => {
    if (index >= photos.length - 1 || !data.appId || !token) return;
    const newPhotos = [...photos];
    [newPhotos[index], newPhotos[index + 1]] = [newPhotos[index + 1], newPhotos[index]];
    const items = newPhotos.map((p, i) => ({ id: p.id, order: i }));
    await reorderGalleryItems(data.appId, items, token);
    await loadPhotos();
    refreshPreview();
  };

  return (
    <div className="space-y-4">
      {/* --- Section 1: Gallery Configuration --- */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <button
          onClick={() => setConfigOpen(o => !o)}
          className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <span className="text-sm font-bold text-gray-800">Configuración de Galería</span>
          {configOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {configOpen && (
          <div className="p-3 space-y-3">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título de la galería</label>
              <input
                type="text"
                value={data.title ?? ''}
                onChange={e => onChange({ ...data, title: e.target.value })}
                placeholder="Galería"
                className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm focus:ring-violet-500 focus:border-violet-500"
              />
            </div>

            {/* Columns */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Columnas</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4].map(n => (
                  <button
                    key={n}
                    onClick={() => onChange({ ...data, columns: n })}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      data.columns === n
                        ? 'bg-violet-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Gap */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Espaciado</label>
              <div className="flex gap-1">
                {[
                  { value: 2, label: 'Mínimo' },
                  { value: 4, label: 'Normal' },
                  { value: 6, label: 'Amplio' },
                  { value: 8, label: 'Máximo' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => onChange({ ...data, gap: opt.value })}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      data.gap === opt.value
                        ? 'bg-violet-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.showTitles}
                  onChange={e => onChange({ ...data, showTitles: e.target.checked })}
                  className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                />
                Mostrar títulos
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.enableLightbox}
                  onChange={e => onChange({ ...data, enableLightbox: e.target.checked })}
                  className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                />
                Lightbox (ver foto completa al hacer clic)
              </label>
            </div>
          </div>
        )}
      </div>

      {/* --- Section 2: Photo Management --- */}
      <div>
        <h3 className="text-sm font-bold text-gray-800 mb-3">Gestión de Fotos</h3>

        {!data.appId ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
            <p className="text-sm text-amber-700 font-medium">
              Guarda la app primero para subir fotos
            </p>
            <p className="text-xs text-amber-600 mt-1">
              Haz clic en "Guardar Cambios" en la barra superior
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Upload button */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleBatchUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full flex items-center justify-center gap-1 px-3 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-md hover:bg-violet-700 disabled:opacity-50 transition-colors"
              >
                {uploading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> {uploadProgress || 'Subiendo...'}
                  </>
                ) : (
                  <>
                    <Plus size={14} /> Subir Fotos
                  </>
                )}
              </button>
            </div>

            {/* Photo list */}
            {loading ? (
              <p className="text-sm text-gray-500 text-center py-4">Cargando galería...</p>
            ) : photos.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No hay fotos aún</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {photos.map((photo, index) => (
                  <div key={photo.id} className="border border-gray-200 rounded-lg bg-white overflow-hidden">
                    {editingId === photo.id ? (
                      <PhotoEditor
                        photo={photo}
                        onSave={(title, description) => handleUpdatePhoto(photo.id, title, description)}
                        onCancel={() => setEditingId(null)}
                      />
                    ) : (
                      <div className="p-2 flex items-center gap-2">
                        {/* Thumbnail */}
                        <img
                          src={resolveAssetUrl(photo.imageUrl)}
                          alt={photo.title ?? ''}
                          className="w-14 h-14 object-cover rounded shrink-0"
                        />

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-800 truncate">
                            {photo.title || 'Sin título'}
                          </p>
                          {photo.description && (
                            <p className="text-[10px] text-gray-500 truncate">{photo.description}</p>
                          )}
                          <p className="text-[9px] text-gray-400 mt-0.5">
                            Orden: {photo.order}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-0.5 shrink-0">
                          <button
                            onClick={() => handleMoveUp(index)}
                            disabled={index === 0}
                            className={`p-1 rounded transition-colors ${
                              index === 0 ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-100'
                            }`}
                            title="Mover arriba"
                          >
                            <ArrowUp size={12} />
                          </button>
                          <button
                            onClick={() => handleMoveDown(index)}
                            disabled={index === photos.length - 1}
                            className={`p-1 rounded transition-colors ${
                              index === photos.length - 1 ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-100'
                            }`}
                            title="Mover abajo"
                          >
                            <ArrowDown size={12} />
                          </button>
                        </div>
                        <div className="flex flex-col gap-0.5 shrink-0">
                          <button
                            onClick={() => setEditingId(photo.id)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Editar"
                          >
                            <Save size={12} />
                          </button>
                          <button
                            onClick={() => handleDeletePhoto(photo.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Counter */}
            {photos.length > 0 && (
              <p className="text-xs text-gray-400 text-center">
                {photos.length} foto{photos.length !== 1 ? 's' : ''} en total
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// --- Module Definition ---
export const PhotoGalleryModule: ModuleDefinition<PhotoGalleryConfig> = {
  id: 'photo_gallery',
  name: 'Galería de Fotos',
  description: 'Galería de imágenes con grid y lightbox',
  icon: <Camera size={20} />,
  schema: PhotoGalleryConfigSchema,
  defaultConfig: {
    title: 'Galería',
    columns: 2,
    gap: 4,
    showTitles: true,
    enableLightbox: true,
    appId: undefined,
    _refreshKey: 0,
  },
  PreviewComponent,
  RuntimeComponent,
  SettingsPanel,
};
