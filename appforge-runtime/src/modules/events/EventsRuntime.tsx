import React, { useEffect, useState } from 'react';
import { ArrowLeft, Calendar, ChevronLeft, ChevronRight, Clock, Mail, MapPin, Ticket, User } from 'lucide-react';
import { BrowserShim as Browser } from '../../lib/platform';
import { getEvents } from '../../lib/api';
import { resolveAssetUrl } from '../../lib/resolve-asset-url';
import { imgFallback } from '../../lib/img-fallback';
import { registerRuntimeModule } from '../registry';
import { useBackButton } from '../../lib/use-back-button';
import { ModuleHeader } from '../../components/ModuleHeader';
import { HorizontalCarousel, carouselItemStyle } from '../../components/HorizontalCarousel';

type Event = Awaited<ReturnType<typeof getEvents>>[number];

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  return {
    full: d.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    short: d.toLocaleDateString('es', { day: 'numeric', month: 'short' }),
    time: d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }),
  };
};

const openExternal = async (url: string) => {
  try { await Browser.open({ url }); } catch { /* swallow — Browser shim handles its own fallback */ }
};

const EventsRuntime: React.FC<{ data: Record<string, unknown> }> = ({ data }) => {
  // NOTE: `data.title` is a latent hook for the upcoming "editable
  // header" feature — the runtime reads it defensively even though the
  // builder does not currently expose a module-level `title` in the
  // schema or SettingsPanel. When the title-editable epic ships
  // (post-B3), the schema will declare `title` (with the convention
  // that an empty string collapses the header) and the builder will
  // edit it. Until then the cast falls through to 'Eventos' for every
  // real manifest. Do NOT clean this up as a zombie — it's contract
  // that does not exist yet, not dead code.
  const title = (data.title as string) ?? 'Eventos';
  const layout = (data.layout as string) ?? 'cards';
  const itemsToShow = (data.itemsToShow as number) ?? 50;
  const showImage = (data.showImage as boolean) ?? true;
  const showLocation = (data.showLocation as boolean) ?? true;
  const showDescription = (data.showDescription as boolean) ?? true;

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    getEvents()
      .then(setEvents)
      .catch((err) => setError(err?.message || 'Error al cargar eventos'))
      .finally(() => setLoading(false));
  }, []);

  // Hardware back button closes the detail view; default behaviour (exit app) on root.
  useBackButton(() => setSelectedIndex(null), selectedIndex !== null);

  if (loading) return <div className="animate-pulse h-40 rounded-xl" style={{ backgroundColor: 'var(--color-surface-variant)' }} />;
  if (error) return <p className="text-sm text-center py-4" style={{ color: 'var(--color-feedback-error)' }}>{error}</p>;

  const displayed = events.slice(0, itemsToShow);
  const selected = selectedIndex !== null ? displayed[selectedIndex] : null;

  // ── Detail view ──
  if (selected && selectedIndex !== null) {
    const atFirst = selectedIndex === 0;
    const atLast = selectedIndex === displayed.length - 1;
    const start = formatDateTime(selected.eventDate);
    const end = selected.eventEndDate ? formatDateTime(selected.eventEndDate) : null;
    const mapsUrl = selected.location
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selected.location)}`
      : null;

    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setSelectedIndex(null)}
            className="flex items-center gap-1 text-sm font-medium"
            style={{ color: 'var(--color-primary)' }}
          >
            <ArrowLeft size={16} /> Volver
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIndex(selectedIndex - 1)}
              disabled={atFirst}
              className="p-1.5 rounded-full disabled:opacity-30"
              style={{ color: 'var(--color-primary)' }}
              aria-label="Anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>
              {selectedIndex + 1} / {displayed.length}
            </span>
            <button
              onClick={() => setSelectedIndex(selectedIndex + 1)}
              disabled={atLast}
              className="p-1.5 rounded-full disabled:opacity-30"
              style={{ color: 'var(--color-primary)' }}
              aria-label="Siguiente"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {showImage && selected.imageUrl && (
          <img
            src={resolveAssetUrl(selected.imageUrl)}
            alt={selected.title}
            className="w-full h-48 object-cover mb-3"
            style={{ borderRadius: 'var(--radius-card, 16px)' }}
            onError={imgFallback}
          />
        )}

        <div className="flex items-center gap-1.5 flex-wrap mb-2">
          {selected.category && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--color-primary, #9333ea)15', color: 'var(--color-primary)' }}>
              {selected.category}
            </span>
          )}
          {selected.price && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--color-feedback-success, #22c55e)15', color: 'var(--color-feedback-success, #22c55e)' }}>
              {selected.price}
            </span>
          )}
        </div>

        <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>{selected.title}</h3>

        <div className="space-y-1.5 mb-3">
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            <Calendar size={14} style={{ color: 'var(--color-primary)' }} />
            <span>
              {start.full}
              {end && ` — ${end.full}`}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            <Clock size={14} style={{ color: 'var(--color-primary)' }} />
            <span>{start.time}{end && ` — ${end.time}`}</span>
          </div>
          {showLocation && selected.location && (
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              <MapPin size={14} style={{ color: 'var(--color-primary)' }} />
              <span className="flex-1">{selected.location}</span>
              {mapsUrl && (
                <button
                  onClick={() => openExternal(mapsUrl)}
                  className="text-xs font-semibold"
                  style={{ color: 'var(--color-primary)' }}
                >
                  Ver en mapa
                </button>
              )}
            </div>
          )}
          {selected.organizer && (
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              <User size={14} style={{ color: 'var(--color-primary)' }} />
              <span>Organiza: {selected.organizer}</span>
            </div>
          )}
          {selected.contactInfo && (
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              <Mail size={14} style={{ color: 'var(--color-primary)' }} />
              <span>{selected.contactInfo}</span>
            </div>
          )}
        </div>

        {showDescription && selected.description && (
          <p
            className="text-sm whitespace-pre-wrap break-words mb-3"
            style={{ color: 'var(--color-text-primary)', lineHeight: 1.5 }}
          >
            {selected.description}
          </p>
        )}

        {selected.ticketUrl && (
          <button
            onClick={() => openExternal(selected.ticketUrl!)}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-white"
            style={{ backgroundColor: 'var(--color-primary)', borderRadius: 'var(--radius-button, 8px)' }}
          >
            <Ticket size={16} />
            {selected.ticketLabel || 'Comprar entradas'}
          </button>
        )}
      </div>
    );
  }

  // ── List layout ──
  if (layout === 'list') {
    return (
      <div>
        <ModuleHeader title={title} icon={Calendar} />
        <div className="space-y-1">
          {displayed.map((event, idx) => (
            <div
              key={event.id}
              className="flex gap-3 py-3 cursor-pointer"
              style={{ borderBottom: '1px solid var(--color-divider, #e5e7eb)' }}
              onClick={() => setSelectedIndex(idx)}
            >
              {showImage && event.imageUrl && (
                <img src={resolveAssetUrl(event.imageUrl)} alt={event.title} className="w-16 h-16 object-cover shrink-0 rounded-lg" onError={imgFallback} />
              )}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{event.title}</h4>
                {showDescription && event.description && (
                  <p className="text-xs line-clamp-1" style={{ color: 'var(--color-text-secondary)' }}>{event.description}</p>
                )}
                <div className="flex items-center gap-3 mt-1 text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
                  <span className="flex items-center gap-1">
                    <Calendar size={10} /> {formatDateTime(event.eventDate).short}
                  </span>
                  {showLocation && event.location && (
                    <span className="flex items-center gap-1"><MapPin size={10} /> {event.location}</span>
                  )}
                </div>
                {event.price && (
                  <span className="text-xs font-bold mt-0.5 inline-block" style={{ color: 'var(--color-primary)' }}>{event.price}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Cards layout (default) ──
  return (
    <div>
      <ModuleHeader title={title} icon={Calendar} />
      <HorizontalCarousel>
        {displayed.map((event, idx) => (
          <div
            key={event.id}
            className="overflow-hidden cursor-pointer"
            style={{ ...carouselItemStyle(), borderRadius: 'var(--radius-card, 16px)', backgroundColor: 'var(--color-surface-card)', boxShadow: 'var(--shadow-sm)' }}
            onClick={() => setSelectedIndex(idx)}
          >
            {showImage && event.imageUrl && <img src={resolveAssetUrl(event.imageUrl)} alt={event.title} className="w-full h-36 object-cover" onError={imgFallback} />}
            <div style={{ padding: 'var(--spacing-card, 16px)' }}>
              <h4 className="font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>{event.title}</h4>
              {showDescription && event.description && (
                <p className="text-xs mb-1.5 line-clamp-2" style={{ color: 'var(--color-text-secondary)' }}>{event.description}</p>
              )}
              <div className="flex items-center gap-1.5 text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                <Calendar size={12} /> {new Date(event.eventDate).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' })}
              </div>
              {showLocation && event.location && (
                <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  <MapPin size={12} /> {event.location}
                </div>
              )}
              {event.price && (
                <span className="text-sm font-bold mt-1 inline-block" style={{ color: 'var(--color-primary)' }}>{event.price}</span>
              )}
            </div>
          </div>
        ))}
      </HorizontalCarousel>
    </div>
  );
};

registerRuntimeModule({ id: 'events', Component: EventsRuntime });
