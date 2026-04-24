import React, { useState, useEffect, useCallback } from 'react';
import type { ModuleDefinition } from '../base/module.interface';
import { z } from 'zod';
import {
  Newspaper, Plus, Pencil, Trash2, Save, X,
  Image as ImageIcon, Video, ChevronDown, ChevronUp,
  ArrowLeft, ChevronLeft, ChevronRight, Share2, Check,
} from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import {
  uploadFile,
  getNewsArticles,
  createNewsArticle,
  updateNewsArticle,
  deleteNewsArticle,
  type NewsArticle,
} from '../../lib/api';
import { useAuthStore } from '../../store/useAuthStore';
import { resolveAssetUrl } from '../../lib/resolve-asset-url';

// --- Zod schema: configuración visual (se guarda en el JSON del canvas) ---
const NewsFeedConfigSchema = z.object({
  layout: z.enum(['list', 'cards']),
  itemsToShow: z.number().min(1).max(50),
  showImage: z.boolean(),
  showDate: z.boolean(),
  showExcerpt: z.boolean(),
  appId: z.string().optional(),
  _refreshKey: z.number().optional(), // Se incrementa al hacer CRUD para refrescar el preview
});

export type NewsFeedConfig = z.infer<typeof NewsFeedConfigSchema>;

// --- Helper: extraer embed URL de YouTube/Vimeo ---
function getEmbedUrl(url: string): string | null {
  // YouTube
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  );
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  // URL directa de video (mp4, webm)
  if (url.match(/\.(mp4|webm|ogg)(\?.*)?$/i)) return url;
  return null;
}

