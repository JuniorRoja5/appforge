import React, { useState } from 'react';
import type { ModuleDefinition } from '../base/module.interface';
import { z } from 'zod';
import {
  Link2, Globe, Facebook, Instagram, Twitter, Youtube,
  Phone, Mail, Linkedin, MessageCircle, Send,
  Plus, Trash2, ArrowUp, ArrowDown, ChevronDown, ChevronUp,
} from 'lucide-react';

// --- Zod schema ---
const LinkItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  url: z.string(),
  icon: z.enum([
    'globe', 'facebook', 'instagram', 'twitter', 'youtube',
    'tiktok', 'whatsapp', 'telegram', 'email', 'phone', 'linkedin', 'custom',
  ]),
});

const LinksConfigSchema = z.object({
  title: z.string(),
  links: z.array(LinkItemSchema),
  style: z.enum(['list', 'buttons', 'cards']),
});

export type LinksConfig = z.infer<typeof LinksConfigSchema>;
type LinkItem = z.infer<typeof LinkItemSchema>;

// --- Icon map ---
const ICON_MAP: Record<string, React.ReactNode> = {
  globe: <Globe size={16} />,
  facebook: <Facebook size={16} />,
  instagram: <Instagram size={16} />,
  twitter: <Twitter size={16} />,
  youtube: <Youtube size={16} />,
  tiktok: <span className="text-[11px] font-bold">TT</span>,
  whatsapp: <MessageCircle size={16} />,
  telegram: <Send size={16} />,
  email: <Mail size={16} />,
  phone: <Phone size={16} />,
  linkedin: <Linkedin size={16} />,
  custom: <Link2 size={16} />,
};

const ICON_COLORS: Record<string, string> = {
  facebook: 'bg-blue-600 text-white',
  instagram: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 text-white',
  twitter: 'bg-black text-white',
  youtube: 'bg-red-600 text-white',
  tiktok: 'bg-black text-white',
  whatsapp: 'bg-green-500 text-white',
  telegram: 'bg-sky-500 text-white',
  email: 'bg-gray-600 text-white',
  phone: 'bg-emerald-600 text-white',
  linkedin: 'bg-blue-700 text-white',
  globe: 'bg-indigo-500 text-white',
  custom: 'bg-gray-500 text-white',
};

