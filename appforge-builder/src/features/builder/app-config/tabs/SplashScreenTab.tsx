import React, { useRef, useState } from 'react';
import { useAuthStore } from '../../../../store/useAuthStore';
import { useAppConfigStore } from '../../../../store/useAppConfigStore';
import { uploadFile } from '../../../../lib/api';
import { resolveAssetUrl } from '../../../../lib/resolve-asset-url';

export const SplashScreenTab: React.FC = () => {
  const token = useAuthStore((s) => s.token);
  const config = useAppConfigStore((s) => s.config);
  const updateSection = useAppConfigStore((s) => s.updateSection);

  const bgImageRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<'bg' | 'logo' | null>(null);

  const splash = config?.splash ?? {
    enabled: false,
    type: 'color' as const,
    backgroundColor: '#FFFFFF',
    backgroundImageUrl: '',
    logoUrl: '',
    duration: 2,
  };

  const update = (partial: Partial<typeof splash>) => {
    updateSection('splash', { ...splash, ...partial });
  };

  const handleUpload = async (file: File, field: 'backgroundImageUrl' | 'logoUrl') => {
    if (!token) return;
    setUploading(field === 'backgroundImageUrl' ? 'bg' : 'logo');
    try {
      const result = await uploadFile(file, token);
      update({ [field]: result.url });
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-1">Pantalla de carga (Splash Screen)</h4>
        <p className="text-[12px] text-gray-500">
          Se muestra mientras la app carga al abrirla por primera vez. Es opcional.
        </p>
      </div>

      {/* Enable toggle */}
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-gray-700">Activar splash screen</span>
        <button
          onClick={() => update({ enabled: !splash.enabled })}
          className={`relative w-10 h-5 rounded-full transition-colors ${
            splash.enabled ? 'bg-indigo-500' : 'bg-gray-300'
          }`}
        >
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
            splash.enabled ? 'left-[22px]' : 'left-0.5'
          }`} />
        </button>
      </div>

      {splash.enabled && (
        <>
          {/* Type selector */}
          <div>
            <p className="text-[12px] font-medium text-gray-700 mb-2">Tipo de fondo</p>
            <div className="flex gap-2">
              {(['color', 'image'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => update({ type: t })}
                  className={`flex-1 py-2 text-[12px] font-medium rounded-lg border-2 transition-all ${
                    splash.type === t
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {t === 'color' ? 'Color sólido' : 'Imagen de fondo'}
                </button>
              ))}
            </div>
          </div>

          {/* Color picker */}
          {splash.type === 'color' && (
            <div>
              <p className="text-[12px] font-medium text-gray-700 mb-2">Color de fondo</p>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={splash.backgroundColor ?? '#FFFFFF'}
                  onChange={(e) => update({ backgroundColor: e.target.value })}
                  className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={splash.backgroundColor ?? '#FFFFFF'}
                  onChange={(e) => update({ backgroundColor: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-[12px] w-28 font-mono"
                />
              </div>
            </div>
          )}

          {/* Background image upload */}
          {splash.type === 'image' && (
            <div>
              <p className="text-[12px] font-medium text-gray-700 mb-2">Imagen de fondo</p>
              {splash.backgroundImageUrl ? (
                <div className="relative w-full h-32 rounded-lg overflow-hidden border border-gray-200">
                  <img src={resolveAssetUrl(splash.backgroundImageUrl)} alt="Splash bg" className="w-full h-full object-cover" />
                  <button
                    onClick={() => bgImageRef.current?.click()}
                    className="absolute inset-0 bg-black/40 text-white text-[11px] font-medium opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    Cambiar imagen
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => bgImageRef.current?.click()}
                  className="w-full py-6 border-2 border-dashed border-gray-300 rounded-lg text-[12px] text-gray-500 hover:border-indigo-400 transition-colors"
                >
                  {uploading === 'bg' ? 'Subiendo...' : 'Click para subir imagen de fondo'}
                </button>
              )}
              <input ref={bgImageRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, 'backgroundImageUrl'); e.target.value = ''; }} />
            </div>
          )}

          {/* Logo overlay */}
          <div>
            <p className="text-[12px] font-medium text-gray-700 mb-2">Logo (opcional)</p>
            {splash.logoUrl ? (
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-lg border border-gray-200 overflow-hidden bg-gray-100">
                  <img src={resolveAssetUrl(splash.logoUrl)} alt="Logo" className="w-full h-full object-contain" />
                </div>
                <button
                  onClick={() => logoRef.current?.click()}
                  className="text-[12px] text-indigo-600 hover:underline"
                >
                  Cambiar
                </button>
                <button
                  onClick={() => update({ logoUrl: '' })}
                  className="text-[12px] text-red-500 hover:underline"
                >
                  Quitar
                </button>
              </div>
            ) : (
              <button
                onClick={() => logoRef.current?.click()}
                className="py-3 px-4 border border-gray-300 rounded-lg text-[12px] text-gray-600 hover:border-indigo-400 transition-colors"
              >
                {uploading === 'logo' ? 'Subiendo...' : 'Subir logo'}
              </button>
            )}
            <input ref={logoRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, 'logoUrl'); e.target.value = ''; }} />
          </div>

          {/* Duration slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[12px] font-medium text-gray-700">Duración</p>
              <span className="text-[12px] text-gray-500 font-mono">{splash.duration}s</span>
            </div>
            <input
              type="range"
              min={1}
              max={5}
              step={0.5}
              value={splash.duration}
              onChange={(e) => update({ duration: parseFloat(e.target.value) })}
              className="w-full accent-indigo-500"
            />
            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
              <span>1s</span>
              <span>5s</span>
            </div>
          </div>

          {/* Preview */}
          <div>
            <p className="text-[12px] font-medium text-gray-700 mb-2">Vista previa</p>
            <div
              className="w-[120px] h-[260px] rounded-[16px] border border-gray-300 shadow-sm overflow-hidden mx-auto flex items-center justify-center"
              style={{
                backgroundColor: splash.type === 'color' ? (splash.backgroundColor ?? '#fff') : undefined,
                backgroundImage: splash.type === 'image' && splash.backgroundImageUrl ? `url(${resolveAssetUrl(splash.backgroundImageUrl)})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              {splash.logoUrl && (
                <img src={resolveAssetUrl(splash.logoUrl)} alt="Logo" className="w-12 h-12 object-contain" />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
