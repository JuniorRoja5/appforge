import React from 'react';
import type { ModuleDefinition } from '../base/module.interface';
import { z } from 'zod';
import { Image as ImageIcon } from 'lucide-react';
import { resolveAssetUrl } from '../../lib/resolve-asset-url';
import { ImageInputField } from '../../components/shared/ImageInputField';

const ImageSchema = z.object({
  url: z.string().refine(
    (v) => v === '' || v.startsWith('http') || v.startsWith('/'),
    'URL inválida (debe ser http(s) o ruta relativa)',
  ),
  alt: z.string(),
  objectFit: z.enum(['cover', 'contain', 'fill']),
  radius: z.string(),
  height: z.string()
});

export type ImageModuleData = z.infer<typeof ImageSchema>;

const PreviewComponent: React.FC<{ data: ImageModuleData; isSelected: boolean }> = ({ data, isSelected }) => {
  return (
    <div className={`transition-all ${isSelected ? 'ring-2 ring-blue-500 rounded bg-blue-50 p-1' : ''}`}>
      {data.url ? (
        <img 
          src={resolveAssetUrl(data.url)} 
          alt={data.alt} 
          style={{ objectFit: data.objectFit, borderRadius: data.radius, height: data.height, width: '100%' }}
          className="bg-gray-200"
        />
      ) : (
        <div className="bg-gray-200 w-full flex items-center justify-center text-gray-400" style={{ borderRadius: data.radius, height: data.height }}>
          <ImageIcon size={32} />
        </div>
      )}
    </div>
  );
};

const RuntimeComponent: React.FC<{ data: ImageModuleData }> = ({ data }) => {
  if (!data.url) return null;
  return (
    <img 
      src={resolveAssetUrl(data.url)} 
      alt={data.alt} 
      style={{ objectFit: data.objectFit, borderRadius: data.radius, width: '100%', height: data.height }}
    />
  );
};

const SettingsPanel: React.FC<{ data: ImageModuleData; onChange: (data: ImageModuleData) => void }> = ({ data, onChange }) => {
  return (
    <div className="space-y-4">
      <ImageInputField
        value={data.url}
        onChange={(url) => onChange({ ...data, url })}
        accentColor="blue"
        shape="video"
        previewSize="lg"
        label="Imagen"
        urlPlaceholder="https://ejemplo.com/imagen.jpg"
        maxSizeMB={10}
      />
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Texto alternativo (Alt)</label>
        <input 
          type="text"
          className="w-full border border-gray-300 rounded p-2 text-sm"
          value={data.alt}
          onChange={(e) => onChange({ ...data, alt: e.target.value })}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Ajuste (Object Fit)</label>
        <select 
          className="w-full border border-gray-300 rounded p-2 text-sm"
          value={data.objectFit}
          onChange={(e) => onChange({ ...data, objectFit: e.target.value as any })}
        >
          <option value="cover">Cubrir (Cover)</option>
          <option value="contain">Contener (Contain)</option>
          <option value="fill">Rellenar (Fill)</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Bordes Redondeados</label>
        <div className="flex space-x-2">
          <input 
            type="number"
            min="0"
            className="flex-1 border border-gray-300 rounded p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
            value={parseFloat(data.radius) || 0}
            onChange={(e) => {
              const unit = data.radius.includes('%') ? '%' : 'px';
              onChange({ ...data, radius: `${e.target.value}${unit}` });
            }}
          />
          <select 
            className="w-24 border border-gray-300 rounded p-2 text-sm bg-gray-50 focus:ring-blue-500 focus:border-blue-500"
            value={data.radius.includes('%') ? '%' : 'px'}
            onChange={(e) => {
              const val = parseFloat(data.radius) || 0;
              onChange({ ...data, radius: `${val}${e.target.value}` });
            }}
          >
            <option value="px">Píxeles</option>
            <option value="%">Porcentaje</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Altura de la Imagen</label>
        <div className="flex space-x-2">
          <input 
            type="number"
            min="10"
            className="flex-1 border border-gray-300 rounded p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
            value={parseFloat(data.height) || 200}
            onChange={(e) => {
              const unit = data.height.includes('vh') ? 'vh' : data.height.includes('%') ? '%' : 'px';
              onChange({ ...data, height: `${e.target.value}${unit}` });
            }}
          />
          <select 
            className="w-24 border border-gray-300 rounded p-2 text-sm bg-gray-50 focus:ring-blue-500 focus:border-blue-500"
            value={data.height.includes('vh') ? 'vh' : data.height.includes('%') ? '%' : 'px'}
            onChange={(e) => {
              const val = parseFloat(data.height) || 200;
              onChange({ ...data, height: `${val}${e.target.value}` });
            }}
          >
            <option value="px">Píxeles</option>
            <option value="%">Porcentaje</option>
            <option value="vh">Alto Pantalla (vh)</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export const ImageModule: ModuleDefinition<ImageModuleData> = {
  id: 'image_module',
  name: 'Imagen',
  description: 'Muestra una imagen desde una URL',
  icon: <ImageIcon size={20} />,
  schema: ImageSchema,
  defaultConfig: {
    url: '',
    alt: 'Imagen',
    objectFit: 'cover',
    radius: '8px',
    height: '250px'
  },
  PreviewComponent,
  RuntimeComponent,
  SettingsPanel
};