const ICON_OPTIONS = [
  { value: 'globe', label: 'Web' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'twitter', label: 'X / Twitter' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Teléfono' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'custom', label: 'Otro' },
] as const;

// --- Preview Component ---
const PreviewComponent: React.FC<{ data: LinksConfig; isSelected: boolean }> = ({ data, isSelected }) => {
  const links = data.links ?? [];
  const hasLinks = links.length > 0;

  return (
    <div className={`transition-all ${isSelected ? 'ring-2 ring-blue-500 rounded p-1' : ''}`}>
      <div className="bg-white rounded-lg overflow-hidden">
        {/* Header */}
        <div className="px-3 py-2 flex items-center gap-1.5" style={{ background: 'linear-gradient(to right, var(--af-color-primary, #6366f1), var(--af-color-secondary, #3b82f6))' }}>
          <Link2 size={12} className="text-white" />
          <span className="text-white text-xs font-bold">{data.title || 'ENLACES'}</span>
        </div>

        {!hasLinks ? (
          <div className="flex flex-col items-center justify-center py-6 text-gray-400">
            <Link2 size={20} className="mb-1 opacity-50" />
            <p className="text-[10px]">Añade enlaces en la configuración</p>
          </div>
        ) : data.style === 'buttons' ? (
          /* Buttons style (Linktree-like) */
          <div className="p-3 space-y-2">
            {links.map(link => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-full border border-gray-200 transition-colors cursor-pointer no-underline"
              >
                <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${ICON_COLORS[link.icon]}`}>
                  {ICON_MAP[link.icon]}
                </span>
                <span className="text-xs font-medium text-gray-800 truncate flex-1 text-center">{link.label}</span>
              </a>
            ))}
          </div>
        ) : data.style === 'cards' ? (
          /* Cards style */
          <div className="p-2 grid grid-cols-2 gap-2">
            {links.map(link => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex flex-col items-center gap-1.5 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer no-underline"
              >
                <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${ICON_COLORS[link.icon]}`}>
                  {React.cloneElement(ICON_MAP[link.icon] as React.ReactElement<{ size?: number }>, { size: 20 })}
                </span>
                <span className="text-[10px] font-medium text-gray-700 text-center truncate w-full">{link.label}</span>
              </a>
            ))}
          </div>
        ) : (
          /* List style (default) */
          <div className="divide-y divide-gray-100">
            {links.map(link => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 transition-colors cursor-pointer no-underline"
              >
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${ICON_COLORS[link.icon]}`}>
                  {ICON_MAP[link.icon]}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate">{link.label}</p>
                  <p className="text-[9px] text-gray-400 truncate">{link.url}</p>
                </div>
                <ChevronDown size={12} className="text-gray-300 rotate-[-90deg] shrink-0" />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// --- Runtime Component ---
const RuntimeComponent: React.FC<{ data: LinksConfig }> = ({ data }) => (
  <div style={{ padding: '16px' }}>
    <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px' }}>Enlaces</h2>
    <p style={{ color: '#888', fontSize: '14px' }}>
      {(data.links ?? []).length} enlace{(data.links ?? []).length !== 1 ? 's' : ''} configurados.
      Se renderizarán dinámicamente en la app generada.
    </p>
  </div>
);

// --- Settings Panel ---
const SettingsPanel: React.FC<{ data: LinksConfig; onChange: (data: LinksConfig) => void }> = ({ data, onChange }) => {
  const [configOpen, setConfigOpen] = useState(true);

  const addLink = () => {
    const newLink: LinkItem = {
      id: Date.now().toString(),
      label: 'Nuevo enlace',
      url: 'https://',
      icon: 'globe',
    };
    onChange({ ...data, links: [...data.links, newLink] });
  };

  const updateLink = (id: string, updates: Partial<LinkItem>) => {
    onChange({
      ...data,
      links: data.links.map(l => l.id === id ? { ...l, ...updates } : l),
    });
  };

  const removeLink = (id: string) => {
    onChange({ ...data, links: data.links.filter(l => l.id !== id) });
  };

  const moveLink = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= data.links.length) return;
    const newLinks = [...data.links];
    [newLinks[index], newLinks[newIndex]] = [newLinks[newIndex], newLinks[index]];
    onChange({ ...data, links: newLinks });
  };

  return (
    <div className="space-y-4">
      {/* Section 1: Configuration */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <button
          onClick={() => setConfigOpen(o => !o)}
          className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <span className="text-sm font-bold text-gray-800">Configuración</span>
          {configOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {configOpen && (
          <div className="p-3 space-y-3">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
              <input
                type="text"
                value={data.title}
                onChange={e => onChange({ ...data, title: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Nuestras redes"
              />
            </div>

            {/* Style */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estilo</label>
              <div className="flex gap-1">
                {[
                  { value: 'list' as const, label: 'Lista' },
                  { value: 'buttons' as const, label: 'Botones' },
                  { value: 'cards' as const, label: 'Tarjetas' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => onChange({ ...data, style: opt.value })}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      data.style === opt.value
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Section 2: Links */}
      <div>
        <h3 className="text-sm font-bold text-gray-800 mb-3">Enlaces</h3>

        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {data.links.map((link, index) => (
            <div key={link.id} className="border border-gray-200 rounded-lg bg-white p-2 space-y-2">
              <div className="flex items-center gap-1">
                {/* Icon selector */}
                <select
                  value={link.icon}
                  onChange={e => updateLink(link.id, { icon: e.target.value as LinkItem['icon'] })}
                  className="border border-gray-300 rounded px-1.5 py-1 text-xs w-24 shrink-0"
                >
                  {ICON_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>

                {/* Move + delete */}
                <div className="flex gap-0.5 ml-auto shrink-0">
                  <button
                    onClick={() => moveLink(index, -1)}
                    disabled={index === 0}
                    className={`p-1 rounded ${index === 0 ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-100'}`}
                  >
                    <ArrowUp size={12} />
                  </button>
                  <button
                    onClick={() => moveLink(index, 1)}
                    disabled={index === data.links.length - 1}
                    className={`p-1 rounded ${index === data.links.length - 1 ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-100'}`}
                  >
                    <ArrowDown size={12} />
                  </button>
                  <button
                    onClick={() => removeLink(link.id)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              {/* Label */}
              <input
                type="text"
                value={link.label}
                onChange={e => updateLink(link.id, { label: e.target.value })}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs"
                placeholder="Nombre del enlace"
              />

              {/* URL */}
              <input
                type="text"
                value={link.url}
                onChange={e => updateLink(link.id, { url: e.target.value })}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs font-mono"
                placeholder="https://..."
              />
            </div>
          ))}
        </div>

        <button
          onClick={addLink}
          className="w-full mt-2 flex items-center justify-center gap-1 px-3 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors"
        >
          <Plus size={14} /> Agregar Enlace
        </button>

        {data.links.length > 0 && (
          <p className="text-xs text-gray-400 text-center mt-2">
            {data.links.length} enlace{data.links.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  );
};

// --- Module Definition ---
export const LinksModule: ModuleDefinition<LinksConfig> = {
  id: 'links',
  name: 'Enlaces',
  description: 'Lista de links externos y redes sociales',
  icon: <Link2 size={20} />,
  schema: LinksConfigSchema,
  defaultConfig: {
    title: 'Nuestras Redes',
    links: [
      { id: '1', label: 'Sitio Web', url: 'https://example.com', icon: 'globe' },
      { id: '2', label: 'Facebook', url: 'https://facebook.com', icon: 'facebook' },
      { id: '3', label: 'Instagram', url: 'https://instagram.com', icon: 'instagram' },
    ],
    style: 'buttons',
  },
  PreviewComponent,
  RuntimeComponent,
  SettingsPanel,
};
