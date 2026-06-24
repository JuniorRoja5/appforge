import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle, Trash2, Mail } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

type Mode =
  | { type: 'request' }
  | { type: 'loading' }
  | { type: 'confirm'; email: string }
  | { type: 'sent' }
  | { type: 'success' }
  | { type: 'error'; message: string };

/**
 * G2 Pieza 3 — public account deletion page.
 *
 * Patrón GET-carga / POST-muta INAMOVIBLE. El GET con ?t=<token> solo
 * valida el token y devuelve el email; toda lógica destructiva en el
 * POST tras confirmación del usuario. Defensa contra prefetch del
 * navegador (Chrome especulativo, Outlook preview, Slack link unfurl)
 * que ejecutarían un GET destructivo sin consentimiento.
 *
 * Dos estados según presencia de ?t=:
 *   - Sin token: formulario de email → POST request-delete → envía email.
 *   - Con token: GET valida → muestra email + botón confirm → POST ejecuta.
 */
export const AppUserDeleteAccountPage: React.FC = () => {
  const { appId } = useParams<{ appId: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('t') ?? '';

  const [mode, setMode] = useState<Mode>(
    token ? { type: 'loading' } : { type: 'request' },
  );
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Si llega con token en URL → validar via GET (no mutación) y mostrar
  // email + botón de confirmación. Si el token es inválido/expirado, el
  // endpoint devuelve 401 y mostramos el estado de error.
  useEffect(() => {
    if (!token || !appId) return;

    fetch(
      `${API_URL}/apps/${appId}/users/delete-account?t=${encodeURIComponent(token)}`,
    )
      .then(async (r) => {
        if (!r.ok) throw new Error('Token inválido o expirado.');
        return r.json() as Promise<{ email: string }>;
      })
      .then((d) => setMode({ type: 'confirm', email: d.email }))
      .catch(() =>
        setMode({
          type: 'error',
          message:
            'Este enlace no es válido o ya ha expirado. Solicita uno nuevo desde la app.',
        }),
      );
  }, [appId, token]);

  // POST request-delete: pide al server que envíe el email con el enlace
  // de confirmación. Respuesta genérica del backend (anti-enumeración),
  // así que mostramos siempre el mismo mensaje 'sent' al éxito.
  const handleRequestSubmit = async () => {
    if (!appId || submitting || !email.trim()) return;
    setSubmitting(true);
    try {
      const r = await fetch(
        `${API_URL}/apps/${appId}/users/request-delete`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim() }),
        },
      );
      if (!r.ok) throw new Error('Error al enviar el email.');
      setMode({ type: 'sent' });
    } catch {
      setMode({
        type: 'error',
        message: 'No se pudo enviar el email. Inténtalo de nuevo.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // POST delete-account: ejecuta la eliminación. El backend valida el
  // token de nuevo (no se asume válido por haberlo validado en el GET —
  // pueden haber pasado horas entre el GET y el POST si el usuario dejó
  // la pantalla abierta) y dispara deleteMe con su cleanup de blobs.
  const handleConfirmSubmit = async () => {
    if (!appId || submitting || !token) return;
    setSubmitting(true);
    try {
      const r = await fetch(
        `${API_URL}/apps/${appId}/users/delete-account?t=${encodeURIComponent(token)}`,
        { method: 'POST' },
      );
      if (!r.ok) throw new Error('Token inválido o expirado.');
      setMode({ type: 'success' });
    } catch {
      setMode({
        type: 'error',
        message:
          'No se pudo eliminar la cuenta. El enlace puede haber expirado.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8">

        {/* Loading mientras validamos el token */}
        {mode.type === 'loading' && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="animate-spin text-gray-400" size={32} />
            <p className="text-sm text-gray-500">Verificando enlace…</p>
          </div>
        )}

        {/* Formulario de email para solicitar el enlace */}
        {mode.type === 'request' && (
          <>
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-3">
                <Trash2 className="text-red-600" size={22} />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Eliminar cuenta</h1>
              <p className="text-sm text-gray-500 mt-1">
                Introduce tu email para recibir un enlace de confirmación.
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Email de tu cuenta
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full px-3 py-2.5 rounded-lg text-sm border border-gray-300 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                />
              </div>
              <button
                onClick={handleRequestSubmit}
                disabled={submitting || !email.trim()}
                className="w-full py-2.5 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="animate-spin" size={16} /> : <Mail size={16} />}
                {submitting ? 'Enviando…' : 'Enviar enlace de confirmación'}
              </button>
            </div>
          </>
        )}

        {/* Email enviado — mensaje genérico (anti-enumeración) */}
        {mode.type === 'sent' && (
          <div className="text-center py-4">
            <CheckCircle className="mx-auto text-green-500 mb-3" size={36} />
            <h1 className="text-lg font-bold text-gray-900 mb-2">Revisa tu correo</h1>
            <p className="text-sm text-gray-600">
              Si existe una cuenta con ese email, te hemos enviado un enlace para confirmar la eliminación. Caduca en 1 hora.
            </p>
          </div>
        )}

        {/* Confirmación final — token validado, mostrar email y pedir confirm */}
        {mode.type === 'confirm' && (
          <>
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-3">
                <Trash2 className="text-red-600" size={22} />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Confirmar eliminación</h1>
              <p className="text-sm text-gray-500 mt-1 break-all">{mode.email}</p>
            </div>
            <p className="text-sm text-gray-600 mb-6 text-center">
              Esta acción es <strong>permanente e irreversible</strong>. Se eliminarán todos tus datos, publicaciones y actividad.
            </p>
            <button
              onClick={handleConfirmSubmit}
              disabled={submitting}
              className="w-full py-2.5 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="animate-spin" size={16} /> : null}
              {submitting ? 'Eliminando…' : 'Eliminar mi cuenta definitivamente'}
            </button>
          </>
        )}

        {/* Éxito tras el POST destructivo */}
        {mode.type === 'success' && (
          <div className="text-center py-4">
            <CheckCircle className="mx-auto text-green-500 mb-3" size={36} />
            <h1 className="text-lg font-bold text-gray-900 mb-2">Cuenta eliminada</h1>
            <p className="text-sm text-gray-600">
              Tu cuenta y todos tus datos han sido eliminados permanentemente.
            </p>
          </div>
        )}

        {/* Error — token inválido/expirado o fallo del POST */}
        {mode.type === 'error' && (
          <div className="text-center py-4">
            <XCircle className="mx-auto text-red-500 mb-3" size={36} />
            <h1 className="text-lg font-bold text-gray-900 mb-2">Enlace no válido</h1>
            <p className="text-sm text-gray-600">{mode.message}</p>
          </div>
        )}

      </div>
    </div>
  );
};
