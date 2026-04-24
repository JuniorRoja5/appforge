import React, { useState, useEffect, useCallback } from 'react';
import type { ModuleDefinition } from '../base/module.interface';
import { z } from 'zod';
import {
  Calendar, Plus, Pencil, Trash2, Save, X,
  ChevronDown, ChevronUp,
  ArrowLeft, ChevronLeft, ChevronRight, MapPin, Clock,
  Ticket, User, Mail, Share2, Tag, Check,
} from 'lucide-react';
import {
  uploadFile,
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  type AppEvent,
} from '../../lib/api';
import { useAuthStore } from '../../store/useAuthStore';
import { resolveAssetUrl } from '../../lib/resolve-asset-url';

// --- Zod schema ---
const EventsConfigSchema = z.object({
  layout: z.enum(['list', 'cards']),
  itemsToShow: z.number().min(1).max(50),
  showImage: z.boolean(),
  showLocation: z.boolean(),
  showDescription: z.boolean(),
  appId: z.string().optional(),
  _refreshKey: z.number().optional(),
});

export type EventsConfig = z.infer<typeof EventsConfigSchema>;

// --- Constants ---
const EVENT_CATEGORIES = [
  'Música', 'Deporte', 'Gastronomía', 'Taller', 'Conferencia',
  'Networking', 'Fiesta', 'Cultura', 'Infantil', 'Otro',
];

const CATEGORY_COLORS: Record<string, string> = {
  'Música': 'bg-purple-100 text-purple-700',
  'Deporte': 'bg-green-100 text-green-700',
  'Gastronomía': 'bg-orange-100 text-orange-700',
  'Taller': 'bg-blue-100 text-blue-700',
  'Conferencia': 'bg-indigo-100 text-indigo-700',
  'Networking': 'bg-cyan-100 text-cyan-700',
  'Fiesta': 'bg-pink-100 text-pink-700',
  'Cultura': 'bg-amber-100 text-amber-700',
  'Infantil': 'bg-yellow-100 text-yellow-700',
  'Otro': 'bg-gray-100 text-gray-700',
};

// --- Helpers ---
function formatDate(dateStr: string): { day: string; month: string; time: string; full: string } {
  const d = new Date(dateStr);
  return {
    day: d.getDate().toString(),
    month: d.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase(),
    time: d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
    full: d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
  };
}

