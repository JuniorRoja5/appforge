import React, { useState } from 'react';
import type { ModuleDefinition } from '../base/module.interface';
import { z } from 'zod';
import {
  Phone,
  Mail,
  Instagram,
  Facebook,
  Linkedin,
  Globe,
  MessageCircle,
  User,
  Plus,
  Trash2,
  ChevronDown,
} from 'lucide-react';
import { resolveAssetUrl } from '../../lib/resolve-asset-url';
import { ImageInputField } from '../../components/shared/ImageInputField';

// --- Zod schemas ---

const QuickLinkSchema = z.object({
  id: z.string(),
  type: z.enum(['phone', 'email', 'instagram', 'facebook', 'whatsapp', 'linkedin', 'web']),
  value: z.string(),
});

type QuickLink = z.infer<typeof QuickLinkSchema>;

const HeroProfileConfigSchema = z.object({
  coverImageUrl: z.string(),
  profileImageUrl: z.string(),
  name: z.string(),
  subtitle: z.string(),
  description: z.string(),
  quickLinks: z.array(QuickLinkSchema),
  layout: z.enum(['centered', 'left', 'overlap']),
  coverHeight: z.enum(['small', 'medium', 'large']),
});

type HeroProfileConfig = z.infer<typeof HeroProfileConfigSchema>;

// --- Icon map for quick link types ---

const quickLinkIconMap: Record<QuickLink['type'], React.ReactNode> = {
  phone: <Phone size={16} />,
  email: <Mail size={16} />,
  instagram: <Instagram size={16} />,
  facebook: <Facebook size={16} />,
  whatsapp: <MessageCircle size={16} />,
  linkedin: <Linkedin size={16} />,
  web: <Globe size={16} />,
};

const quickLinkColorMap: Record<QuickLink['type'], string> = {
  phone: 'bg-green-500 text-white',
  email: 'bg-red-500 text-white',
  instagram: 'bg-gradient-to-br from-purple-500 to-pink-500 text-white',
  facebook: 'bg-blue-600 text-white',
  whatsapp: 'bg-emerald-500 text-white',
  linkedin: 'bg-blue-700 text-white',
  web: 'bg-gray-600 text-white',
};

const quickLinkLabels: Record<QuickLink['type'], string> = {
  phone: 'Telefono',
  email: 'Email',
  instagram: 'Instagram',
  facebook: 'Facebook',
  whatsapp: 'WhatsApp',
  linkedin: 'LinkedIn',
  web: 'Web',
};

const coverHeightClasses: Record<HeroProfileConfig['coverHeight'], string> = {
  small: 'h-28',
  medium: 'h-36',
  large: 'h-44',
};

const getQuickLinkHref = (link: QuickLink): string => {
  switch (link.type) {
    case 'phone':
      return `tel:${link.value}`;
    case 'email':
      return `mailto:${link.value}`;
    case 'whatsapp':
      return `https://wa.me/${link.value}`;
    case 'instagram':
      return `https://instagram.com/${link.value}`;
    case 'facebook':
      return link.value.startsWith('http') ? link.value : `https://facebook.com/${link.value}`;
    case 'linkedin':
      return link.value.startsWith('http') ? link.value : `https://linkedin.com/in/${link.value}`;
    case 'web':
      return link.value.startsWith('http') ? link.value : `https://${link.value}`;
    default:
      return '#';
  }
};

