import React from 'react';
import type { ModuleDefinition } from '../base/module.interface';
import { z } from 'zod';
import { Link } from 'lucide-react';

const ButtonSchema = z.object({
  label: z.string(),
  url: z.string(),
  style: z.enum(['solid', 'outline']),
  color: z.string(),
  textColor: z.string(),
  radius: z.string()
});

export type ButtonModuleData = z.infer<typeof ButtonSchema>;

const PreviewComponent: React.FC<{ data: ButtonModuleData; isSelected: boolean }> = ({ data, isSelected }) => {
  const isSolid = data.style === 'solid';
  const inlineStyles: React.CSSProperties = {
    borderRadius: data.radius,
    backgroundColor: isSolid ? data.color : 'transparent',
    color: data.textColor || (isSolid ? '#fff' : data.color),
    border: isSolid ? 'none' : `2px solid ${data.color}`,
    padding: '12px 24px',
    textAlign: 'center',
    display: 'block',
    width: '100%',
    fontWeight: 'bold',
    cursor: 'pointer'
  };

  return (
    <div className={`p-2 transition-all ${isSelected ? 'ring-2 ring-blue-500 rounded bg-blue-50' : ''}`}>
      <div style={inlineStyles}>
        {data.label || 'Botón de Enlace'}
      </div>
    </div>
  );
};

const RuntimeComponent: React.FC<{ data: ButtonModuleData }> = ({ data }) => {
  const isSolid = data.style === 'solid';
  const inlineStyles: React.CSSProperties = {
    borderRadius: data.radius,
    backgroundColor: isSolid ? data.color : 'transparent',
    color: data.textColor || (isSolid ? '#fff' : data.color),
    border: isSolid ? 'none' : `2px solid ${data.color}`,
    padding: '12px 24px',
    textAlign: 'center',
    display: 'block',
    width: '100%',
    fontWeight: 'bold',
    textDecoration: 'none'
  };

  return (
    <div style={{ padding: '8px' }}>
      <a href={data.url || '#'} style={inlineStyles}>
        {data.label}
      </a>
    </div>
  );
};

const SettingsPanel: React.FC<{ data: ButtonModuleData; onChange: (data: ButtonModuleData) => void }> = ({ data, onChange }) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Texto del botón</label>
        <input 
          type="text"
          className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
          value={data.label}
          onChange={(e) => onChange({ ...data, label: e.target.value })}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">URL de destino</label>
        <input 
          type="text"
          className="w-full border border-gray-300 rounded p-2 text-sm"
          value={data.url}
          onChange={(e) => onChange({ ...data, url: e.target.value })}
          placeholder="https://"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Estilo</label>
        <select 
          className="w-full border border-gray-300 rounded p-2 text-sm"
          value={data.style}
          onChange={(e) => onChange({ ...data, style: e.target.value as any })}
        >
          <option value="solid">Sólido</option>
          <option value="outline">Contorno</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Color Principal (Hex)</label>
        <div className="flex space-x-2">
          <input 
            type="color"
            value={data.color}
            onChange={(e) => onChange({ ...data, color: e.target.value })}
            className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
          />
          <input 
            type="text"
            className="flex-1 border border-gray-300 rounded p-2 text-sm uppercase"
            value={data.color}
            onChange={(e) => onChange({ ...data, color: e.target.value })}
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Color del texto (Hex)</label>
        <div className="flex space-x-2">
          <input
            type="color"
            value={data.textColor}
            onChange={(e) => onChange({ ...data, textColor: e.target.value })}
            className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
          />
          <input
            type="text"
            className="flex-1 border border-gray-300 rounded p-2 text-sm uppercase"
            value={data.textColor}
            onChange={(e) => onChange({ ...data, textColor: e.target.value })}
          />
        </div>
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
    </div>
  );
};

export const ButtonModule: ModuleDefinition<ButtonModuleData> = {
  id: 'button_module',
  name: 'Botón',
  description: 'Un botón con enlace web',
  icon: <Link size={20} />,
  schema: ButtonSchema,
  defaultConfig: {
    label: 'Visitar Web',
    url: '',
    style: 'solid',
    color: '#2563eb', // blue-600
    textColor: '#ffffff',
    radius: '8px'
  },
  PreviewComponent,
  RuntimeComponent,
  SettingsPanel
};
