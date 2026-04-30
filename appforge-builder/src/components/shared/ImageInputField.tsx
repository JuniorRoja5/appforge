import React, { useEffect, useRef, useState } from 'react';
import { Upload, Loader2, ImageIcon, X } from 'lucide-react';
import { uploadFile } from '../../lib/api';
import { resolveAssetUrl } from '../../lib/resolve-asset-url';
import { useAuthStore } from '../../store/useAuthStore';

type AccentColor = 'purple' | 'blue' | 'teal' | 'indigo' | 'rose' | 'amber';
type Shape = 'circle' | 'square' | 'video' | 'cover';
type PreviewSize = 'sm' | 'md' | 'lg';

interface ImageInputFieldProps {
  value: string;
  onChange: (url: string) => void;

  accentColor?: AccentColor;
  shape?: Shape;
  previewSize?: PreviewSize;
  label?: string;
  showUrlInput?: boolean;
  urlPlaceholder?: string;

  maxSizeMB?: number;
  accept?: string;

  onError?: (message: string) => void;
  disabled?: boolean;
}

// Tailwind needs literal class names — no string interpolation
const ACCENT_CLASSES: Record<AccentColor, { bg: string; text: string; ring: string; hover: string; loader: string }> = {
  purple: { bg: 'bg-purple-50',  text: 'text-purple-700',  ring: 'focus:ring-purple-500',  hover: 'hover:bg-purple-100',  loader: 'text-purple-600' },
  blue:   { bg: 'bg-blue-50',    text: 'text-blue-700',    ring: 'focus:ring-blue-500',    hover: 'hover:bg-blue-100',    loader: 'text-blue-600' },
  teal:   { bg: 'bg-teal-50',    text: 'text-teal-700',    ring: 'focus:ring-teal-500',    hover: 'hover:bg-teal-100',    loader: 'text-teal-600' },
  indigo: { bg: 'bg-indigo-50',  text: 'text-indigo-700',  ring: 'focus:ring-indigo-500',  hover: 'hover:bg-indigo-100',  loader: 'text-indigo-600' },
  rose:   { bg: 'bg-rose-50',    text: 'text-rose-700',    ring: 'focus:ring-rose-500',    hover: 'hover:bg-rose-100',    loader: 'text-rose-600' },
  amber:  { bg: 'bg-amber-50',   text: 'text-amber-700',   ring: 'focus:ring-amber-500',  hover: 'hover:bg-amber-100',   loader: 'text-amber-600' },
};

const SHAPE_CLASSES: Record<Shape, string> = {
  circle: 'rounded-full aspect-square object-cover',
  square: 'rounded-md aspect-square object-cover',
  video:  'rounded-md aspect-video object-cover',
  cover:  'rounded-md h-24 w-full object-cover',
};

const SIZE_CLASSES: Record<PreviewSize, string> = {
  sm: 'w-8 h-8',
  md: 'w-16 h-16',
  lg: 'w-24 h-24',
};

const defaultErrorHandler = (msg: string) => window.alert(msg);

export const ImageInputField: React.FC<ImageInputFieldProps> = ({
  value,
  onChange,
  accentColor = 'indigo',
  shape = 'square',
  previewSize = 'md',
  label = 'Imagen',
  showUrlInput = true,
  urlPlaceholder = 'https://... o /uploads/...',
  maxSizeMB = 10,
  accept = 'image/*',
  onError = defaultErrorHandler,
  disabled = false,
}) => {
  const token = useAuthStore((s) => s.token);
  const [isUploading, setIsUploading] = useState(false);
  const [imageBroken, setImageBroken] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Reset broken state when value changes (e.g., undo/redo, parent re-render with different value)
  useEffect(() => {
    setImageBroken(false);
  }, [value]);

  const accent = ACCENT_CLASSES[accentColor];
  const shapeCls = shape === 'cover' ? SHAPE_CLASSES.cover : `${SHAPE_CLASSES[shape]} ${SIZE_CLASSES[previewSize]}`;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so selecting the same file twice still triggers onChange
    e.target.value = '';

    if (file.size > maxSizeMB * 1024 * 1024) {
      onError(`La imagen no puede superar los ${maxSizeMB} MB`);
      return;
    }
    if (!file.type.startsWith('image/')) {
      onError('El archivo debe ser una imagen');
      return;
    }
    if (!token) {
      onError('Sesión expirada, vuelve a iniciar sesión');
      return;
    }

    setIsUploading(true);
    try {
      const result = await uploadFile(file, token);
      onChange(result.url);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al subir la imagen';
      onError(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClear = () => {
    onChange('');
  };

  const showImage = !!value && !imageBroken;

  return (
    <div className="space-y-2">
      {label && <label className="block text-xs font-medium text-gray-700">{label}</label>}

      {showUrlInput && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={urlPlaceholder}
          disabled={disabled || isUploading}
          className={`w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 ${accent.ring} disabled:bg-gray-50 disabled:text-gray-500`}
        />
      )}

      <div className="flex items-center gap-2">
        {/* Preview thumbnail (image, broken-fallback, or empty placeholder) */}
        <div className={`flex-shrink-0 ${shape === 'cover' ? 'w-full' : SIZE_CLASSES[previewSize]}`}>
          {showImage ? (
            <img
              src={resolveAssetUrl(value)}
              alt=""
              onError={() => setImageBroken(true)}
              className={`${shapeCls} bg-gray-100`}
            />
          ) : (
            <div className={`${shapeCls} bg-gray-100 flex items-center justify-center text-gray-400`}>
              <ImageIcon size={previewSize === 'sm' ? 14 : 20} />
            </div>
          )}
        </div>

        {/* Upload + clear buttons */}
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md ${accent.bg} ${accent.text} ${accent.hover} disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
          >
            {isUploading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Subiendo...
              </>
            ) : (
              <>
                <Upload size={14} />
                {value ? 'Cambiar' : 'Subir'}
              </>
            )}
          </button>
          {value && !isUploading && (
            <button
              type="button"
              onClick={handleClear}
              disabled={disabled}
              className="inline-flex items-center gap-1 px-3 py-1 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              <X size={12} />
              Quitar
            </button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  );
};