function nowLocalISO(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function toInputDate(dateStr: string): string {
  const d = new Date(dateStr);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function getGoogleMapsEmbedUrl(location: string): string {
  return `https://maps.google.com/maps?q=${encodeURIComponent(location)}&output=embed&z=15`;
}

// --- Mock data ---
const MOCK_EVENTS = [
  { title: 'Fiesta de inauguración', location: 'Sala Principal', date: '25 MAR', time: '20:00', category: 'Fiesta', price: '15€' },
  { title: 'Taller de cocina italiana', location: 'Cocina Central', date: '28 MAR', time: '10:00', category: 'Gastronomía', price: 'Gratis' },
  { title: 'Concierto acústico', location: 'Terraza', date: '02 ABR', time: '19:30', category: 'Música', price: '25€' },
];

// --- Preview Component ---
const PreviewComponent: React.FC<{ data: EventsConfig; isSelected: boolean }> = ({ data, isSelected }) => {
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [viewingIndex, setViewingIndex] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const token = useAuthStore((s) => s.token);
  const hasRealData = events.length > 0;

  useEffect(() => {
    if (!data.appId || !token) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await getEvents(data.appId!, token);
        if (!cancelled) setEvents(list);
      } catch { /* fallback to mock */ }
    })();
    return () => { cancelled = true; };
  }, [data.appId, data._refreshKey, token]);

  useEffect(() => {
    if (viewingIndex !== null && viewingIndex >= events.length) setViewingIndex(null);
  }, [events.length, viewingIndex]);

  const handleShare = async (event: AppEvent) => {
    const text = `${event.title}\n📅 ${formatDate(event.eventDate).full}${event.location ? `\n📍 ${event.location}` : ''}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: event.title, text });
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
    setCopiedId(event.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const isCards = data.layout === 'cards';
  const displayItems = hasRealData
    ? events.slice(0, data.itemsToShow)
    : MOCK_EVENTS.slice(0, Math.min(data.itemsToShow, 3));

  // ====== DETAIL VIEW ======
  if (viewingIndex !== null && hasRealData && events[viewingIndex]) {
    const event = events[viewingIndex];
    const dt = formatDate(event.eventDate);
    const hasPrev = viewingIndex > 0;
    const hasNext = viewingIndex < events.length - 1;
    const catColor = event.category ? (CATEGORY_COLORS[event.category] || CATEGORY_COLORS['Otro']) : '';

    return (
      <div className={`transition-all ${isSelected ? 'ring-2 ring-blue-500 rounded p-1' : ''}`}>
        <div className="bg-white rounded-lg overflow-hidden">
          {/* Header */}
          <div className="px-2 py-1.5 flex items-center gap-2" style={{ background: 'linear-gradient(to right, var(--af-color-primary, #14b8a6), var(--af-color-secondary, #10b981))' }}>
            <button
              onClick={(e) => { e.stopPropagation(); setViewingIndex(null); }}
              className="text-white hover:bg-white/20 rounded p-0.5 transition-colors"
            >
              <ArrowLeft size={14} />
            </button>
            <span className="text-white text-xs font-bold truncate flex-1">{event.title}</span>
            <button
              onClick={(e) => { e.stopPropagation(); handleShare(event); }}
              className="text-white hover:bg-white/20 rounded p-0.5 transition-colors flex items-center gap-1"
              title="Compartir"
            >
              {copiedId === event.id ? <><Check size={13} /><span className="text-[10px]">Copiado</span></> : <Share2 size={13} />}
            </button>
          </div>

          {/* Image */}
          {event.imageUrl && (
            <img src={resolveAssetUrl(event.imageUrl)} alt="" className="w-full aspect-video object-cover" />
          )}

          {/* Content */}
          <div className="p-3 space-y-2">
            {/* Category + Price badges */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {event.category && (
                <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${catColor}`}>
                  {event.category}
                </span>
              )}
              {event.price && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                  event.price.toLowerCase() === 'gratis' ? 'bg-green-100 text-green-700' : 'bg-teal-100 text-teal-700'
                }`}>
                  {event.price}
                </span>
              )}
            </div>

            <h3 className="text-sm font-bold text-gray-900">{event.title}</h3>

            {/* Date & time */}
            <div className="flex items-center gap-1.5 text-teal-600">
              <Calendar size={12} />
              <span className="text-xs font-medium">
                {dt.full}
                {event.eventEndDate && ` — ${formatDate(event.eventEndDate).full}`}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-teal-600">
              <Clock size={12} />
              <span className="text-xs">{dt.time}
                {event.eventEndDate && ` — ${formatDate(event.eventEndDate).time}`}
              </span>
            </div>

            {/* Location */}
            {event.location && (
              <div className="flex items-center gap-1.5 text-gray-500">
                <MapPin size={12} />
                <span className="text-xs">{event.location}</span>
              </div>
            )}

            {/* Organizer */}
            {event.organizer && (
              <div className="flex items-center gap-1.5 text-gray-500">
                <User size={12} />
                <span className="text-xs">Organiza: {event.organizer}</span>
              </div>
            )}

            {/* Contact */}
            {event.contactInfo && (
              <div className="flex items-center gap-1.5 text-gray-500">
                <Mail size={12} />
                <span className="text-xs">{event.contactInfo}</span>
              </div>
            )}

            {/* Description */}
            {event.description && (
              <p className="text-xs text-gray-700 leading-relaxed break-words">{event.description}</p>
            )}

            {/* Map */}
            {event.location && (
              <div className="rounded-md overflow-hidden border border-gray-200 mt-1">
                <iframe
                  src={getGoogleMapsEmbedUrl(event.location)}
                  className="w-full h-[120px] border-0"
                  loading="lazy"
                  title="Mapa"
                />
              </div>
            )}

            {/* Ticket button */}
            {event.ticketUrl && (
              <a
                href={event.ticketUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="flex items-center justify-center gap-1.5 w-full py-2 text-white text-xs font-bold rounded-lg transition-colors"
                style={{ backgroundColor: 'var(--af-color-primary, #0d9488)', borderRadius: 'var(--af-radius-button, 8px)' }}
              >
                <Ticket size={14} />
                {event.ticketLabel || 'Comprar entradas'}
                {event.price && event.price.toLowerCase() !== 'gratis' && (
                  <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px]">{event.price}</span>
                )}
              </a>
            )}
          </div>

          {/* Pagination */}
          <div className="border-t border-gray-100 px-2 py-1.5 flex items-center justify-between">
            <button
              onClick={(e) => { e.stopPropagation(); if (hasPrev) setViewingIndex(viewingIndex - 1); }}
              disabled={!hasPrev}
              className={`flex items-center gap-0.5 text-[10px] font-medium px-2 py-1 rounded transition-colors ${hasPrev ? 'text-teal-600 hover:bg-teal-50' : 'text-gray-300 cursor-not-allowed'}`}
            >
              <ChevronLeft size={12} /> Anterior
            </button>
            <span className="text-[9px] text-gray-400">{viewingIndex + 1} / {events.length}</span>
            <button
              onClick={(e) => { e.stopPropagation(); if (hasNext) setViewingIndex(viewingIndex + 1); }}
              disabled={!hasNext}
              className={`flex items-center gap-0.5 text-[10px] font-medium px-2 py-1 rounded transition-colors ${hasNext ? 'text-teal-600 hover:bg-teal-50' : 'text-gray-300 cursor-not-allowed'}`}
            >
              Siguiente <ChevronRight size={12} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ====== LIST VIEW ======
  return (
    <div className={`transition-all ${isSelected ? 'ring-2 ring-blue-500 rounded p-1' : ''}`}>
      <div className="bg-white rounded-lg overflow-hidden">
        <div className="px-3 py-2 flex items-center justify-between" style={{ background: 'linear-gradient(to right, var(--af-color-primary, #14b8a6), var(--af-color-secondary, #10b981))' }}>
          <span className="text-white text-xs font-bold flex items-center gap-1">
            <Calendar size={12} /> EVENTOS
          </span>
          {hasRealData && (
            <span className="text-white/80 text-[9px]">{events.length} evento{events.length !== 1 ? 's' : ''}</span>
          )}
        </div>
        <div className={isCards ? 'space-y-2 p-2' : 'divide-y divide-gray-100'}>
          {displayItems.map((item, i) => {
            const isReal = 'id' in item;
            const title = isReal ? (item as AppEvent).title : (item as typeof MOCK_EVENTS[0]).title;
            const location = isReal ? (item as AppEvent).location : (item as typeof MOCK_EVENTS[0]).location;
            const dt = isReal ? formatDate((item as AppEvent).eventDate) : null;
            const dateLabel = dt ? `${dt.day} ${dt.month}` : (item as typeof MOCK_EVENTS[0]).date;
            const timeLabel = dt ? dt.time : (item as typeof MOCK_EVENTS[0]).time;
            const endTimeLabel = isReal && (item as AppEvent).eventEndDate ? formatDate((item as AppEvent).eventEndDate!).time : null;
            const imgUrl = isReal ? (item as AppEvent).imageUrl : null;
            const hasImg = isReal ? !!imgUrl : false;
            const category = isReal ? (item as AppEvent).category : (item as typeof MOCK_EVENTS[0]).category;
            const price = isReal ? (item as AppEvent).price : (item as typeof MOCK_EVENTS[0]).price;
            const catColor = category ? (CATEGORY_COLORS[category] || CATEGORY_COLORS['Otro']) : '';

            return (
              <div
                key={isReal ? (item as AppEvent).id : `mock-${i}`}
                onClick={isReal ? (e) => { e.stopPropagation(); setViewingIndex(i); } : undefined}
                className={`${isCards ? 'bg-gray-50 rounded-lg overflow-hidden shadow-sm' : 'px-3 py-2'} ${isReal ? 'cursor-pointer hover:bg-teal-50/50 transition-colors' : ''} flex gap-2`}
              >
                {/* Date badge */}
                <div className="w-11 shrink-0 flex flex-col items-center justify-center bg-teal-50 rounded-md py-1">
                  <span className="text-sm font-bold text-teal-600 leading-none">{dateLabel.split(' ')[0]}</span>
                  <span className="text-[8px] text-teal-500 uppercase leading-none mt-0.5">{dateLabel.split(' ')[1]}</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 py-0.5">
                  <p className="text-xs font-semibold text-gray-800 leading-tight truncate">{title}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Clock size={9} className="text-gray-400 shrink-0" />
                    <span className="text-[9px] text-gray-500">{timeLabel}{endTimeLabel && ` — ${endTimeLabel}`}</span>
                  </div>
                  {data.showLocation && location && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin size={9} className="text-gray-400 shrink-0" />
                      <span className="text-[9px] text-gray-500 truncate">{location}</span>
                    </div>
                  )}
                  {/* Badges row */}
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    {category && (
                      <span className={`text-[7px] font-semibold px-1 py-0.5 rounded-full leading-none ${catColor}`}>{category}</span>
                    )}
                    {price && (
                      <span className={`text-[7px] font-bold px-1 py-0.5 rounded-full leading-none ${
                        price.toLowerCase() === 'gratis' ? 'bg-green-100 text-green-700' : 'bg-teal-100 text-teal-700'
                      }`}>{price}</span>
                    )}
                  </div>
                </div>

                {/* Thumbnail */}
                {data.showImage && hasImg && imgUrl && (
                  <img src={resolveAssetUrl(imgUrl)} alt="" className="w-10 h-10 object-cover rounded shrink-0 self-center" />
                )}
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

// --- Runtime Component ---
const RuntimeComponent: React.FC<{ data: EventsConfig }> = ({ data }) => (
  <div style={{ padding: '16px' }}>
    <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px' }}>Eventos</h2>
    <p style={{ color: '#888', fontSize: '14px' }}>
      Listado de eventos ({data.layout}) — {data.itemsToShow} elementos.
      Se renderizará dinámicamente en la app generada.
    </p>
  </div>
);

// --- Event Form ---
interface EventFormData {
  title: string;
  description: string;
  imageUrl: string;
  location: string;
  eventDate: string;
  eventEndDate: string;
  price: string;
  ticketUrl: string;
  ticketLabel: string;
  category: string;
  organizer: string;
  contactInfo: string;
}

const EMPTY_FORM: EventFormData = {
  title: '', description: '', imageUrl: '', location: '',
  eventDate: nowLocalISO(), eventEndDate: '',
  price: '', ticketUrl: '', ticketLabel: '', category: '', organizer: '', contactInfo: '',
};

const EventForm: React.FC<{
  initial?: EventFormData;
  onSave: (data: EventFormData) => Promise<void>;
  onCancel: () => void;
  token: string;
}> = ({ initial, onSave, onCancel, token }) => {
  const [form, setForm] = useState<EventFormData>(initial ?? { ...EMPTY_FORM, eventDate: nowLocalISO() });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(
    !!(initial && (initial.price || initial.ticketUrl || initial.category || initial.organizer || initial.contactInfo))
  );

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const res = await uploadFile(file, token);
      setForm(f => ({ ...f, imageUrl: res.url }));
    } catch {
      alert('Error al subir imagen');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) { alert('El título es requerido'); return; }
    if (!form.eventDate) { alert('La fecha del evento es requerida'); return; }
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  return (
    <div className="border border-teal-200 rounded-lg p-3 bg-teal-50/50 space-y-3">
      {/* Title */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">Título *</label>
        <input
          type="text" placeholder="Nombre del evento"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-teal-500 focus:border-teal-500"
          value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">Descripción</label>
        <textarea
          placeholder="Descripción del evento..." rows={3}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-teal-500 focus:border-teal-500 resize-none"
          value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
        />
      </div>

      {/* Location */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">Ubicación (se mostrará en mapa)</label>
        <input
          type="text" placeholder="Ej: Calle Gran Vía 42, Madrid"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-teal-500 focus:border-teal-500"
          value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
        />
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Fecha inicio *</label>
          <input
            type="datetime-local"
            className="w-full border border-gray-300 rounded-md px-2 py-2 text-sm focus:ring-teal-500 focus:border-teal-500"
            value={form.eventDate} onChange={e => setForm(f => ({ ...f, eventDate: e.target.value }))}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Fecha y hora de fin</label>
          <input
            type="datetime-local"
            className="w-full border border-gray-300 rounded-md px-2 py-2 text-sm focus:ring-teal-500 focus:border-teal-500"
            value={form.eventEndDate} onChange={e => setForm(f => ({ ...f, eventEndDate: e.target.value }))}
          />
        </div>
      </div>

      {/* Image */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">Imagen (opcional)</label>
        {form.imageUrl && (
          <div className="relative mb-2">
            <img src={resolveAssetUrl(form.imageUrl)} alt="" className="w-full aspect-video object-cover rounded-md" />
            <button onClick={() => setForm(f => ({ ...f, imageUrl: '' }))} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5">
              <X size={12} />
            </button>
          </div>
        )}
        {uploading ? (
          <p className="text-xs text-teal-600 py-2">Subiendo imagen...</p>
        ) : (
          <input type="file" accept="image/*" onChange={handleImageUpload}
            className="block w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-teal-100 file:text-teal-700 hover:file:bg-teal-200 cursor-pointer"
          />
        )}
      </div>

      {/* Advanced options toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced(o => !o)}
        className="w-full flex items-center justify-between px-2 py-1.5 bg-white border border-gray-200 rounded-md text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
      >
        <span className="flex items-center gap-1"><Tag size={12} /> Opciones avanzadas</span>
        {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {showAdvanced && (
        <div className="space-y-3 border-t border-teal-200 pt-3">
          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Categoría</label>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            >
              <option value="">Sin categoría</option>
              {EVENT_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Price */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Precio</label>
            <input
              type="text" placeholder="Ej: Gratis, 15€, Desde 25€"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-teal-500 focus:border-teal-500"
              value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
            />
          </div>

          {/* Ticket URL + label */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">URL de compra de entradas</label>
            <input
              type="text" placeholder="https://eventbrite.com/..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:ring-teal-500 focus:border-teal-500"
              value={form.ticketUrl} onChange={e => setForm(f => ({ ...f, ticketUrl: e.target.value }))}
            />
          </div>
          {form.ticketUrl && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Texto del botón de entradas</label>
              <input
                type="text" placeholder="Comprar entradas"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-teal-500 focus:border-teal-500"
                value={form.ticketLabel} onChange={e => setForm(f => ({ ...f, ticketLabel: e.target.value }))}
              />
            </div>
          )}

          {/* Organizer */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Organizador</label>
            <input
              type="text" placeholder="Nombre del organizador"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-teal-500 focus:border-teal-500"
              value={form.organizer} onChange={e => setForm(f => ({ ...f, organizer: e.target.value }))}
            />
          </div>

          {/* Contact */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Contacto (email o teléfono)</label>
            <input
              type="text" placeholder="info@evento.com / +34 600 000 000"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-teal-500 focus:border-teal-500"
              value={form.contactInfo} onChange={e => setForm(f => ({ ...f, contactInfo: e.target.value }))}
            />
          </div>
        </div>
      )}

      {/* Submit buttons */}
      <div className="flex gap-2 pt-1">
        <button onClick={handleSubmit} disabled={saving}
          className="flex items-center gap-1 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-md hover:bg-teal-700 disabled:opacity-50 transition-colors"
        >
          <Save size={14} /> {saving ? 'Guardando...' : 'Guardar evento'}
        </button>
        <button onClick={onCancel}
          className="flex items-center gap-1 px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-300 transition-colors"
        >
          <X size={14} /> Cancelar
        </button>
      </div>
    </div>
  );
};

// --- Settings Panel ---
const SettingsPanel: React.FC<{ data: EventsConfig; onChange: (data: EventsConfig) => void }> = ({ data, onChange }) => {
  const [events, setEventsList] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const token = useAuthStore((s) => s.token);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [configOpen, setConfigOpen] = useState(true);

  const loadEvents = useCallback(async () => {
    if (!data.appId || !token) return;
    try {
      setLoading(true);
      const list = await getEvents(data.appId, token);
      setEventsList(list);
    } catch (err) {
      console.error('Error cargando eventos:', err);
    } finally {
      setLoading(false);
    }
  }, [data.appId, token]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const refreshPreview = () => {
    onChange({ ...data, _refreshKey: (data._refreshKey ?? 0) + 1 });
  };

  const handleCreate = async (formData: EventFormData) => {
    if (!data.appId || !token) return;
    await createEvent(data.appId, {
      title: formData.title,
      description: formData.description || undefined,
      imageUrl: formData.imageUrl || undefined,
      location: formData.location || undefined,
      eventDate: new Date(formData.eventDate).toISOString(),
      eventEndDate: formData.eventEndDate ? new Date(formData.eventEndDate).toISOString() : undefined,
      price: formData.price || undefined,
      ticketUrl: formData.ticketUrl || undefined,
      ticketLabel: formData.ticketLabel || undefined,
      category: formData.category || undefined,
      organizer: formData.organizer || undefined,
      contactInfo: formData.contactInfo || undefined,
    }, token);
    setShowForm(false);
    await loadEvents();
    refreshPreview();
  };

  const handleUpdate = async (eventId: string, formData: EventFormData) => {
    if (!data.appId || !token) return;
    await updateEvent(data.appId, eventId, {
      title: formData.title,
      description: formData.description || undefined,
      imageUrl: formData.imageUrl || undefined,
      location: formData.location || undefined,
      eventDate: new Date(formData.eventDate).toISOString(),
      eventEndDate: formData.eventEndDate ? new Date(formData.eventEndDate).toISOString() : undefined,
      price: formData.price || undefined,
      ticketUrl: formData.ticketUrl || undefined,
      ticketLabel: formData.ticketLabel || undefined,
      category: formData.category || undefined,
      organizer: formData.organizer || undefined,
      contactInfo: formData.contactInfo || undefined,
    }, token);
    setEditingId(null);
    await loadEvents();
    refreshPreview();
  };

  const handleDelete = async (eventId: string) => {
    if (!data.appId || !confirm('¿Eliminar este evento?') || !token) return;
    await deleteEvent(data.appId, eventId, token);
    await loadEvents();
    refreshPreview();
  };

  return (
    <div className="space-y-4">
      {/* Section 1: Visual config */}
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
                value={data.layout} onChange={e => onChange({ ...data, layout: e.target.value as 'list' | 'cards' })}
              >
                <option value="cards">Tarjetas</option>
                <option value="list">Lista</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Eventos a mostrar</label>
              <input type="number" min={1} max={50}
                className="w-full border border-gray-300 rounded-md p-2 text-sm"
                value={data.itemsToShow} onChange={e => onChange({ ...data, itemsToShow: parseInt(e.target.value) || 5 })}
              />
            </div>
            <div className="space-y-2">
              {([
                ['showImage', 'Mostrar imagen'],
                ['showLocation', 'Mostrar ubicación'],
                ['showDescription', 'Mostrar descripción'],
              ] as const).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={data[key]}
                    onChange={e => onChange({ ...data, [key]: e.target.checked })}
                    className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Section 2: Event management */}
      <div>
        <h3 className="text-sm font-bold text-gray-800 mb-3">Gestión de Eventos</h3>

        {!data.appId ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
            <p className="text-sm text-amber-700 font-medium">Guarda la app primero para gestionar eventos</p>
            <p className="text-xs text-amber-600 mt-1">Haz clic en "Guardar Cambios" en la barra superior</p>
          </div>
        ) : (
          <div className="space-y-3">
            {!showForm && !editingId && (
              <button onClick={() => setShowForm(true)}
                className="w-full flex items-center justify-center gap-1 px-3 py-2.5 bg-teal-600 text-white text-sm font-medium rounded-md hover:bg-teal-700 transition-colors"
              >
                <Plus size={14} /> Agregar Evento
              </button>
            )}

            {showForm && token && (
              <EventForm onSave={handleCreate} onCancel={() => setShowForm(false)} token={token} />
            )}

            {loading ? (
              <p className="text-sm text-gray-500 text-center py-4">Cargando eventos...</p>
            ) : events.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No hay eventos aún</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {events.map(event => (
                  <div key={event.id} className="border border-gray-200 rounded-lg bg-white overflow-hidden">
                    {editingId === event.id && token ? (
                      <div className="p-2">
                        <EventForm
                          initial={{
                            title: event.title,
                            description: event.description ?? '',
                            imageUrl: event.imageUrl ?? '',
                            location: event.location ?? '',
                            eventDate: toInputDate(event.eventDate),
                            eventEndDate: event.eventEndDate ? toInputDate(event.eventEndDate) : '',
                            price: event.price ?? '',
                            ticketUrl: event.ticketUrl ?? '',
                            ticketLabel: event.ticketLabel ?? '',
                            category: event.category ?? '',
                            organizer: event.organizer ?? '',
                            contactInfo: event.contactInfo ?? '',
                          }}
                          onSave={formData => handleUpdate(event.id, formData)}
                          onCancel={() => setEditingId(null)}
                          token={token}
                        />
                      </div>
                    ) : (
                      <div className="p-3">
                        <div className="flex items-start gap-3">
                          {event.imageUrl && (
                            <img src={resolveAssetUrl(event.imageUrl)} alt="" className="w-14 h-14 object-cover rounded-md shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{event.title}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <Calendar size={10} className="text-teal-500" />
                              <p className="text-[10px] text-gray-500">
                                {new Date(event.eventDate).toLocaleDateString('es-ES')} {formatDate(event.eventDate).time}
                                {event.eventEndDate && ` — ${new Date(event.eventEndDate).toLocaleDateString('es-ES')} ${formatDate(event.eventEndDate).time}`}
                              </p>
                            </div>
                            {event.location && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <MapPin size={10} className="text-gray-400" />
                                <p className="text-[10px] text-gray-500 truncate">{event.location}</p>
                              </div>
                            )}
                            <div className="flex items-center gap-1 mt-1 flex-wrap">
                              {event.category && (
                                <span className={`text-[8px] font-semibold px-1 py-0.5 rounded-full ${CATEGORY_COLORS[event.category] || CATEGORY_COLORS['Otro']}`}>
                                  {event.category}
                                </span>
                              )}
                              {event.price && (
                                <span className="text-[8px] font-bold px-1 py-0.5 rounded-full bg-teal-100 text-teal-700">{event.price}</span>
                              )}
                              {event.ticketUrl && (
                                <span className="text-[8px] font-medium px-1 py-0.5 rounded-full bg-blue-100 text-blue-700 flex items-center gap-0.5">
                                  <Ticket size={8} /> Entradas
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1 shrink-0">
                            <button onClick={() => setEditingId(event.id)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md" title="Editar">
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => handleDelete(event.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-md" title="Eliminar">
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

            {events.length > 0 && (
              <p className="text-xs text-gray-400 text-center">{events.length} evento{events.length !== 1 ? 's' : ''} en total</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// --- Module Definition ---
export const EventsModule: ModuleDefinition<EventsConfig> = {
  id: 'events',
  name: 'Eventos',
  description: 'Listado de eventos con fecha, lugar, mapa y entradas',
  icon: <Calendar size={20} />,
  schema: EventsConfigSchema,
  defaultConfig: {
    layout: 'cards',
    itemsToShow: 10,
    showImage: true,
    showLocation: true,
    showDescription: true,
    appId: undefined,
    _refreshKey: 0,
  },
  PreviewComponent,
  RuntimeComponent,
  SettingsPanel,
};
