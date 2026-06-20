import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { ImageInputField } from '../components/shared/ImageInputField';
import { updateMyBranding, type TenantBranding } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import { useTenantStore } from '../store/useTenantStore';
import { contrastRatio } from '../lib/color';

// Umbral del aviso de luminancia. La justificación completa vive en
// lib/color.ts (contrastRatio doc). Resumen: 3:1 es la línea entre
// "falsos positivos sobre el indigo de marca" y "genuinamente ilegible".
const CONTRAST_THRESHOLD = 3;

// Default del picker cuando el tenant aún no tiene color guardado.
// Es el default REAL del :root (--primary: 243 75% 59% en index.css:17),
// NO el "≈ #6366F1" del comment de index.css. Así el picker arranca
// mostrando exactamente el color que el chrome ya tiene.
const DEFAULT_PRIMARY = '#5048e5';

/**
 * Página de configuración de marca del reseller.
 *
 * Split outer/inner por una razón medible: PlatformLayout dispara
 * loadBranding async. Si BrandingPage hace `useState` inicializando
 * desde el store en el primer render, llega vacío y nunca se re-init
 * cuando llega el dato. El outer gatea por loaded/error/isWhiteLabel
 * y solo monta el inner cuando branding está poblado — el `useState`
 * lazy del inner lee dato real, no null.
 *
 * El gate de isWhiteLabel redirige a /dashboard sin pantalla de upgrade
 * porque el menú lateral (Phase 4) ya esconde la entrada para no-resellers.
 * Solo aterriza aquí alguien escribiendo la URL a mano — el redirect
 * silencioso es lo correcto, sin gastar cognición en "convertir".
 */
export const BrandingPage: React.FC = () => {
  const loaded = useTenantStore((s) => s.loaded);
  const error = useTenantStore((s) => s.error);
  const isWhiteLabel = useTenantStore((s) => s.isWhiteLabel);
  const branding = useTenantStore((s) => s.branding);
  const token = useAuthStore((s) => s.token);

  // Spinner: todavía no se intentó cargar Y no hay error.
  if (!loaded && !error) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Error de carga: NO spinner infinito (ese era el bug latente del init
  // sync sobre dato async — el outer lo cubre explícitamente).
  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
        Error al cargar la configuración de marca: {error}
      </div>
    );
  }

  if (!isWhiteLabel) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <BrandingForm branding={branding} token={token} />;
};

interface BrandingFormProps {
  branding: TenantBranding | null;
  token: string;
}

const BrandingForm: React.FC<BrandingFormProps> = ({ branding, token }) => {
  // Lazy init: lee branding del store que el outer garantiza poblado (o null
  // en el caso "tenant aún sin nada guardado", cubierto por los ?? defaults).
  // El useState NO se re-ejecuta en re-renders — todos los cambios
  // subsecuentes pasan por setDraft, que es lo correcto en un form.
  const [draft, setDraft] = useState(() => ({
    brandName: branding?.brandName ?? '',
    brandLogoUrl: branding?.brandLogoUrl ?? '',
    primary: branding?.brandColors?.primary ?? DEFAULT_PRIMARY,
  }));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const updated = await updateMyBranding(
        {
          brandName: draft.brandName,
          brandLogoUrl: draft.brandLogoUrl,
          brandColors: { primary: draft.primary },
        },
        token,
      );
      // setBranding dispara la suscripción de useResellerBranding → el chrome
      // actualiza --primary al instante. Es la pieza que reemplaza al
      // live-preview descartado (un click de diferencia, sin colisión de
      // escritores en el slot inline de documentElement.style).
      useTenantStore.getState().setBranding(updated);
      setMsg({ type: 'success', text: 'Marca actualizada.' });
    } catch (err) {
      setMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error al guardar.',
      });
    } finally {
      setSaving(false);
    }
  };

  const lowContrast =
    contrastRatio(draft.primary, '#ffffff') < CONTRAST_THRESHOLD;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Marca</h1>
      <p className="text-sm text-gray-600 mb-8">
        Personaliza cómo aparece tu plataforma cuando entras al panel.
        Logo, nombre y color principal del menú superior y los botones.
      </p>

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        {/* Nombre de marca */}
        <div>
          <label
            htmlFor="brandName"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Nombre de marca
          </label>
          <input
            id="brandName"
            type="text"
            maxLength={80}
            value={draft.brandName}
            onChange={(e) => setDraft({ ...draft, brandName: e.target.value })}
            placeholder="Mi Marca"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
            disabled={saving}
          />
          <p className="text-xs text-gray-500 mt-1">
            Aparece en lugar de "AppForge Builder" en el menú superior.
          </p>
        </div>

        {/* Logo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Logo
          </label>
          <ImageInputField
            value={draft.brandLogoUrl}
            onChange={(url) => setDraft({ ...draft, brandLogoUrl: url })}
            shape="square"
            previewSize="lg"
            maxSizeMB={2}
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            disabled={saving}
            onError={(text) => setMsg({ type: 'error', text })}
            label=""
          />
          <p className="text-xs text-gray-500 mt-1">
            Sustituye el "AF" del menú superior. PNG, JPG, WebP o SVG, hasta 2MB.
          </p>
        </div>

        {/* Color principal */}
        <div>
          <label
            htmlFor="primary"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Color principal
          </label>
          <div className="flex items-center gap-3">
            <input
              id="primary"
              type="color"
              value={draft.primary}
              onChange={(e) => setDraft({ ...draft, primary: e.target.value })}
              disabled={saving}
              className="w-14 h-10 rounded border border-gray-300 cursor-pointer disabled:opacity-50"
            />
            <span className="text-sm text-gray-700 font-mono">
              {draft.primary.toUpperCase()}
            </span>
          </div>
          {lowContrast && (
            <p className="text-sm text-amber-600 mt-2">
              Este color es muy claro. El texto blanco del menú y los botones
              puede verse difícil de leer. Te recomendamos un tono más oscuro
              o saturado.
            </p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Color del menú superior y de los botones principales del panel.
          </p>
        </div>

        {/* Feedback */}
        {msg && (
          <div
            className={`text-sm px-3 py-2 rounded-md ${
              msg.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {msg.text}
          </div>
        )}

        {/* Acción */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
};
