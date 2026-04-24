import React, { useRef, useState } from 'react';
import { useAuthStore } from '../../../../store/useAuthStore';
import { useAppConfigStore } from '../../../../store/useAppConfigStore';
import { uploadFile } from '../../../../lib/api';
import { resolveAssetUrl } from '../../../../lib/resolve-asset-url';
import { Plus, Trash2, ChevronUp, ChevronDown, Image } from 'lucide-react';

interface Slide {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  order: number;
}

export const OnboardingTab: React.FC = () => {
  const token = useAuthStore((s) => s.token);
  const config = useAppConfigStore((s) => s.config);
  const updateSection = useAppConfigStore((s) => s.updateSection);
  const [uploadingSlideId, setUploadingSlideId] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const onboarding = config?.onboarding ?? { enabled: false, slides: [] };
  const slides = onboarding.slides ?? [];

  const update = (partial: Partial<typeof onboarding>) => {
    updateSection('onboarding', { ...onboarding, ...partial });
  };

  const updateSlide = (slideId: string, data: Partial<Slide>) => {
    update({
      slides: slides.map((s) => (s.id === slideId ? { ...s, ...data } : s)),
    });
  };

  const addSlide = () => {
    if (slides.length >= 5) return;
    const newSlide: Slide = {
      id: crypto.randomUUID(),
      title: '',
      description: '',
      imageUrl: '',
      order: slides.length,
    };
    update({ slides: [...slides, newSlide] });
  };

  const removeSlide = (slideId: string) => {
    update({
      slides: slides.filter((s) => s.id !== slideId).map((s, i) => ({ ...s, order: i })),
    });
  };

  const moveSlide = (slideId: string, direction: 'up' | 'down') => {
    const idx = slides.findIndex((s) => s.id === slideId);
    if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === slides.length - 1)) return;
    const newSlides = [...slides];
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    [newSlides[idx], newSlides[swapIdx]] = [newSlides[swapIdx], newSlides[idx]];
    update({ slides: newSlides.map((s, i) => ({ ...s, order: i })) });
  };

  const handleImageUpload = async (file: File, slideId: string) => {
    if (!token) return;
    setUploadingSlideId(slideId);
    try {
      const result = await uploadFile(file, token);
      updateSlide(slideId, { imageUrl: result.url });
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploadingSlideId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-1">Pantallas de bienvenida</h4>
        <p className="text-[12px] text-gray-500">
          Diapositivas que se muestran al usuario la primera vez que abre la app. Ideal para explicar funcionalidades clave.
        </p>
      </div>

      {/* Enable toggle */}
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-gray-700">Activar pantallas de bienvenida</span>
        <button
          onClick={() => update({ enabled: !onboarding.enabled })}
          className={`relative w-10 h-5 rounded-full transition-colors ${
            onboarding.enabled ? 'bg-indigo-500' : 'bg-gray-300'
          }`}
        >
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
            onboarding.enabled ? 'left-[22px]' : 'left-0.5'
          }`} />
        </button>
      </div>

      {onboarding.enabled && (
        <>
          {/* Slides list */}
          <div className="space-y-3">
            {slides.map((slide, idx) => (
              <div key={slide.id} className="border border-gray-200 rounded-lg p-4 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Diapositiva {idx + 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => moveSlide(slide.id, 'up')}
                      disabled={idx === 0}
                      className="p-1 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      onClick={() => moveSlide(slide.id, 'down')}
                      disabled={idx === slides.length - 1}
                      className="p-1 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30"
                    >
                      <ChevronDown size={14} />
                    </button>
                    <button
                      onClick={() => removeSlide(slide.id)}
                      className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Image */}
                <div className="flex items-center gap-3">
                  {slide.imageUrl ? (
                    <div className="w-16 h-16 rounded-lg border border-gray-200 overflow-hidden shrink-0">
                      <img src={resolveAssetUrl(slide.imageUrl)} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center shrink-0">
                      <Image size={18} className="text-gray-300" />
                    </div>
                  )}
                  <button
                    onClick={() => fileRefs.current[slide.id]?.click()}
                    className="text-[11px] text-indigo-600 hover:underline"
                  >
                    {uploadingSlideId === slide.id ? 'Subiendo...' : slide.imageUrl ? 'Cambiar imagen' : 'Subir imagen'}
                  </button>
                  <input
                    ref={(el) => { fileRefs.current[slide.id] = el; }}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleImageUpload(f, slide.id);
                      e.target.value = '';
                    }}
                  />
                </div>

                {/* Title */}
                <input
                  type="text"
                  value={slide.title}
                  onChange={(e) => updateSlide(slide.id, { title: e.target.value })}
                  placeholder="Título de la diapositiva"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                />

                {/* Description */}
                <textarea
                  value={slide.description}
                  onChange={(e) => updateSlide(slide.id, { description: e.target.value })}
                  placeholder="Descripción breve"
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[13px] resize-none focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                />
              </div>
            ))}
          </div>

          {slides.length < 5 && (
            <button
              onClick={addSlide}
              className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-[13px] text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
            >
              <Plus size={16} />
              Agregar diapositiva ({slides.length}/5)
            </button>
          )}
        </>
      )}
    </div>
  );
};
