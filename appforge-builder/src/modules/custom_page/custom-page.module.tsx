import React, { useState } from 'react';
import type { ModuleDefinition } from '../base/module.interface';
import { z } from 'zod';
import { FileText, ChevronDown, ChevronUp, Palette } from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

// --- Zod schema ---
const CustomPageConfigSchema = z.object({
  htmlContent: z.string(),
  backgroundColor: z.string(),
  padding: z.number(),
  maxWidth: z.enum(['full', 'narrow', 'medium']),
});

export type CustomPageConfig = z.infer<typeof CustomPageConfigSchema>;

// --- Quill config (extended from news_feed with image support) ---
const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ align: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ color: [] }, { background: [] }],
    ['link', 'image'],
    ['clean'],
  ],
};

const QUILL_FORMATS = [
  'header', 'bold', 'italic', 'underline', 'strike',
  'align', 'list', 'color', 'background', 'link', 'image',
];

// --- Max width mapping ---
const MAX_WIDTH_MAP = {
  full: '100%',
  medium: '85%',
  narrow: '70%',
};

// --- Preview Component ---
const PreviewComponent: React.FC<{ data: CustomPageConfig; isSelected: boolean }> = ({ data, isSelected }) => {
  const isEmpty = !data.htmlContent || data.htmlContent === '<p><br></p>' || data.htmlContent.trim() === '';

  return (
    <div className={`transition-all ${isSelected ? 'ring-2 ring-blue-500 rounded p-1' : ''}`}>
      <div
        className="rounded-lg overflow-hidden min-h-[60px]"
        style={{ backgroundColor: data.backgroundColor }}
      >
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400">
            <FileText size={24} className="mb-2 opacity-50" />
            <p className="text-xs">Página vacía</p>
            <p className="text-[10px] mt-0.5">Edita el contenido en el panel de configuración</p>
          </div>
        ) : (
          <div
            className="mx-auto overflow-hidden"
            style={{
              padding: `${data.padding}px`,
              maxWidth: MAX_WIDTH_MAP[data.maxWidth],
            }}
          >
            <div
              className="text-xs text-gray-800 leading-relaxed break-words overflow-wrap-anywhere [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mb-2 [&_h1]:break-words [&_h2]:text-base [&_h2]:font-bold [&_h2]:mb-1.5 [&_h2]:break-words [&_h3]:text-sm [&_h3]:font-bold [&_h3]:mb-1 [&_h3]:break-words [&_p]:mb-1.5 [&_p]:break-words [&_strong]:font-bold [&_em]:italic [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:mb-1.5 [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:mb-1.5 [&_li]:mb-0.5 [&_a]:text-blue-600 [&_a]:underline [&_a]:break-all [&_img]:max-w-full [&_img]:rounded [&_img]:my-2 [&_s]:line-through"
              style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
              dangerouslySetInnerHTML={{ __html: data.htmlContent }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// --- Runtime Component ---
const RuntimeComponent: React.FC<{ data: CustomPageConfig }> = ({ data: _data }) => (
  <div style={{ padding: '16px' }}>
    <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px' }}>Página Personalizada</h2>
    <p style={{ color: '#888', fontSize: '14px' }}>
      Contenido HTML personalizado. Se renderizará dinámicamente en la app generada.
    </p>
  </div>
);

// --- Settings Panel ---
const SettingsPanel: React.FC<{ data: CustomPageConfig; onChange: (data: CustomPageConfig) => void }> = ({ data, onChange }) => {
  const [contentOpen, setContentOpen] = useState(true);
  const [styleOpen, setStyleOpen] = useState(false);

  return (
    <div className="space-y-4">
      {/* --- Section 1: Content --- */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <button
          onClick={() => setContentOpen(o => !o)}
          className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <span className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
            <FileText size={14} /> Contenido
          </span>
          {contentOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {contentOpen && (
          <div className="p-3">
            <div className="bg-white rounded-md border border-gray-300 overflow-hidden [&_.ql-container]:min-h-[200px] [&_.ql-container]:text-sm [&_.ql-editor]:min-h-[200px]">
              <ReactQuill
                theme="snow"
                value={data.htmlContent}
                onChange={val => onChange({ ...data, htmlContent: val })}
                modules={QUILL_MODULES}
                formats={QUILL_FORMATS}
                placeholder="Escribe el contenido de tu página..."
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-2">
              Usa la barra de herramientas para dar formato: títulos, negrita, listas, enlaces, imágenes...
            </p>
          </div>
        )}
      </div>

      {/* --- Section 2: Page Style --- */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <button
          onClick={() => setStyleOpen(o => !o)}
          className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <span className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
            <Palette size={14} /> Estilo de Página
          </span>
          {styleOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {styleOpen && (
          <div className="p-3 space-y-3">
            {/* Background color */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Color de fondo</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={data.backgroundColor}
                  onChange={e => onChange({ ...data, backgroundColor: e.target.value })}
                  className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={data.backgroundColor}
                  onChange={e => onChange({ ...data, backgroundColor: e.target.value })}
                  className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm font-mono"
                  placeholder="#ffffff"
                />
              </div>
            </div>

            {/* Padding */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Padding interno</label>
              <div className="flex gap-1">
                {[
                  { value: 8, label: '8px' },
                  { value: 16, label: '16px' },
                  { value: 24, label: '24px' },
                  { value: 32, label: '32px' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => onChange({ ...data, padding: opt.value })}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      data.padding === opt.value
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Max width */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ancho del contenido</label>
              <div className="flex gap-1">
                {[
                  { value: 'full' as const, label: 'Completo' },
                  { value: 'medium' as const, label: 'Medio' },
                  { value: 'narrow' as const, label: 'Estrecho' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => onChange({ ...data, maxWidth: opt.value })}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      data.maxWidth === opt.value
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
    </div>
  );
};

// --- Module Definition ---
export const CustomPageModule: ModuleDefinition<CustomPageConfig> = {
  id: 'custom_page',
  name: 'Página Personalizada',
  description: 'Página de contenido libre con editor visual',
  icon: <FileText size={20} />,
  schema: CustomPageConfigSchema,
  defaultConfig: {
    htmlContent: '<h2>Mi Página</h2><p>Escribe aquí el contenido de tu página personalizada...</p>',
    backgroundColor: '#ffffff',
    padding: 16,
    maxWidth: 'full',
  },
  PreviewComponent,
  RuntimeComponent,
  SettingsPanel,
};
