import React, { useMemo } from 'react';
import { useAppConfigStore } from '../../../../store/useAppConfigStore';
import { TERMS_TEMPLATE_HTML } from '../../../../lib/legal-templates';

// react-quill-new requires dynamic import in some setups, but works fine in Vite SPA
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link'],
    ['clean'],
  ],
};

/**
 * Tab "Términos" del modal de configuración de app.
 *
 * G2 Commit B — shape simétrico { content?, url? }:
 *   - content: rich-HTML editable inline (ReactQuill).
 *   - url: URL externa absoluta a un documento legal propio del cliente.
 * El cliente elige una de las dos vías:
 *   - Edita la plantilla pre-cargada (botón "Cargar plantilla") en el Quill.
 *   - O pega su URL externa en el campo URL.
 *
 * Resolución consumida en runtime (G2 Commit C, pendiente): TermsScreen
 * abre Browser.open(url) si hay url, si no renderiza el content. Hoy
 * Commit B solo guarda — Commit C cierra el consumidor de terms.url.
 */
export const TermsTab: React.FC = () => {
  const config = useAppConfigStore((s) => s.config);
  const updateSection = useAppConfigStore((s) => s.updateSection);

  const content = config?.terms?.content ?? '';
  const url = config?.terms?.url ?? '';

  const charCount = useMemo(() => {
    // Strip HTML tags for character count
    const text = content.replace(/<[^>]*>/g, '').trim();
    return text.length;
  }, [content]);

  const handleLoadTemplate = () => {
    // Confirma si ya hay contenido editado (no solo HTML vacío). El
    // strip-tags evita un falso negativo si Quill dejó "<p><br></p>"
    // como "vacío visual" tras un clean. window.confirm OK aquí: el
    // builder es desktop browser, no Capacitor (regla Capacitor-safe es
    // solo runtime).
    const hasContent = content.replace(/<[^>]*>/g, '').trim().length > 0;
    if (hasContent && !window.confirm('Ya hay contenido escrito. ¿Sobreescribir con la plantilla?')) {
      return;
    }
    updateSection('terms', { ...config?.terms, content: TERMS_TEMPLATE_HTML });
  };

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-1">Términos y Condiciones</h4>
        <p className="text-[12px] text-gray-500">
          Texto legal mostrado al usuario dentro de la app. Puedes editar
          la plantilla pre-cargada O pegar una URL externa a tu propio
          documento — si pones URL, esa será la que se muestre al usuario.
        </p>
      </div>

      {/* URL externa (opcional) */}
      <div>
        <label htmlFor="termsUrl" className="block text-sm font-medium text-gray-700 mb-2">
          URL externa (opcional)
        </label>
        <input
          id="termsUrl"
          type="url"
          value={url}
          // Spread del objeto terms completo + sobrescribimos solo url.
          // Preserva el content cuando solo cambia la URL.
          onChange={(e) =>
            updateSection('terms', {
              ...config?.terms,
              url: e.target.value || undefined,
            })
          }
          placeholder="https://miempresa.com/terminos"
          maxLength={500}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
        />
        <p className="text-xs text-gray-500 mt-1">
          Si pones URL aquí, los usuarios verán un enlace que abre esa
          página. Si la dejas vacía, se muestra el contenido editable de abajo.
        </p>
      </div>

      {/* Contenido editable */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Contenido editable
          </label>
          <button
            type="button"
            onClick={handleLoadTemplate}
            className="text-xs px-3 py-1 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cargar plantilla
          </button>
        </div>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <ReactQuill
            theme="snow"
            value={content}
            onChange={(value) => updateSection('terms', { ...config?.terms, content: value })}
            modules={QUILL_MODULES}
            placeholder="Escribe aquí tus términos y condiciones, o usa el botón Cargar plantilla..."
            style={{ minHeight: '300px' }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-gray-400 mt-1">
          <span>{charCount} caracteres</span>
          <span>Editable si no se ha puesto URL externa arriba.</span>
        </div>
      </div>

      {/* Disclaimer legal */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <p className="text-[12px] text-amber-800">
          <strong>Importante:</strong> los términos legales deben ser redactados o revisados por un profesional legal.
          Este editor facilita la configuración, pero no constituye asesoría legal.
        </p>
      </div>
    </div>
  );
};
