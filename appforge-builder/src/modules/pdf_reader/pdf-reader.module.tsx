import React, { useState, useRef } from 'react';
import type { ModuleDefinition } from '../base/module.interface';
import { z } from 'zod';
import {
  FileText, Upload, Trash2, ChevronDown, ChevronUp, ExternalLink,
} from 'lucide-react';
import { uploadDocument } from '../../lib/api';
import { useAuthStore } from '../../store/useAuthStore';
import { resolveAssetUrl } from '../../lib/resolve-asset-url';

// --- Zod schema ---
const PdfReaderConfigSchema = z.object({
  pdfUrl: z.string(),
  title: z.string(),
  showTitle: z.boolean(),
  fileName: z.string().optional(),
});

export type PdfReaderConfig = z.infer<typeof PdfReaderConfigSchema>;

// --- Preview Component ---
const PreviewComponent: React.FC<{ data: PdfReaderConfig; isSelected: boolean }> = ({ data, isSelected }) => {
  const hasPdf = !!data.pdfUrl;

  return (
    <div className={`transition-all ${isSelected ? 'ring-2 ring-blue-500 rounded p-1' : ''}`}>
      <div className="bg-white rounded-lg overflow-hidden">
        {/* Header */}
        {data.showTitle && (
          <div className="px-3 py-2 flex items-center gap-1.5" style={{ background: 'linear-gradient(to right, var(--af-color-primary, #ef4444), var(--af-color-secondary, #f43f5e))' }}>
            <FileText size={12} className="text-white" />
            <span className="text-white text-xs font-bold truncate">{data.title || 'DOCUMENTO PDF'}</span>
          </div>
        )}

        {!hasPdf ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400">
            <FileText size={28} className="mb-2 opacity-50" />
            <p className="text-xs">No hay PDF cargado</p>
            <p className="text-[10px] mt-0.5">Sube un PDF en el panel de configuración</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {/* Embedded PDF viewer — full height */}
            <div className="bg-gray-200">
              <iframe
                src={`${resolveAssetUrl(data.pdfUrl)}#toolbar=1&navpanes=0&view=FitH`}
                className="w-full border-0"
                style={{ height: '350px' }}
                title="PDF Preview"
              />
            </div>

            {/* Bottom bar with filename + open link */}
            <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-t border-gray-200">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-6 h-7 rounded flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--af-color-primary, #ef4444)' }}>
                  <span className="text-white text-[7px] font-bold">PDF</span>
                </div>
                <p className="text-[10px] text-gray-600 truncate">{data.fileName || 'documento.pdf'}</p>
              </div>
              <a
                href={resolveAssetUrl(data.pdfUrl)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="flex items-center gap-1 text-[10px] font-medium shrink-0 ml-2"
                style={{ color: 'var(--af-color-primary, #dc2626)' }}
              >
                <ExternalLink size={10} /> Abrir
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Runtime Component ---
const RuntimeComponent: React.FC<{ data: PdfReaderConfig }> = ({ data }) => (
  <div style={{ padding: '16px' }}>
    <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px' }}>Visor PDF</h2>
    <p style={{ color: '#888', fontSize: '14px' }}>
      {data.pdfUrl ? 'PDF embebido' : 'Sin PDF'}.
      Se renderizará con visor nativo en la app generada.
    </p>
  </div>
);

// --- Settings Panel ---
const SettingsPanel: React.FC<{ data: PdfReaderConfig; onChange: (data: PdfReaderConfig) => void }> = ({ data, onChange }) => {
  const [configOpen, setConfigOpen] = useState(true);
  const [uploading, setUploading] = useState(false);
  const token = useAuthStore((s) => s.token);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    try {
      setUploading(true);
      const res = await uploadDocument(file, token);
      onChange({ ...data, pdfUrl: res.url, fileName: file.name });
    } catch (err) {
      console.error(err);
      alert('Error al subir el PDF');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removePdf = () => {
    onChange({ ...data, pdfUrl: '', fileName: '' });
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
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-red-500 focus:border-red-500"
                placeholder="Mi Documento"
              />
            </div>

            {/* Show title toggle */}
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={data.showTitle}
                onChange={e => onChange({ ...data, showTitle: e.target.checked })}
                className="rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              Mostrar título en el header
            </label>
          </div>
        )}
      </div>

      {/* Section 2: PDF File */}
      <div>
        <h3 className="text-sm font-bold text-gray-800 mb-3">Archivo PDF</h3>

        {data.pdfUrl ? (
          <div className="border border-gray-200 rounded-lg bg-white p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-12 bg-red-500 rounded flex items-center justify-center shrink-0">
                <span className="text-white text-[9px] font-bold">PDF</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800 truncate">{data.fileName || 'documento.pdf'}</p>
                <a
                  href={resolveAssetUrl(data.pdfUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-red-600 hover:underline"
                >
                  Ver archivo
                </a>
              </div>
              <button
                onClick={removePdf}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                title="Eliminar PDF"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ) : (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full flex items-center justify-center gap-1 px-3 py-3 border-2 border-dashed border-gray-300 text-gray-500 text-sm font-medium rounded-lg hover:border-red-400 hover:text-red-600 disabled:opacity-50 transition-colors"
            >
              {uploading ? (
                'Subiendo PDF...'
              ) : (
                <>
                  <Upload size={16} /> Subir archivo PDF
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Module Definition ---
export const PdfReaderModule: ModuleDefinition<PdfReaderConfig> = {
  id: 'pdf_reader',
  name: 'Visor PDF',
  description: 'Visualizador de documentos PDF embebidos',
  icon: <FileText size={20} />,
  schema: PdfReaderConfigSchema,
  defaultConfig: {
    pdfUrl: '',
    title: 'Documento',
    showTitle: true,
    fileName: '',
  },
  PreviewComponent,
  RuntimeComponent,
  SettingsPanel,
};
