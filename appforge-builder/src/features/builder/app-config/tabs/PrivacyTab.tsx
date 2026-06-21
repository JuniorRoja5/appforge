import React from 'react';
import { useAppConfigStore } from '../../../../store/useAppConfigStore';

/**
 * Tab "Privacidad" del modal de configuración de app.
 *
 * Hoy solo expone privacyPolicyUrl (G2 Pieza 1). Cuando lleguen las
 * Piezas 3 y 4 (página pública de borrado de cuenta + página generada
 * de privacidad como fallback), las URLs adicionales viven aquí también
 * — el tab está pensado para agrupar TODAS las URLs legales/de privacidad
 * del app, separadas del rich-HTML de Términos que vive en TermsTab.
 */
export const PrivacyTab: React.FC = () => {
  const config = useAppConfigStore((s) => s.config);
  const updateSection = useAppConfigStore((s) => s.updateSection);

  const url = config?.privacyPolicyUrl ?? '';

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-1">
          Política de Privacidad
        </h4>
        <p className="text-[12px] text-gray-500">
          URL pública a tu política de privacidad. <strong>Requisito de Google Play Store</strong>{' '}
          para publicar tu APK — sin este enlace, la subida es rechazada.
        </p>
      </div>

      <div>
        <label htmlFor="privacyPolicyUrl" className="block text-sm font-medium text-gray-700 mb-2">
          URL pública
        </label>
        <input
          id="privacyPolicyUrl"
          type="url"
          value={url}
          onChange={(e) => updateSection('privacyPolicyUrl', e.target.value || undefined)}
          placeholder="https://miempresa.com/privacidad"
          maxLength={500}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
        />
        <p className="text-xs text-gray-500 mt-1">
          Debe empezar por <code className="text-[11px]">http://</code> o{' '}
          <code className="text-[11px]">https://</code>. Esta URL se declara en Google Play Console
          y queda accesible desde el listing de tu app.
        </p>
      </div>

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
