import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { createApp, getSubscription } from '../lib/api';
import { ThemeSelector } from '../components/ThemeSelector';
import type { NicheTemplate, DesignTokens } from '../lib/niche-templates/types';
import type { CanvasElement } from '../store/useBuilderStore';

const defaultDesignTokens: DesignTokens = {
  colors: {
    primary: { main: '#4F46E5', dark: '#3730A3', light: '#818CF8' },
    secondary: { main: '#6366F1', dark: '#4338CA', light: '#A5B4FC' },
    accent: { main: '#F59E0B', dark: '#D97706', light: '#FCD34D' },
    surface: { background: '#FFFFFF', card: '#FFFFFF', variant: '#F9FAFB' },
    text: { primary: '#111827', secondary: '#6B7280', on_primary: '#FFFFFF' },
    feedback: { success: '#10B981', warning: '#F59E0B', error: '#EF4444' },
    navigation: { background: '#FFFFFF', active: '#4F46E5', inactive: '#9CA3AF', indicator: '#4F46E5' },
    extras: { divider: '#E5E7EB', overlay: 'rgba(0,0,0,0.5)', shimmer_base: '#F3F4F6', shimmer_highlight: '#E5E7EB' },
  },
  typography: {
    families: { display: 'Inter', heading: 'Inter', body: 'Inter', mono: 'JetBrains Mono' },
    scale: { xs: '0.625rem', sm: '0.75rem', base: '0.875rem', md: '1rem', lg: '1.25rem', xl: '1.5rem', xxl: '2rem', xxxl: '2.75rem' },
    weight: { regular: '400', medium: '500', semibold: '600', bold: '700', extrabold: '800' },
    line_height: { tight: '1.2', normal: '1.5', relaxed: '1.75' },
    letter_spacing: { tight: '-0.02em', normal: '0em', wide: '0.04em', wider: '0.08em' },
  },
  shape: {
    radius: { none: '0px', xs: '4px', sm: '8px', md: '12px', lg: '16px', xl: '24px', full: '9999px' },
    components: { card: '16px', button: '12px', input: '10px', badge: '9999px', image: '12px' },
    shadow: { sm: '0 1px 2px rgba(0,0,0,0.05)', md: '0 4px 6px rgba(0,0,0,0.07)', lg: '0 10px 15px rgba(0,0,0,0.1)' },
    shadow_color: 'rgba(0,0,0,0.1)',
  },
  spacing: {
    screen_padding_h: '16px', screen_padding_v: '20px', card_padding: '16px', section_gap: '24px', item_gap: '12px',
    icon_size: { sm: '18px', md: '24px', lg: '32px' },
  },
  navigation: { style: 'bottom_tabs', tab_count: 4, show_labels: true, label_size: '0.625rem', icon_style: 'outline', active_indicator: 'pill' },
  imagery: { hero_aspect_ratio: '16:9', card_image_style: 'cover', placeholder_style: 'gradient', overlay_style: 'gradient_bottom', icon_theme: 'minimal' },
};

