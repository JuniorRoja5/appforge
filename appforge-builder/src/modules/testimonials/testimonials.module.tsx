import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { ModuleDefinition } from '../base/module.interface';
import { z } from 'zod';
import { Star, Quote, Plus, Trash2, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import { resolveAssetUrl } from '../../lib/resolve-asset-url';
import { ImageInputField } from '../../components/shared/ImageInputField';

// --- Zod schema ---
const TestimonialItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  authorName: z.string(),
  authorRole: z.string(),
  authorImageUrl: z.string(),
  rating: z.number().min(1).max(5),
});

const TestimonialsConfigSchema = z.object({
  title: z.string(),
  testimonials: z.array(TestimonialItemSchema),
  showRating: z.boolean(),
  showImage: z.boolean(),
  layout: z.enum(['carousel', 'list', 'cards']),
});

export type TestimonialsConfig = z.infer<typeof TestimonialsConfigSchema>;
type TestimonialItem = z.infer<typeof TestimonialItemSchema>;

// --- Star Rating Display ---
const StarRating: React.FC<{ rating: number; size?: number }> = ({ rating, size = 10 }) => (
  <div className="flex items-center gap-px">
    {[1, 2, 3, 4, 5].map(i => (
      <Star
        key={i}
        size={size}
        className={i <= rating ? 'text-yellow-400' : 'text-gray-300'}
        fill={i <= rating ? 'currentColor' : 'none'}
      />
    ))}
  </div>
);

