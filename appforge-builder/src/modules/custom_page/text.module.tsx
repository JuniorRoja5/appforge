import React from 'react';
import type { ModuleDefinition } from '../base/module.interface';
import { Type } from 'lucide-react';
// Phase 3a — schema imported from the shared package (single source of
// truth for both builder and runtime). The local Zod declaration is
// gone; rename was TextSchema → TextModuleConfigSchema and TextModuleData
// → TextModuleConfig to match the shared naming convention.
import { TextModuleConfigSchema, type TextModuleConfig } from '../../lib/shared/module-schemas/text_module.schema';

type TextModuleData = TextModuleConfig;

const PreviewComponent: React.FC<{ data: TextModuleData; isSelected: boolean }> = ({ data, isSelected }) => {
  return (
    <div 
      className={`p-2 transition-all ${isSelected ? 'ring-2 ring-blue-500 rounded bg-blue-50' : 'hover:bg-gray-50'}`}
      style={{ textAlign: data.align, fontSize: data.fontSize }}
    >
      <p>{data.content || 'Añade tu texto aquí'}</p>
    </div>
  );
};

const RuntimeComponent: React.FC<{ data: TextModuleData }> = ({ data }) => {
  // En capacitor, solo es p layout
  return (
    <div style={{ textAlign: data.align, fontSize: data.fontSize, padding: '8px' }}>
      <p>{data.content}</p>
    </div>
  );
};

const SettingsPanel: React.FC<{ data: TextModuleData; onChange: (data: TextModuleData) => void }> = ({ data, onChange }) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Contenido</label>
        <textarea 
          className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-primary focus:border-primary"
          rows={4}
          value={data.content}
          onChange={(e) => onChange({ ...data, content: e.target.value })}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Alineación</label>
        <select 
          className="w-full border border-gray-300 rounded p-2 text-sm"
          value={data.align}
          onChange={(e) => onChange({ ...data, align: e.target.value as any })}
        >
          <option value="left">Izquierda</option>
          <option value="center">Centro</option>
          <option value="right">Derecha</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tamaño (CSS)</label>
        <div className="flex space-x-2">
          <select 
            className="w-1/2 border border-gray-300 rounded p-2 text-sm"
            value={['12px','14px','16px','20px','24px','32px'].includes(data.fontSize) ? data.fontSize : 'custom'}
            onChange={(e) => {
              if (e.target.value !== 'custom') {
                onChange({ ...data, fontSize: e.target.value });
              }
            }}
          >
            <option value="12px">Pequeño (12px)</option>
            <option value="14px">Normal (14px)</option>
            <option value="16px">Mediano (16px)</option>
            <option value="20px">Grande (20px)</option>
            <option value="24px">Muy Grande (24px)</option>
            <option value="32px">Título (32px)</option>
            <option value="custom">Personalizado</option>
          </select>
          <input 
            type="text"
            className="w-1/2 border border-gray-300 rounded p-2 text-sm"
            value={data.fontSize}
            onChange={(e) => onChange({ ...data, fontSize: e.target.value })}
            placeholder="e.g. 18px"
          />
        </div>
      </div>
    </div>
  );
};

export const TextModule: ModuleDefinition<TextModuleData> = {
  id: 'text_module',
  name: 'Bloque de Texto',
  description: 'Añade párrafos y texto simple',
  icon: <Type size={20} />,
  schema: TextModuleConfigSchema,
  defaultConfig: {
    content: 'Texto de prueba',
    align: 'left',
    fontSize: '16px'
  },
  PreviewComponent,
  RuntimeComponent,
  SettingsPanel
};