// ========================
// PreviewComponent
// ========================
const PreviewComponent: React.FC<{ data: HeroProfileConfig; isSelected: boolean }> = ({
  data: rawData,
  isSelected,
}) => {
  const data = { ...rawData, quickLinks: rawData.quickLinks ?? [] };
  const isCentered = data.layout === 'centered' || data.layout === 'overlap';
  const isOverlap = data.layout === 'overlap';

  return (
    <div
      className={`overflow-hidden transition-all ${
        isSelected ? 'ring-2 ring-blue-500 rounded-lg' : ''
      }`}
    >
      {/* Cover area */}
      <div className={`relative ${coverHeightClasses[data.coverHeight]} w-full overflow-hidden`}>
        {data.coverImageUrl ? (
          <img
            src={resolveAssetUrl(data.coverImageUrl)}
            alt="Cover"
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full"
            style={{
              background: `linear-gradient(135deg, var(--af-color-primary, #4F46E5), var(--af-color-primary-dark, #3730A3))`,
            }}
          />
        )}
        {/* Subtle overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
      </div>

      {/* Profile section */}
      <div
        className={`px-4 ${isOverlap ? '-mt-14' : '-mt-10'} ${
          isCentered ? 'flex flex-col items-center text-center' : 'flex flex-col items-start text-left'
        }`}
      >
        {/* Profile image */}
        <div className="relative">
          {data.profileImageUrl ? (
            <img
              src={resolveAssetUrl(data.profileImageUrl)}
              alt={data.name}
              className="w-20 h-20 rounded-full border-4 border-white shadow-lg object-cover"
            />
          ) : (
            <div
              className="w-20 h-20 rounded-full border-4 border-white shadow-lg flex items-center justify-center text-white text-2xl font-bold"
              style={{
                background: `linear-gradient(135deg, var(--af-color-primary, #4F46E5), var(--af-color-primary-dark, #3730A3))`,
              }}
            >
              {data.name ? data.name.charAt(0).toUpperCase() : 'A'}
            </div>
          )}
        </div>

        {/* Name */}
        <h2 className="text-lg font-bold text-gray-900 mt-2 leading-tight">
          {data.name || 'Sin nombre'}
        </h2>

        {/* Subtitle */}
        <p
          className="text-sm font-medium mt-0.5"
          style={{ color: 'var(--af-color-primary, #4F46E5)' }}
        >
          {data.subtitle || 'Subtitulo'}
        </p>

        {/* Description */}
        <p className="text-xs text-gray-500 mt-2 leading-relaxed line-clamp-3 px-1">
          {data.description || 'Descripcion del negocio...'}
        </p>

        {/* Quick links */}
        {(data.quickLinks ?? []).length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4 mb-3 justify-center">
            {(data.quickLinks ?? []).map((link) => (
              <a
                key={link.id}
                href={getQuickLinkHref(link)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-transform hover:scale-110 cursor-pointer ${quickLinkColorMap[link.type]}`}
                title={`${quickLinkLabels[link.type]}: ${link.value}`}
              >
                {quickLinkIconMap[link.type]}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ========================
// RuntimeComponent
// ========================
const RuntimeComponent: React.FC<{ data: HeroProfileConfig }> = () => (
  <div className="p-6 text-center text-gray-500 text-sm">
    <User className="mx-auto mb-2 text-gray-400" size={32} />
    <p>El perfil Hero sera renderizado en la app nativa.</p>
  </div>
);

// ========================
// SettingsPanel
// ========================
const SettingsPanel: React.FC<{
  data: HeroProfileConfig;
  onChange: (data: HeroProfileConfig) => void;
}> = ({ data: rawData, onChange }) => {
  const data = { ...rawData, quickLinks: rawData.quickLinks ?? [] };
  const [openSection, setOpenSection] = useState<'general' | 'links' | 'layout'>('general');

  const toggleSection = (section: 'general' | 'links' | 'layout') => {
    setOpenSection(openSection === section ? section : section);
  };

  // --- Quick link management ---
  const addQuickLink = () => {
    const newLink: QuickLink = {
      id: Date.now().toString(),
      type: 'phone',
      value: '',
    };
    onChange({ ...data, quickLinks: [...data.quickLinks, newLink] });
  };

  const removeQuickLink = (id: string) => {
    onChange({ ...data, quickLinks: data.quickLinks.filter((l) => l.id !== id) });
  };

  const updateQuickLink = (id: string, updates: Partial<QuickLink>) => {
    onChange({
      ...data,
      quickLinks: data.quickLinks.map((l) => (l.id === id ? { ...l, ...updates } : l)),
    });
  };

  // --- Section header ---
  const SectionHeader: React.FC<{ id: 'general' | 'links' | 'layout'; title: string }> = ({
    id,
    title,
  }) => (
    <button
      onClick={() => toggleSection(id)}
      className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
        openSection === id
          ? 'bg-purple-100 text-purple-800'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      <span>{title}</span>
      <ChevronDown
        size={16}
        className={`transition-transform ${openSection === id ? 'rotate-180' : ''}`}
      />
    </button>
  );

  return (
    <div className="space-y-3">
      {/* ====== SECTION 1: General ====== */}
      <SectionHeader id="general" title="Informacion del perfil" />
      {openSection === 'general' && (
        <div className="space-y-3 px-1">
          {/* Cover image */}
          <ImageInputField
            value={data.coverImageUrl}
            onChange={(url) => onChange({ ...data, coverImageUrl: url })}
            accentColor="purple"
            shape="cover"
            previewSize="lg"
            label="Imagen de portada"
            urlPlaceholder="https://ejemplo.com/portada.jpg"
            maxSizeMB={5}
          />

          {/* Profile image */}
          <ImageInputField
            value={data.profileImageUrl}
            onChange={(url) => onChange({ ...data, profileImageUrl: url })}
            accentColor="purple"
            shape="circle"
            previewSize="md"
            label="Foto de perfil"
            urlPlaceholder="https://ejemplo.com/perfil.jpg"
            maxSizeMB={2}
          />

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Nombre</label>
            <input
              type="text"
              value={data.name}
              onChange={(e) => onChange({ ...data, name: e.target.value })}
              className="w-full px-2 py-1.5 border rounded text-sm"
              placeholder="Mi Negocio"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Subtitulo</label>
            <input
              type="text"
              value={data.subtitle}
              onChange={(e) => onChange({ ...data, subtitle: e.target.value })}
              className="w-full px-2 py-1.5 border rounded text-sm"
              placeholder="Tu eslogan aqui"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Descripcion</label>
            <textarea
              value={data.description}
              onChange={(e) => onChange({ ...data, description: e.target.value })}
              className="w-full px-2 py-1.5 border rounded text-sm resize-none"
              rows={3}
              placeholder="Descripcion del negocio..."
            />
          </div>
        </div>
      )}

      {/* ====== SECTION 2: Quick Links ====== */}
      <SectionHeader id="links" title="Enlaces rapidos" />
      {openSection === 'links' && (
        <div className="space-y-2 px-1">
          {data.quickLinks.map((link) => (
            <div
              key={link.id}
              className="flex items-center gap-2 p-2 border rounded-lg bg-white"
            >
              <div className="flex-1 space-y-1.5">
                <select
                  value={link.type}
                  onChange={(e) =>
                    updateQuickLink(link.id, {
                      type: e.target.value as QuickLink['type'],
                    })
                  }
                  className="w-full px-2 py-1 border rounded text-xs"
                >
                  {(
                    Object.keys(quickLinkLabels) as QuickLink['type'][]
                  ).map((t) => (
                    <option key={t} value={t}>
                      {quickLinkLabels[t]}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={link.value}
                  onChange={(e) => updateQuickLink(link.id, { value: e.target.value })}
                  className="w-full px-2 py-1 border rounded text-xs"
                  placeholder={
                    link.type === 'phone'
                      ? '+34 600 000 000'
                      : link.type === 'email'
                        ? 'info@negocio.com'
                        : link.type === 'web'
                          ? 'https://minegocio.com'
                          : '@usuario'
                  }
                />
              </div>
              <button
                onClick={() => removeQuickLink(link.id)}
                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                title="Eliminar"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          <button
            onClick={addQuickLink}
            className="w-full flex items-center justify-center gap-1 py-2 border-2 border-dashed border-purple-300 text-purple-600 rounded-lg text-xs hover:bg-purple-50"
          >
            <Plus size={14} /> Agregar enlace
          </button>
        </div>
      )}

      {/* ====== SECTION 3: Layout ====== */}
      <SectionHeader id="layout" title="Diseno y estilo" />
      {openSection === 'layout' && (
        <div className="space-y-4 px-1">
          {/* Layout selector */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Disposicion</label>
            <div className="space-y-1.5">
              {(
                [
                  { value: 'centered', label: 'Centrado', desc: 'Contenido centrado debajo de la portada' },
                  { value: 'left', label: 'Izquierda', desc: 'Contenido alineado a la izquierda' },
                  { value: 'overlap', label: 'Solapado', desc: 'Perfil superpuesto sobre la portada' },
                ] as const
              ).map((option) => (
                <label
                  key={option.value}
                  className={`flex items-start gap-2 p-2 border rounded-lg cursor-pointer transition-colors ${
                    data.layout === option.value
                      ? 'border-purple-400 bg-purple-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="layout"
                    value={option.value}
                    checked={data.layout === option.value}
                    onChange={(e) =>
                      onChange({
                        ...data,
                        layout: e.target.value as HeroProfileConfig['layout'],
                      })
                    }
                    className="mt-0.5 accent-purple-600"
                  />
                  <div>
                    <span className="text-xs font-medium text-gray-800">{option.label}</span>
                    <p className="text-[10px] text-gray-500">{option.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Cover height selector */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Altura de portada
            </label>
            <div className="space-y-1.5">
              {(
                [
                  { value: 'small', label: 'Pequena' },
                  { value: 'medium', label: 'Mediana' },
                  { value: 'large', label: 'Grande' },
                ] as const
              ).map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center gap-2 p-2 border rounded-lg cursor-pointer transition-colors ${
                    data.coverHeight === option.value
                      ? 'border-purple-400 bg-purple-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="coverHeight"
                    value={option.value}
                    checked={data.coverHeight === option.value}
                    onChange={(e) =>
                      onChange({
                        ...data,
                        coverHeight: e.target.value as HeroProfileConfig['coverHeight'],
                      })
                    }
                    className="accent-purple-600"
                  />
                  <span className="text-xs font-medium text-gray-800">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ========================
// Module Definition
// ========================
export const HeroProfileModule: ModuleDefinition<HeroProfileConfig> = {
  id: 'hero_profile',
  name: 'Hero / Perfil',
  icon: <User size={20} />,
  description: 'Seccion hero con portada, foto de perfil, nombre, subtitulo y enlaces rapidos',
  schema: HeroProfileConfigSchema,
  defaultConfig: {
    coverImageUrl: '',
    profileImageUrl: '',
    name: 'Mi Negocio',
    subtitle: 'Tu eslogan aqui',
    description:
      'Bienvenido a nuestro negocio. Ofrecemos los mejores servicios y productos para ti.',
    quickLinks: [
      { id: '1', type: 'phone', value: '+34 600 000 000' },
      { id: '2', type: 'email', value: 'info@minegocio.com' },
      { id: '3', type: 'instagram', value: 'minegocio' },
    ],
    layout: 'centered',
    coverHeight: 'medium',
  },
  PreviewComponent,
  RuntimeComponent,
  SettingsPanel,
};