export const NewAppPage: React.FC = () => {
  const token = useAuthStore((s) => s.token);
  const navigate = useNavigate();

  const [selectedTemplate, setSelectedTemplate] = useState<NicheTemplate | null>(null);
  const [isBlankSelected, setIsBlankSelected] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManual, setSlugManual] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [appsUsed, setAppsUsed] = useState<number | null>(null);
  const [appsLimit, setAppsLimit] = useState<number | null>(null);
  const [planName, setPlanName] = useState('');

  useEffect(() => {
    if (!token) return;
    getSubscription(token)
      .then((info) => {
        setAppsUsed(info.usage.appsCount);
        setAppsLimit(info.subscription.plan.maxApps);
        setPlanName(info.subscription.plan.name);
      })
      .catch(() => { /* ignore — form still works, just no pre-check */ });
  }, [token]);

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugManual) {
      setSlug(generateSlug(value));
    }
  };

  const handleTemplateSelect = (template: NicheTemplate) => {
    setSelectedTemplate(template);
    setIsBlankSelected(false);
    // Auto-populate name from suggested_app_name if user hasn't typed yet
    if (!name.trim()) {
      setName(template.suggested_app_name);
      if (!slugManual) {
        setSlug(generateSlug(template.suggested_app_name));
      }
    }
  };

  const handleSelectBlank = () => {
    setSelectedTemplate(null);
    setIsBlankSelected(true);
  };

  const atLimit = appsUsed !== null && appsLimit !== null && appsUsed >= appsLimit;

  const handleCreate = async () => {
    if (!token || !name.trim() || !slug.trim()) return;
    setError('');
    setCreating(true);

    try {
      // Build initial schema from template modules (include tab metadata)
      const schema: CanvasElement[] = selectedTemplate
        ? selectedTemplate.default_modules.map((mod) => ({
            id: crypto.randomUUID(),
            moduleId: mod.module_id,
            config: { ...mod.default_config },
            tabIndex: mod.tab_position,
            tabLabel: mod.tab_label ?? '',
            tabIcon: mod.tab_icon ?? '',
          }))
        : [];

      const designTokens = selectedTemplate?.design_tokens ?? (isBlankSelected ? defaultDesignTokens : undefined);

      const app = await createApp(
        { name: name.trim(), slug: slug.trim(), schema, designTokens },
        token,
      );
      navigate(`/apps/${app.id}/edit`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la app.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] w-full px-4 sm:px-8 lg:px-12 max-w-[1600px] mx-auto py-12">
      <div className="mb-10">
        <button
          onClick={() => navigate('/dashboard')}
          className="group flex items-center space-x-1.5 text-[13px] font-semibold text-gray-500 hover:text-gray-900 transition-colors mb-8 w-fit"
        >
          <div className="w-8 h-8 rounded-full border border-gray-200 bg-white flex items-center justify-center group-hover:border-gray-300 shadow-sm transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </div>
          <span>Volver al Dashboard</span>
        </button>

        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 mb-3">Comienza un nuevo proyecto</h1>
        <p className="text-[17px] font-medium text-gray-500 max-w-2xl leading-relaxed">
          Dale vida a tu idea en segundos. Elige una plantilla preconfigurada con diseño profesional y módulos integrados para acelerar tu desarrollo.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 xl:gap-12 pl-2">
        {/* Left Column: Form & Details (Sticky) */}
        <div className="w-full lg:w-[420px] shrink-0">
          <div className="bg-white rounded-[24px] border border-gray-100 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sticky top-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">Configuración Inicial</h2>
              {appsUsed !== null && appsLimit !== null && (
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${atLimit ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                  {appsUsed}/{appsLimit} apps
                </span>
              )}
            </div>

            {atLimit && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm mb-4">
                <p className="font-bold text-amber-800">Has alcanzado el límite de apps</p>
                <p className="text-amber-700 mt-1">
                  Tu plan {planName} permite {appsLimit} app(s) y ya tienes {appsUsed}. Actualiza tu plan para crear más apps.
                </p>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700 font-medium mb-4">
                {error}
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Nombre de la Aplicación</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder={selectedTemplate?.suggested_app_name ?? 'Mi Primera App'}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">
                  ID del Proyecto (Slug)
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => { setSlugManual(true); setSlug(e.target.value); }}
                  placeholder="mi-primera-app"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono text-gray-500 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
                <p className="text-[11px] text-gray-400 mt-2 font-medium">Identificador único. Solo minúsculas, números y guiones.</p>
              </div>

              {/* Selected template summary */}
              {selectedTemplate && (
                <div className="p-4 bg-gray-50 border border-gray-100/50 rounded-xl space-y-3 mt-6">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl bg-white p-2 rounded-lg shadow-sm border border-gray-100">{selectedTemplate.preview_emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-bold text-gray-900">{selectedTemplate.name}</p>
                      <p className="text-[12px] font-medium text-gray-500 truncate">{selectedTemplate.tagline}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200/60">
                     <p className="text-[11px] font-medium text-gray-500">
                        {selectedTemplate.default_modules.length} módulos
                      </p>
                      <div className="flex gap-1">
                        {[
                          selectedTemplate.design_tokens.colors.primary.main,
                          selectedTemplate.design_tokens.colors.secondary.main,
                          selectedTemplate.design_tokens.colors.accent.main,
                        ].map((c, i) => (
                          <div key={i} className="w-5 h-5 rounded-full ring-2 ring-white shadow-sm" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                  </div>
                </div>
              )}

              <div className="pt-4">
                <button
                  onClick={handleCreate}
                  disabled={creating || !name.trim() || !slug.trim() || atLimit}
                  className="w-full py-3 bg-gradient-to-b from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-[15px] font-bold rounded-xl shadow-[0_4px_14px_0_rgba(0,118,255,0.39)] transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 disabled:shadow-none"
                >
                  {creating ? 'Construyendo...' : 'Crear Proyecto'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Templates Grid */}
        <div className="flex-1">
           <div className="bg-white rounded-2xl border border-gray-200/80 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
             <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Selecciona una Plantilla</h2>
                <span className="bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1 rounded-full">Recomendado</span>
             </div>
             
               <ThemeSelector
                  onSelect={handleTemplateSelect}
                  onSelectBlank={handleSelectBlank}
                  selectedId={isBlankSelected ? '__blank' : selectedTemplate?.id}
                />
           </div>
        </div>
      </div>
    </div>
  );
};