// --- Author Initials Avatar ---
const InitialsAvatar: React.FC<{ name: string; size?: string }> = ({ name, size = 'w-12 h-12' }) => {
  const initials = name
    .split(' ')
    .map(w => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // Generate a consistent color from name
  const colors = [
    'from-purple-400 to-indigo-500',
    'from-pink-400 to-rose-500',
    'from-blue-400 to-cyan-500',
    'from-emerald-400 to-teal-500',
    'from-amber-400 to-orange-500',
    'from-red-400 to-pink-500',
  ];
  const colorIndex = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;

  return (
    <div
      className={`${size} rounded-full bg-gradient-to-br ${colors[colorIndex]} flex items-center justify-center text-white font-bold text-xs shrink-0`}
    >
      {initials}
    </div>
  );
};

// --- Single Testimonial Card ---
const TestimonialCard: React.FC<{
  testimonial: TestimonialItem;
  showRating: boolean;
  showImage: boolean;
  compact?: boolean;
}> = ({ testimonial, showRating, showImage, compact }) => (
  <div
    className="rounded-xl shadow-sm p-4 relative overflow-hidden"
    style={{ backgroundColor: 'var(--af-surface-card, #ffffff)' }}
  >
    {/* Quote icon background */}
    <Quote
      size={compact ? 32 : 40}
      className="absolute top-2 left-2 opacity-[0.06]"
      style={{ color: 'var(--af-color-primary, #7c3aed)' }}
      fill="currentColor"
    />

    {/* Text */}
    <p className={`italic text-gray-600 relative z-10 leading-relaxed ${compact ? 'text-[10px]' : 'text-xs'}`}>
      &ldquo;{testimonial.text}&rdquo;
    </p>

    {/* Author row */}
    <div className="flex items-center gap-2.5 mt-3 relative z-10">
      {showImage && (
        testimonial.authorImageUrl ? (
          <img
            src={resolveAssetUrl(testimonial.authorImageUrl)}
            alt={testimonial.authorName}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            className="w-10 h-10 rounded-full object-cover shrink-0 border-2 border-white shadow-sm"
          />
        ) : (
          <InitialsAvatar name={testimonial.authorName} size="w-10 h-10" />
        )
      )}
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-gray-800 truncate ${compact ? 'text-[10px]' : 'text-xs'}`}>
          {testimonial.authorName}
        </p>
        <p className="text-[9px] text-gray-500 truncate">{testimonial.authorRole}</p>
        {showRating && (
          <div className="mt-0.5">
            <StarRating rating={testimonial.rating} size={compact ? 8 : 10} />
          </div>
        )}
      </div>
    </div>
  </div>
);

// --- Preview Component ---
const PreviewComponent: React.FC<{ data: TestimonialsConfig; isSelected: boolean }> = ({ data, isSelected }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasTestimonials = data.testimonials.length > 0;

  // Auto-advance carousel
  const startAutoAdvance = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (data.layout === 'carousel' && data.testimonials.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex(prev => (prev + 1) % data.testimonials.length);
      }, 4000);
    }
  }, [data.layout, data.testimonials.length]);

  useEffect(() => {
    startAutoAdvance();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startAutoAdvance]);

  // Clamp index when testimonials change
  useEffect(() => {
    if (currentIndex >= data.testimonials.length) {
      setCurrentIndex(0);
    }
  }, [data.testimonials.length, currentIndex]);

  const goTo = (index: number) => {
    setCurrentIndex(index);
    // Reset auto-advance timer
    startAutoAdvance();
  };

  const goPrev = () => {
    goTo(currentIndex > 0 ? currentIndex - 1 : data.testimonials.length - 1);
  };

  const goNext = () => {
    goTo((currentIndex + 1) % data.testimonials.length);
  };

  return (
    <div className={`transition-all ${isSelected ? 'ring-2 ring-blue-500 rounded p-1' : ''}`}>
      <div className="bg-white rounded-lg overflow-hidden">
        {/* Header */}
        <div
          className="px-3 py-2 flex items-center gap-1.5"
          style={{
            background: 'linear-gradient(to right, var(--af-color-primary, #7c3aed), var(--af-color-primary, #7c3aed)cc)',
          }}
        >
          <Star size={12} className="text-white" fill="white" />
          <span className="text-white text-xs font-bold">{data.title || 'TESTIMONIOS'}</span>
          {hasTestimonials && (
            <span className="ml-auto text-white/70 text-[9px]">
              {data.testimonials.length} testimonio{data.testimonials.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {!hasTestimonials ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400">
            <MessageSquare size={24} className="mb-1.5 opacity-40" />
            <p className="text-[10px]">Agrega testimonios en la configuracion</p>
          </div>
        ) : data.layout === 'carousel' ? (
          /* ====== CAROUSEL LAYOUT ====== */
          <div className="p-3">
            {/* Current testimonial */}
            <div className="relative">
              {/* Large quote background */}
              <Quote
                size={56}
                className="absolute -top-1 -left-1 opacity-[0.04]"
                style={{ color: 'var(--af-color-primary, #7c3aed)' }}
                fill="currentColor"
              />

              {/* Text centered */}
              <p className="text-xs italic text-gray-600 text-center leading-relaxed px-2 pt-2 relative z-10">
                &ldquo;{data.testimonials[currentIndex].text}&rdquo;
              </p>

              {/* Author section centered */}
              <div className="flex flex-col items-center mt-3 relative z-10">
                {data.showImage && (
                  data.testimonials[currentIndex].authorImageUrl ? (
                    <img
                      src={resolveAssetUrl(data.testimonials[currentIndex].authorImageUrl)}
                      alt={data.testimonials[currentIndex].authorName}
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm mb-1.5"
                    />
                  ) : (
                    <div className="mb-1.5">
                      <InitialsAvatar name={data.testimonials[currentIndex].authorName} size="w-12 h-12" />
                    </div>
                  )
                )}
                <p className="text-xs font-semibold text-gray-800">
                  {data.testimonials[currentIndex].authorName}
                </p>
                <p className="text-[9px] text-gray-500">
                  {data.testimonials[currentIndex].authorRole}
                </p>
                {data.showRating && (
                  <div className="mt-1">
                    <StarRating rating={data.testimonials[currentIndex].rating} />
                  </div>
                )}
              </div>

              {/* Navigation arrows */}
              {data.testimonials.length > 1 && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); goPrev(); }}
                    className="absolute left-0 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); goNext(); }}
                    className="absolute right-0 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    <ChevronRight size={14} />
                  </button>
                </>
              )}
            </div>

            {/* Dot indicators */}
            {data.testimonials.length > 1 && (
              <div className="flex items-center justify-center gap-1.5 mt-3">
                {data.testimonials.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); goTo(i); }}
                    className="p-0 border-0 outline-none"
                  >
                    <div
                      className="rounded-full transition-all"
                      style={{
                        width: i === currentIndex ? '16px' : '6px',
                        height: '6px',
                        backgroundColor:
                          i === currentIndex
                            ? 'var(--af-color-primary, #7c3aed)'
                            : '#d1d5db',
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : data.layout === 'list' ? (
          /* ====== LIST LAYOUT ====== */
          <div className="p-2 space-y-2">
            {data.testimonials.map(t => (
              <TestimonialCard
                key={t.id}
                testimonial={t}
                showRating={data.showRating}
                showImage={data.showImage}
              />
            ))}
          </div>
        ) : (
          /* ====== CARDS LAYOUT ====== */
          <div className="p-2 grid grid-cols-1 gap-2">
            {data.testimonials.map(t => (
              <TestimonialCard
                key={t.id}
                testimonial={t}
                showRating={data.showRating}
                showImage={data.showImage}
                compact
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// --- Runtime Component ---
const RuntimeComponent: React.FC<{ data: TestimonialsConfig }> = ({ data }) => (
  <div style={{ padding: '16px' }}>
    <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px' }}>Testimonios</h2>
    <p style={{ color: '#888', fontSize: '14px' }}>
      {data.testimonials.length} testimonio{data.testimonials.length !== 1 ? 's' : ''} configurados
      (layout: {data.layout}).
      Se renderizaran dinamicamente en la app generada.
    </p>
  </div>
);

// --- Settings Panel ---
const SettingsPanel: React.FC<{ data: TestimonialsConfig; onChange: (data: TestimonialsConfig) => void }> = ({ data, onChange }) => {
  const [configOpen, setConfigOpen] = useState(true);

  const addTestimonial = () => {
    const newItem: TestimonialItem = {
      id: Date.now().toString(),
      text: 'Nuevo testimonio...',
      authorName: 'Nombre',
      authorRole: 'Cliente',
      authorImageUrl: '',
      rating: 5,
    };
    onChange({ ...data, testimonials: [...data.testimonials, newItem] });
  };

  const updateTestimonial = (id: string, updates: Partial<TestimonialItem>) => {
    onChange({
      ...data,
      testimonials: data.testimonials.map(t => (t.id === id ? { ...t, ...updates } : t)),
    });
  };

  const removeTestimonial = (id: string) => {
    onChange({ ...data, testimonials: data.testimonials.filter(t => t.id !== id) });
  };

  return (
    <div className="space-y-4">
      {/* Section 1: Configuration */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <button
          onClick={() => setConfigOpen(o => !o)}
          className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <span className="text-sm font-bold text-gray-800">Configuracion</span>
          <MessageSquare size={16} className={`transition-transform ${configOpen ? '' : 'opacity-50'}`} />
        </button>
        {configOpen && (
          <div className="p-3 space-y-3">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Titulo</label>
              <input
                type="text"
                value={data.title}
                onChange={e => onChange({ ...data, title: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-purple-500 focus:border-purple-500"
                placeholder="Lo que dicen nuestros clientes"
              />
            </div>

            {/* Layout */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Disposicion</label>
              <div className="flex gap-1">
                {([
                  { value: 'carousel' as const, label: 'Carrusel' },
                  { value: 'list' as const, label: 'Lista' },
                  { value: 'cards' as const, label: 'Tarjetas' },
                ]).map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => onChange({ ...data, layout: opt.value })}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      data.layout === opt.value
                        ? 'bg-purple-600 text-white'
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
                  checked={data.showRating}
                  onChange={e => onChange({ ...data, showRating: e.target.checked })}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                Mostrar puntuacion
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.showImage}
                  onChange={e => onChange({ ...data, showImage: e.target.checked })}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                Mostrar imagen del autor
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Section 2: Testimonials list */}
      <div>
        <h3 className="text-sm font-bold text-gray-800 mb-3">Testimonios</h3>

        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
          {data.testimonials.map(testimonial => (
            <div key={testimonial.id} className="border border-gray-200 rounded-lg bg-white p-2 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Quote size={12} className="text-purple-500" />
                  <span className="text-[10px] font-medium text-gray-500 truncate max-w-[120px]">
                    {testimonial.authorName}
                  </span>
                </div>
                <button
                  onClick={() => removeTestimonial(testimonial.id)}
                  className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                  title="Eliminar testimonio"
                >
                  <Trash2 size={12} />
                </button>
              </div>

              {/* Testimonial text */}
              <textarea
                value={testimonial.text}
                onChange={e => updateTestimonial(testimonial.id, { text: e.target.value })}
                rows={2}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs resize-none focus:ring-purple-500 focus:border-purple-500"
                placeholder="Texto del testimonio..."
              />

              {/* Author name */}
              <input
                type="text"
                value={testimonial.authorName}
                onChange={e => updateTestimonial(testimonial.id, { authorName: e.target.value })}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs"
                placeholder="Nombre del autor"
              />

              {/* Author role */}
              <input
                type="text"
                value={testimonial.authorRole}
                onChange={e => updateTestimonial(testimonial.id, { authorRole: e.target.value })}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs"
                placeholder="Rol (ej: Cliente habitual)"
              />

              {/* Author image */}
              <ImageInputField
                value={testimonial.authorImageUrl}
                onChange={(url) => updateTestimonial(testimonial.id, { authorImageUrl: url })}
                accentColor="purple"
                shape="circle"
                previewSize="sm"
                label="Imagen del autor"
                urlPlaceholder="URL de imagen (opcional)"
                maxSizeMB={10}
              />

              {/* Rating slider */}
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <label className="text-[10px] font-medium text-gray-600">Puntuacion</label>
                  <StarRating rating={testimonial.rating} size={10} />
                </div>
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  value={testimonial.rating}
                  onChange={e => updateTestimonial(testimonial.id, { rating: parseInt(e.target.value, 10) })}
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
                <div className="flex justify-between text-[8px] text-gray-400 px-0.5">
                  <span>1</span>
                  <span>2</span>
                  <span>3</span>
                  <span>4</span>
                  <span>5</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={addTestimonial}
          className="w-full mt-2 flex items-center justify-center gap-1 px-3 py-2.5 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 transition-colors"
        >
          <Plus size={14} /> Agregar Testimonio
        </button>

        {data.testimonials.length > 0 && (
          <p className="text-xs text-gray-400 text-center mt-2">
            {data.testimonials.length} testimonio{data.testimonials.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  );
};

// --- Module Definition ---
export const TestimonialsModule: ModuleDefinition<TestimonialsConfig> = {
  id: 'testimonials',
  name: 'Testimonios',
  description: 'Resenas y testimonios de clientes',
  icon: <Star size={20} />,
  schema: TestimonialsConfigSchema,
  defaultConfig: {
    title: 'Lo que dicen nuestros clientes',
    testimonials: [
      { id: '1', text: 'Excelente servicio, muy profesionales. Volvere sin duda.', authorName: 'Maria Garcia', authorRole: 'Cliente habitual', authorImageUrl: '', rating: 5 },
      { id: '2', text: 'La mejor experiencia que he tenido. 100% recomendado.', authorName: 'Carlos Lopez', authorRole: 'Cliente nuevo', authorImageUrl: '', rating: 5 },
      { id: '3', text: 'Atencion personalizada y resultados increibles.', authorName: 'Ana Martinez', authorRole: 'Cliente VIP', authorImageUrl: '', rating: 4 },
    ],
    showRating: true,
    showImage: true,
    layout: 'carousel',
  },
  PreviewComponent,
  RuntimeComponent,
  SettingsPanel,
};
