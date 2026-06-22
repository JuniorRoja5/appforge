import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { sanitize } from '../lib/sanitize';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface PrivacyData {
  appName: string;
  externalUrl?: string;
  content?: string;
}

/**
 * Página pública de la política de privacidad de un app.
 *
 * Vive en el builder SPA (mismo lugar que AppUserResetPasswordPage). Ruta
 * SIN auth — accesible desde el listing de Play Console, desde links en
 * la app, o tecleando la URL directamente. La ruta está fuera del bloque
 * ProtectedRoute en App.tsx.
 *
 * Tres caminos según lo que devuelva el backend:
 *   1. externalUrl presente  → redirect a la URL externa del cliente.
 *      window.location.href OK aquí (página vive en navegador desktop,
 *      no en Capacitor — la regla Browser.open es solo para runtime).
 *   2. content presente      → renderiza HTML sanitizado con DOMPurify.
 *      `dangerouslySetInnerHTML` sin sanitize = XSS abierto, ya que el
 *      content lo edita libremente el reseller en su Quill.
 *   3. Ninguno               → mensaje "App aún no configurada".
 *
 * El test de incógnito es el árbitro: si la página requiriera login,
 * con sesión activa pasaría desapercibido. En incógnito el bug se hace
 * visible inmediatamente.
 */
export const AppUserPrivacyPage: React.FC = () => {
  const { appId } = useParams<{ appId: string }>();
  const [data, setData] = useState<PrivacyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!appId) {
      setError('Identificador de app no proporcionado.');
      setLoading(false);
      return;
    }

    fetch(`${API_URL}/apps/${appId}/legal/privacy`)
      .then(async (r) => {
        if (!r.ok) {
          if (r.status === 404) throw new Error('App no encontrada.');
          if (r.status === 429) throw new Error('Demasiadas peticiones. Inténtalo en un momento.');
          throw new Error('No se pudo cargar la política de privacidad.');
        }
        return r.json() as Promise<PrivacyData>;
      })
      .then((d) => {
        // Caso 1: URL externa configurada → redirect inmediato. Mantenemos
        // loading=true para que el usuario no vea un flash de contenido
        // antes del salto.
        if (d.externalUrl) {
          window.location.href = d.externalUrl;
          return;
        }
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Error desconocido');
        setLoading(false);
      });
  }, [appId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-500">Cargando política de privacidad…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="text-lg font-semibold text-gray-900 mb-2">
            No se pudo cargar la política
          </h1>
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Caso 3: ni URL ni content — el reseller aún no configuró.
  if (!data.content) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="text-lg font-semibold text-gray-900 mb-2">
            {data.appName}
          </h1>
          <p className="text-sm text-gray-600">
            Esta app aún no ha publicado su política de privacidad. Contacta
            con su soporte para más información.
          </p>
        </div>
      </div>
    );
  }

  // Caso 2: content presente — renderizar sanitizado.
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Política de Privacidad — {data.appName}
        </h1>
        <div
          className="prose prose-sm max-w-none"
          // sanitize OBLIGATORIO. El content viene del reseller editando
          // libremente HTML en su ReactQuill — sin sanitizar, XSS abierto
          // (cualquier <script>, on* handler, etc. ejecutaría aquí).
          // DOMPurify quita los vectores y deja el formato legítimo.
          dangerouslySetInnerHTML={{ __html: sanitize(data.content) }}
        />
      </div>
    </div>
  );
};
