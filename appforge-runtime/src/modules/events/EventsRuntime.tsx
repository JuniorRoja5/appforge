import React, { useEffect, useState } from 'react';
import { Calendar, MapPin } from 'lucide-react';
import { BrowserShim as Browser } from '../../lib/platform';
import { getEvents } from '../../lib/api';
import { resolveAssetUrl } from '../../lib/resolve-asset-url';
import { imgFallback } from '../../lib/img-fallback';
import { registerRuntimeModule } from '../registry';

const EventsRuntime: React.FC<{ data: Record<string, unknown> }> = ({ data }) => {
  const title = (data.title as string) ?? 'Eventos';
  const layout = (data.layout as string) ?? 'cards';
  const itemsToShow = (data.itemsToShow as number) ?? 50;
  const showImage = (data.showImage as boolean) ?? true;
  const showLocation = (data.showLocation as boolean) ?? true;
  const showDescription = (data.showDescription as boolean) ?? true;

  const [events, setEvents] = useState<Awaited<ReturnType<typeof getEvents>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getEvents()
      .then(setEvents)
      .catch((err) => setError(err?.message || 'Error al cargar eventos'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="animate-pulse h-40 rounded-xl" style={{ backgroundColor: 'var(--color-surface-variant)' }} />;
  if (error) return <p className="text-sm text-center py-4" style={{ color: 'var(--color-feedback-error)' }}>{error}</p>;

  const displayed = events.slice(0, itemsToShow);

  const openTicket = async (url: string) => {
    try { await Browser.open({ url }); } catch { window.open(url, '_blank'); }
  };

  // ── List layout ──
  if (layout === 'list') {
    return (
      <div>
        <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>{title}</h3>
        <div className="space-y-1">
          {displayed.map((event) => (
            <div
              key={event.id}
              className="flex gap-3 py-3"
              style={{ borderBottom: '1px solid var(--color-divider, #e5e7eb)' }}
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
                    <Calendar size={10} /> {new Date(event.eventDate).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                  </span>
                  {showLocation && event.location && (
                    <span className="flex items-center gap-1"><MapPin size={10} /> {event.location}</span>
                  )}
                </div>
                {event.price && (
                  <span className="text-xs font-bold mt-0.5 inline-block" style={{ color: 'var(--color-primary)' }}>{event.price}</span>
                )}
              </div>
              {event.ticketUrl && (
                <button
                  onClick={() => openTicket(event.ticketUrl!)}
                  className="shrink-0 self-center text-xs font-semibold"
                  style={{ color: 'var(--color-primary)' }}
                >
                  Entradas
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Cards layout (default) ──
  return (
    <div>
      <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>{title}</h3>
      <div className="space-y-3">
        {displayed.map((event) => (
          <div
            key={event.id}
            className="overflow-hidden"
            style={{ borderRadius: 'var(--radius-card, 16px)', backgroundColor: 'var(--color-surface-card)', boxShadow: 'var(--shadow-sm)' }}
          >
            {showImage && event.imageUrl && <img src={resolveAssetUrl(event.imageUrl)} alt={event.title} className="w-full h-36 object-cover" onError={imgFallback} />}
            <div style={{ padding: 'var(--spacing-card, 16px)' }}>
              <h4 className="font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>{event.title}</h4>
              {showDescription && event.description && (
                <p className="text-xs mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>{event.description}</p>
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
              {event.ticketUrl && (
                <button
                  onClick={() => openTicket(event.ticketUrl!)}
                  className="mt-2 text-xs font-semibold"
                  style={{ color: 'var(--color-primary)' }}
                >
                  Ver entradas
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

registerRuntimeModule({ id: 'events', Component: EventsRuntime });