// --- Helper: quitar HTML tags para extracto ---
function stripHtml(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

// --- Preview: muestra datos REALES si hay appId, sino mockup ---
const MOCK_ARTICLES = [
  { title: 'Bienvenidos a nuestra app', content: 'Descubre todas las novedades y mantente al día...', date: '20 Mar 2026', hasImage: true, hasVideo: false },
  { title: 'Nuevo horario de atención', content: 'A partir del lunes cambiamos nuestro horario...', date: '18 Mar 2026', hasImage: false, hasVideo: false },
  { title: 'Promoción especial de marzo', content: 'Aprovecha nuestros descuentos exclusivos...', date: '15 Mar 2026', hasImage: true, hasVideo: false },
];

const PreviewComponent: React.FC<{ data: NewsFeedConfig; isSelected: boolean }> = ({ data, isSelected }) => {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [viewingIndex, setViewingIndex] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const token = useAuthStore((s) => s.token);
  const hasRealData = articles.length > 0;

  useEffect(() => {
    if (!data.appId || !token) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await getNewsArticles(data.appId!, token);
        if (!cancelled) setArticles(list);
      } catch {
        // fallback a mock
      }
    })();
    return () => { cancelled = true; };
  }, [data.appId, data._refreshKey, token]);

  // Al cambiar de artículos, resetear la vista si el index ya no es válido
  useEffect(() => {
    if (viewingIndex !== null && viewingIndex >= articles.length) {
      setViewingIndex(null);
    }
  }, [articles.length, viewingIndex]);

  const handleShare = async (article: NewsArticle) => {
    const text = `${article.title}\n\n${stripHtml(article.content).slice(0, 120)}...`;
    try {
      if (navigator.share) {
        await navigator.share({ title: article.title, text });
        return;
      }
    } catch { /* user cancelled or not supported */ }
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedId(article.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const isCards = data.layout === 'cards';
  const displayItems = hasRealData
    ? articles.slice(0, data.itemsToShow)
    : MOCK_ARTICLES.slice(0, Math.min(data.itemsToShow, 3));

  // ====== VISTA DETALLE ======
  if (viewingIndex !== null && hasRealData && articles[viewingIndex]) {
    const article = articles[viewingIndex];
    const embedUrl = article.videoUrl ? getEmbedUrl(article.videoUrl) : null;
    const hasPrev = viewingIndex > 0;
    const hasNext = viewingIndex < articles.length - 1;

    return (
      <div className={`transition-all ${isSelected ? 'ring-2 ring-blue-500 rounded bg-blue-50 p-1' : ''}`}>
        <div className="bg-white rounded-lg overflow-hidden">
          {/* Header con botón volver */}
          <div className="px-2 py-1.5 flex items-center gap-2" style={{ background: 'linear-gradient(to right, var(--af-color-primary, #f97316), var(--af-color-secondary, #f59e0b))' }}>
            <button
              onClick={(e) => { e.stopPropagation(); setViewingIndex(null); }}
              className="text-white hover:bg-white/20 rounded p-0.5 transition-colors"
            >
              <ArrowLeft size={14} />
            </button>
            <span className="text-white text-xs font-bold truncate flex-1">{article.title}</span>
            <button
              onClick={(e) => { e.stopPropagation(); handleShare(article); }}
              className="text-white hover:bg-white/20 rounded p-0.5 transition-colors flex items-center gap-1"
              title="Compartir"
            >
              {copiedId === article.id ? <><Check size={13} /><span className="text-[10px]">Copiado</span></> : <Share2 size={13} />}
            </button>
          </div>

          {/* Imagen de portada */}
          {article.imageUrl && (
            <img src={resolveAssetUrl(article.imageUrl)} alt="" className="w-full aspect-video object-cover" />
          )}

          {/* Contenido del artículo */}
          <div className="p-3">
            <h3 className="text-sm font-bold text-gray-900 leading-snug">{article.title}</h3>
            <p className="text-[10px] text-gray-400 mt-1">
              {new Date(article.publishedAt).toLocaleDateString('es-ES', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
              })}
            </p>
            <div
              className="mt-2 text-xs text-gray-700 leading-relaxed [&_h1]:text-base [&_h1]:font-bold [&_h1]:mb-1 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:mb-1 [&_h3]:text-xs [&_h3]:font-bold [&_p]:mb-1.5 [&_strong]:font-bold [&_em]:italic [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_a]:text-blue-600 [&_a]:underline"
              dangerouslySetInnerHTML={{ __html: article.content }}
            />
            {/* Video dentro del cuerpo del artículo */}
            {embedUrl && (
              <div className="mt-3 rounded-md overflow-hidden bg-black">
                {embedUrl.match(/\.(mp4|webm|ogg)/) ? (
                  <video src={embedUrl} controls className="w-full aspect-video" />
                ) : (
                  <iframe
                    src={embedUrl}
                    className="w-full aspect-video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title="Video"
                  />
                )}
              </div>
            )}
          </div>

          {/* Paginación anterior / siguiente */}
          <div className="border-t border-gray-100 px-2 py-1.5 flex items-center justify-between">
            <button
              onClick={(e) => { e.stopPropagation(); if (hasPrev) setViewingIndex(viewingIndex - 1); }}
              disabled={!hasPrev}
              className={`flex items-center gap-0.5 text-[10px] font-medium px-2 py-1 rounded transition-colors ${
                hasPrev ? 'text-orange-600 hover:bg-orange-50' : 'text-gray-300 cursor-not-allowed'
              }`}
            >
              <ChevronLeft size={12} /> Anterior
            </button>
            <span className="text-[9px] text-gray-400">{viewingIndex + 1} / {articles.length}</span>
            <button
              onClick={(e) => { e.stopPropagation(); if (hasNext) setViewingIndex(viewingIndex + 1); }}
              disabled={!hasNext}
              className={`flex items-center gap-0.5 text-[10px] font-medium px-2 py-1 rounded transition-colors ${
                hasNext ? 'text-orange-600 hover:bg-orange-50' : 'text-gray-300 cursor-not-allowed'
              }`}
            >
              Siguiente <ChevronRight size={12} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ====== VISTA LISTADO ======
  return (
    <div className={`transition-all ${isSelected ? 'ring-2 ring-blue-500 rounded bg-blue-50 p-1' : ''}`}>
      <div className="bg-white rounded-lg overflow-hidden">
        <div className="px-3 py-2 flex items-center justify-between" style={{ background: 'linear-gradient(to right, var(--af-color-primary, #f97316), var(--af-color-secondary, #f59e0b))' }}>
          <span className="text-white text-xs font-bold flex items-center gap-1">
            <Newspaper size={12} /> NOTICIAS
          </span>
          {hasRealData && (
            <span className="text-white/80 text-[9px]">{articles.length} artículo{articles.length !== 1 ? 's' : ''}</span>
          )}
        </div>
        <div className={isCards ? 'space-y-2 p-2' : 'divide-y divide-gray-100'}>
          {displayItems.map((item, i) => {
            const isReal = 'id' in item;
            const title = isReal ? (item as NewsArticle).title : (item as typeof MOCK_ARTICLES[0]).title;
            const excerpt = isReal
              ? stripHtml((item as NewsArticle).content).slice(0, 80)
              : (item as typeof MOCK_ARTICLES[0]).content;
            const date = isReal
              ? new Date((item as NewsArticle).publishedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
              : (item as typeof MOCK_ARTICLES[0]).date;
            const imgUrl = isReal ? (item as NewsArticle).imageUrl : null;
            const vidUrl = isReal ? (item as NewsArticle).videoUrl : null;
            const hasImg = isReal ? !!imgUrl : (item as typeof MOCK_ARTICLES[0]).hasImage;

            return (
              <div
                key={i}
                onClick={isReal ? (e) => { e.stopPropagation(); setViewingIndex(i); } : undefined}
                className={`${isCards ? 'bg-gray-50 rounded-lg overflow-hidden shadow-sm' : 'px-3 py-2'} ${
                  isReal ? 'cursor-pointer hover:bg-orange-50/50 transition-colors' : ''
                }`}
              >
                {data.showImage && hasImg && (
                  imgUrl ? (
                    <img src={resolveAssetUrl(imgUrl)} alt="" className={`object-cover ${isCards ? 'aspect-video w-full' : 'h-10 w-10 rounded float-left mr-2'}`} />
                  ) : (
                    <div className={`bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-gray-400 ${isCards ? 'aspect-video w-full' : 'h-10 w-10 rounded float-left mr-2'}`}>
                      <ImageIcon size={isCards ? 20 : 12} />
                    </div>
                  )
                )}
                <div className={isCards ? 'p-2' : ''}>
                  <p className="text-xs font-semibold text-gray-800 leading-tight">{title}</p>
                  {data.showExcerpt && (
                    <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{excerpt}</p>
                  )}
                  {data.showDate && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-[9px] text-gray-400">{date}</p>
                      {vidUrl && (
                        <span className="text-[8px] bg-purple-100 text-purple-600 px-1 py-0.5 rounded-full flex items-center gap-0.5 leading-none">
                          <Video size={8} /> Video
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="clear-both" />
              </div>
            );
          })}
        </div>
        {!hasRealData && (
          <p className="text-[9px] text-gray-300 text-center py-1 italic">Vista previa con datos de ejemplo</p>
        )}
      </div>
    </div>
  );
};

// --- Runtime: lo que renderizará la app Capacitor ---
const RuntimeComponent: React.FC<{ data: NewsFeedConfig }> = ({ data }) => (
  <div style={{ padding: '16px' }}>
    <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px' }}>Noticias</h2>
    <p style={{ color: '#888', fontSize: '14px' }}>
      Feed de noticias ({data.layout}) — {data.itemsToShow} artículos.
      Se renderizará dinámicamente en la app generada.
    </p>
  </div>
);

// --- Quill toolbar config ---
const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ align: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ color: [] }, { background: [] }],
    ['link'],
    ['clean'],
  ],
};

const QUILL_FORMATS = [
  'header', 'bold', 'italic', 'underline', 'strike',
  'align', 'list', 'color', 'background', 'link',
];

// --- Formulario de artículo con Quill + video ---
interface ArticleFormData {
  title: string;
  content: string;
  imageUrl: string;
  videoUrl: string;
}

const ArticleForm: React.FC<{
  initial?: ArticleFormData;
  onSave: (data: ArticleFormData) => Promise<void>;
  onCancel: () => void;
  token: string;
}> = ({ initial, onSave, onCancel, token }) => {
  const [form, setForm] = useState<ArticleFormData>(
    initial ?? { title: '', content: '', imageUrl: '', videoUrl: '' },
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const res = await uploadFile(file, token);
      setForm(f => ({ ...f, imageUrl: res.url }));
    } catch (err) {
      console.error(err);
      alert('Error al subir imagen');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      alert('El título es requerido');
      return;
    }
    if (!form.content.trim() || form.content === '<p><br></p>') {
      alert('El contenido es requerido');
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  // Previsualizar embed de video
  const embedUrl = form.videoUrl ? getEmbedUrl(form.videoUrl) : null;

  return (
    <div className="border border-blue-200 rounded-lg p-3 bg-blue-50/50 space-y-3">
      {/* Título */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">Título</label>
        <input
          type="text"
          placeholder="Título del artículo"
          className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:ring-blue-500 focus:border-blue-500"
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
        />
      </div>

      {/* Editor de contenido (Quill) */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">Contenido</label>
        <div className="bg-white rounded-md border border-gray-300 overflow-hidden [&_.ql-container]:min-h-[180px] [&_.ql-container]:text-sm [&_.ql-editor]:min-h-[180px]">
          <ReactQuill
            theme="snow"
            value={form.content}
            onChange={val => setForm(f => ({ ...f, content: val }))}
            modules={QUILL_MODULES}
            formats={QUILL_FORMATS}
            placeholder="Escribe el contenido del artículo..."
          />
        </div>
      </div>

      {/* Imagen */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">Imagen de portada (opcional)</label>
        {form.imageUrl && (
          <div className="relative mb-2">
            <img src={resolveAssetUrl(form.imageUrl)} alt="" className="w-full aspect-video object-cover rounded-md" />
            <button
              onClick={() => setForm(f => ({ ...f, imageUrl: '' }))}
              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5"
            >
              <X size={12} />
            </button>
          </div>
        )}
        {uploading ? (
          <p className="text-xs text-blue-600 py-2">Subiendo imagen...</p>
        ) : (
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="block w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 cursor-pointer"
          />
        )}
      </div>

      {/* Video */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">Video (opcional — YouTube, Vimeo o URL directa)</label>
        <input
          type="text"
          placeholder="https://youtube.com/watch?v=... o https://vimeo.com/..."
          className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:ring-blue-500 focus:border-blue-500"
          value={form.videoUrl}
          onChange={e => setForm(f => ({ ...f, videoUrl: e.target.value }))}
        />
        {embedUrl && (
          <div className="mt-2 rounded-md overflow-hidden border border-gray-200">
            {embedUrl.match(/\.(mp4|webm|ogg)/) ? (
              <video src={embedUrl} controls className="w-full aspect-video bg-black" />
            ) : (
              <iframe
                src={embedUrl}
                className="w-full aspect-video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Video preview"
              />
            )}
          </div>
        )}
      </div>

      {/* Botones */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <Save size={14} /> {saving ? 'Guardando...' : 'Guardar artículo'}
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1 px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-300 transition-colors"
        >
          <X size={14} /> Cancelar
        </button>
      </div>
    </div>
  );
};

// --- Settings Panel ---
const SettingsPanel: React.FC<{ data: NewsFeedConfig; onChange: (data: NewsFeedConfig) => void }> = ({ data, onChange }) => {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const token = useAuthStore((s) => s.token);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [configOpen, setConfigOpen] = useState(true);

  const loadArticles = useCallback(async () => {
    if (!data.appId || !token) return;
    try {
      setLoading(true);
      const list = await getNewsArticles(data.appId, token);
      setArticles(list);
    } catch (err) {
      console.error('Error cargando artículos:', err);
    } finally {
      setLoading(false);
    }
  }, [data.appId, token]);

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  // Notifica al PreviewComponent que recargue artículos
  const refreshPreview = () => {
    onChange({ ...data, _refreshKey: (data._refreshKey ?? 0) + 1 });
  };

  const handleCreate = async (formData: ArticleFormData) => {
    if (!data.appId || !token) return;
    await createNewsArticle(
      data.appId,
      {
        title: formData.title,
        content: formData.content,
        imageUrl: formData.imageUrl || undefined,
        videoUrl: formData.videoUrl || undefined,
      },
      token,
    );
    setShowForm(false);
    await loadArticles();
    refreshPreview();
  };

  const handleUpdate = async (articleId: string, formData: ArticleFormData) => {
    if (!data.appId || !token) return;
    await updateNewsArticle(
      data.appId,
      articleId,
      {
        title: formData.title,
        content: formData.content,
        imageUrl: formData.imageUrl || undefined,
        videoUrl: formData.videoUrl || undefined,
      },
      token,
    );
    setEditingId(null);
    await loadArticles();
    refreshPreview();
  };

  const handleDelete = async (articleId: string) => {
    if (!data.appId || !confirm('¿Eliminar este artículo?') || !token) return;
    await deleteNewsArticle(data.appId, articleId, token);
    await loadArticles();
    refreshPreview();
  };

  return (
    <div className="space-y-4">
      {/* --- Sección 1: Configuración visual (colapsable) --- */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <button
          onClick={() => setConfigOpen(o => !o)}
          className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <span className="text-sm font-bold text-gray-800">Configuración Visual</span>
          {configOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {configOpen && (
          <div className="p-3 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Diseño</label>
              <select
                className="w-full border border-gray-300 rounded-md p-2 text-sm"
                value={data.layout}
                onChange={e => onChange({ ...data, layout: e.target.value as 'list' | 'cards' })}
              >
                <option value="cards">Tarjetas (Cards)</option>
                <option value="list">Lista</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Artículos a mostrar</label>
              <input
                type="number"
                min={1}
                max={50}
                className="w-full border border-gray-300 rounded-md p-2 text-sm"
                value={data.itemsToShow}
                onChange={e => onChange({ ...data, itemsToShow: parseInt(e.target.value) || 5 })}
              />
            </div>
            <div className="space-y-2">
              {([
                ['showImage', 'Mostrar imagen'],
                ['showDate', 'Mostrar fecha'],
                ['showExcerpt', 'Mostrar extracto'],
              ] as const).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={data[key]}
                    onChange={e => onChange({ ...data, [key]: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* --- Sección 2: Gestión de artículos --- */}
      <div>
        <h3 className="text-sm font-bold text-gray-800 mb-3">Gestión de Artículos</h3>

        {!data.appId ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
            <p className="text-sm text-amber-700 font-medium">
              Guarda la app primero para gestionar artículos
            </p>
            <p className="text-xs text-amber-600 mt-1">
              Haz clic en "Guardar Cambios" en la barra superior
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Botón agregar */}
            {!showForm && !editingId && (
              <button
                onClick={() => setShowForm(true)}
                className="w-full flex items-center justify-center gap-1 px-3 py-2.5 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
              >
                <Plus size={14} /> Agregar Artículo
              </button>
            )}

            {/* Formulario de creación */}
            {showForm && token && (
              <ArticleForm
                onSave={handleCreate}
                onCancel={() => setShowForm(false)}
                token={token}
              />
            )}

            {/* Lista de artículos */}
            {loading ? (
              <p className="text-sm text-gray-500 text-center py-4">Cargando artículos...</p>
            ) : articles.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No hay artículos aún</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {articles.map(article => (
                  <div key={article.id} className="border border-gray-200 rounded-lg bg-white overflow-hidden">
                    {editingId === article.id && token ? (
                      <div className="p-2">
                        <ArticleForm
                          initial={{
                            title: article.title,
                            content: article.content,
                            imageUrl: article.imageUrl ?? '',
                            videoUrl: article.videoUrl ?? '',
                          }}
                          onSave={formData => handleUpdate(article.id, formData)}
                          onCancel={() => setEditingId(null)}
                          token={token}
                        />
                      </div>
                    ) : (
                      <div className="p-3">
                        <div className="flex items-start gap-3">
                          {article.imageUrl && (
                            <img src={resolveAssetUrl(article.imageUrl)} alt="" className="w-14 h-14 object-cover rounded-md shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{article.title}</p>
                            <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{stripHtml(article.content)}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-[10px] text-gray-400">
                                {new Date(article.publishedAt).toLocaleDateString('es-ES')}
                              </p>
                              {article.videoUrl && (
                                <span className="text-[10px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                  <Video size={9} /> Video
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1 shrink-0">
                            <button
                              onClick={() => setEditingId(article.id)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                              title="Editar"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(article.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Contador */}
            {articles.length > 0 && (
              <p className="text-xs text-gray-400 text-center">
                {articles.length} artículo{articles.length !== 1 ? 's' : ''} en total
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// --- Definición del módulo ---
export const NewsFeedModule: ModuleDefinition<NewsFeedConfig> = {
  id: 'news_feed',
  name: 'Noticias',
  description: 'Feed de noticias y blog con artículos',
  icon: <Newspaper size={20} />,
  schema: NewsFeedConfigSchema,
  defaultConfig: {
    layout: 'cards',
    itemsToShow: 5,
    showImage: true,
    showDate: true,
    showExcerpt: true,
    appId: undefined,
    _refreshKey: 0,
  },
  PreviewComponent,
  RuntimeComponent,
  SettingsPanel,
};
