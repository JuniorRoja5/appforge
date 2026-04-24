import React, { useMemo } from 'react';
import { useAppConfigStore } from '../../../../store/useAppConfigStore';

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

export const TermsTab: React.FC = () => {
  const config = useAppConfigStore((s) => s.config);
  const updateSection = useAppConfigStore((s) => s.updateSection);

  const content = config?.terms?.content ?? '';

  const charCount = useMemo(() => {
    // Strip HTML tags for character count
    const text = content.replace(/<[^>]*>/g, '').trim();
    return text.length;
  }, [content]);

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-1">Términos y Condiciones</h4>
        <p className="text-[12px] text-gray-500">
          Texto legal requerido por Apple App Store y Google Play Store. Se mostrará al usuario dentro de la app.
          Incluye tus términos de uso, política de privacidad y cualquier otra información legal necesaria.
        </p>
      </div>

      {/* Rich text editor */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <ReactQuill
          theme="snow"
          value={content}
          onChange={(value) => updateSection('terms', { content: value })}
          modules={QUILL_MODULES}
          placeholder="Escribe aquí tus términos y condiciones..."
          style={{ minHeight: '300px' }}
        />
      </div>

      {/* Character count */}
      <div className="flex items-center justify-between text-[11px] text-gray-400">
        <span>{charCount} caracteres</span>
        <span>Se recomienda incluir al menos política de privacidad y términos de uso</span>
      </div>

      {/* Template hint */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <p className="text-[12px] text-amber-800">
          <strong>Nota:</strong> Los términos legales deben ser redactados o revisados por un profesional legal.
          Este editor facilita la configuración, pero no constituye asesoría legal.
        </p>
      </div>
    </div>
  );
};
