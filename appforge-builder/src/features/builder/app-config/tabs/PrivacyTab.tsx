import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useAppConfigStore } from '../../../../store/useAppConfigStore';
import { PRIVACY_TEMPLATE_HTML } from '../../../../lib/legal-templates';

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
 * Tab "Privacidad" del modal de configuración de app.
 *
 * G2 Commit B — shape simétrico { content?, url? }:
 *   - content: rich-HTML editable inline (ReactQuill).
 *   - url: URL externa absoluta a un documento de privacidad propio.
 * El cliente elige una de las dos vías:
 *   - Edita la plantilla pre-cargada en el Quill.
 *   - O pega su URL externa en el campo URL.
 *
 * Banner "Tu URL para Play Console" computado en cliente con
 * window.location.origin:
 *   - Si hay url → muestra esa.
 *   - Si solo content → muestra <host>/app-user/privacy/<appId> (la página
 *     pública que sirve el content).
 * Esa es la URL que el reseller copia/pega al submission de Play Console.
 *
 * NO usa privacyUrlResolved del manifest (descartado en D6): Play Console
 * no lee el manifest, lo lee el reseller para copiar manualmente; calcularlo
 * en UI con window.location.origin es más simple y adapta automáticamente
 * a un futuro brandDomain custom del white-label.
 */
export const PrivacyTab: React.FC = () => {
  const { appId } = useParams<{ appId: string }>();
  const config = useAppConfigStore((s) => s.config);
  const updateSection = useAppConfigStore((s) => s.updateSection);

  const content = config?.privacy?.content ?? '';
  const url = config?.privacy?.url ?? '';

  const charCount = useMemo(() => {
    const text = content.replace(/<[^>]*>/g, '').trim();
    return text.length;
  }, [content]);

  // URL para Play Console — resuelve client-side:
  //   - URL externa si la hay
  //   - Si no, la página pública generada (servirá el content)
  const playConsoleUrl = useMemo(() => {
    if (url) return url;
    if (!appId) return '';
    return `${window.location.origin}/app-user/privacy/${appId}`;
  }, [url, appId]);

  const handleLoadTemplate = () => {
    const hasContent = content.replace(/<[^>]*>/g, '').trim().length > 0;
    if (hasContent && !window.confirm('Ya hay contenido escrito. ¿Sobreescribir con la plantilla?')) {
      return;
    }
    updateSection('privacy', { ...config?.privacy, content: PRIVACY_TEMPLATE_HTML });
  };

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-1">
          Política de Privacidad
        </h4>
        <p className="text-[12px] text-gray-500">
          <strong>Requisito de Google Play Store</strong> para publicar tu APK. Puedes editar
          la plantilla pre-cargada O pegar una URL externa a tu propia
          política — si pones URL, esa será la que se declare.
        </p>
      </div>

      {/* URL externa (opcional) */}
      <div>
        <label htmlFor="privacyUrl" className="block text-sm font-medium text-gray-700 mb-2">
          URL externa (opcional)
        </label>
        <input
          id="privacyUrl"
          type="url"
          value={url}
          onChange={(e) =>
            updateSection('privacy', {
              ...config?.privacy,
              url: e.target.value || undefined,
            })
          }
          placeholder="https://miempresa.com/privacidad"
          maxLength={500}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
        />
        <p className="text-xs text-gray-500 mt-1">
          Si la dejas vacía, se servirá automáticamente la plantilla editable
          de abajo en una página pública.
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
            onChange={(value) => updateSection('privacy', { ...config?.privacy, content: value })}
            modules={QUILL_MODULES}
            placeholder="Escribe aquí tu política de privacidad, o usa el botón Cargar plantilla..."
            style={{ minHeight: '300px' }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-gray-400 mt-1">
          <span>{charCount} caracteres</span>
          <span>Editable si no se ha puesto URL externa arriba.</span>
        </div>
      </div>

      {/* URL para Play Console — el reseller la copia manual al submission */}
      {playConsoleUrl && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-[12px] text-blue-900 font-medium mb-1">
            URL para Play Console
          </p>
          <p className="text-[11px] text-blue-800 mb-2">
            Copia esta URL al submission de Google Play Console como tu
            política de privacidad declarada:
          </p>
          <code className="block bg-white border border-blue-200 rounded px-2 py-1.5 text-[12px] text-gray-900 break-all">
            {playConsoleUrl}
          </code>
        </div>
      )}

      {/* Disclaimer legal */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <p className="text-[12px] text-amber-800">
          <strong>Importante:</strong> tu política debe declarar qué datos recopila tu app y cómo
          se usan. Si tu app permite a los usuarios pedir el borrado de su cuenta (próximamente),
          también debes declarar qué se conserva (los pedidos y reservas se anonimizan, no se borran).
          Una política redactada o revisada por un profesional legal evita rechazos de Play Store
          y problemas posteriores.
        </p>
      </div>
    </div>
  );
};
