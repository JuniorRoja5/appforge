import React, { useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '../../../../store/useAuthStore';
import { useAppConfigStore } from '../../../../store/useAppConfigStore';
import { uploadAppIcon } from '../../../../lib/api';
import { resolveAssetUrl } from '../../../../lib/resolve-asset-url';
import { Upload, CheckCircle, AlertCircle } from 'lucide-react';

export const AppIconTab: React.FC = () => {
  const { appId } = useParams<{ appId: string }>();
  const token = useAuthStore((s) => s.token);
  const config = useAppConfigStore((s) => s.config);
  const updateSection = useAppConfigStore((s) => s.updateSection);

  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const iconUrl = config?.icon?.url ?? null;

  const validateAndUpload = async (file: File) => {
    setError(null);

    // Use a local variable rather than reading the `error` state — setError is
    // asynchronous, so `if (error) return;` after a setError call would read
    // the stale closure value (the initial render's null) and let an invalid
    // icon proceed to upload silently.
    let validationError: string | null = null;

    // Validate type
    if (file.type !== 'image/png') {
      validationError = 'Solo se permiten archivos PNG';
    }

    // Validate size (5MB)
    if (!validationError && file.size > 5 * 1024 * 1024) {
      validationError = 'El archivo no debe superar 5MB';
    }

    // Validate dimensions
    if (!validationError) {
      const img = new window.Image();
      const objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;

      await new Promise<void>((resolve) => {
        img.onload = () => {
          URL.revokeObjectURL(objectUrl);
          if (img.width !== 1024 || img.height !== 1024) {
            validationError = `Las dimensiones deben ser 1024×1024px. Tu imagen es ${img.width}×${img.height}px`;
          }
          resolve();
        };
        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          validationError = 'No se pudo leer la imagen';
          resolve();
        };
      });
    }

    if (validationError) {
      setError(validationError);
      return;
    }

    // Upload
    if (!appId || !token) return;
    setUploading(true);
    try {
      const result = await uploadAppIcon(file, token);
      updateSection('icon', { url: result.url });
    } catch (err: any) {
      setError(err.message || 'Error al subir el icono');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) validateAndUpload(file);
  };

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-1">Icono de la App</h4>
        <p className="text-[12px] text-gray-500">
          Este icono aparecerá en la pantalla de inicio del teléfono cuando el usuario instale tu app.
        </p>
      </div>

      {/* Upload zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          uploading ? 'border-indigo-300 bg-indigo-50/50' : 'border-gray-300 hover:border-indigo-400 hover:bg-indigo-50/30'
        }`}
      >
        {iconUrl ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-[128px] h-[128px] rounded-[28px] overflow-hidden shadow-lg border border-gray-200">
              <img src={resolveAssetUrl(iconUrl)} alt="App Icon" className="w-full h-full object-cover" />
            </div>
            <p className="text-[12px] text-gray-500">Click o arrastra para reemplazar</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            {uploading ? (
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Upload size={32} className="text-gray-400" />
            )}
            <div>
              <p className="text-sm font-medium text-gray-700">
                {uploading ? 'Subiendo...' : 'Arrastra tu icono aquí o haz click'}
              </p>
              <p className="text-[11px] text-gray-400 mt-1">PNG, 1024×1024px, máximo 5MB</p>
            </div>
          </div>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/png"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) validateAndUpload(file);
          e.target.value = '';
        }}
      />

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle size={16} className="text-red-500 shrink-0" />
          <span className="text-[12px] text-red-700">{error}</span>
        </div>
      )}

      {/* Requirements */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
        <p className="text-[12px] font-semibold text-gray-700">Requisitos del icono</p>
        <ul className="space-y-1.5">
          {[
            'Formato: PNG (sin transparencia)',
            'Dimensiones: 1024 × 1024 píxeles',
            'Tamaño máximo: 5MB',
            'Las esquinas redondeadas las aplica automáticamente el sistema operativo',
            'Usa un diseño simple y reconocible — se verá pequeño en la pantalla de inicio',
            'Evita texto pequeño que no se lea a tamaños reducidos',
          ].map((req) => (
            <li key={req} className="flex items-start gap-2 text-[11px] text-gray-600">
              <CheckCircle size={12} className="text-green-500 mt-0.5 shrink-0" />
              {req}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
