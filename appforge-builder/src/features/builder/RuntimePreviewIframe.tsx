import React from 'react';

interface Props {
  appId: string;
}

/**
 * Preview-as-Runtime, Fase 1: iframe que carga el runtime real desde
 * `preview.creatu.app/?appId=X` dentro del mockup del smartphone del
 * builder. El runtime en modo preview (commit 59ac073) salta splash,
 * onboarding, terms gate, push y analytics — se ve la app del cliente
 * al instante con los tokens de su tenant aplicados.
 *
 * Hoy es read-only (Fase 1): el iframe muestra el schema actual del
 * appId pero no se actualiza en vivo cuando el cliente edita el
 * SettingsPanel. El sync bidireccional vía postMessage llega en Fase 2.
 *
 * Dimensiones (`absolute inset-0`) llenan el interior del mockup del
 * smartphone, que vive en CentralCanvas. El borde, sombra y notch del
 * smartphone se quedan en el chrome del builder. El iframe trae todo
 * lo demás (header, tabs, drawer, contenido de módulos) desde el
 * runtime real.
 *
 * `title` describe el iframe para accesibilidad. `loading="lazy"` no
 * aporta nada en este caso (el iframe es always-visible en /apps/:id/edit)
 * pero es defensivo si el componente se monta off-screen en futuro
 * (p.ej. multi-app preview). `allow=""` restringe Permissions Policy
 * — el preview NO necesita cámara, geolocation, etc. (el runtime real
 * sí los usa pero en el preview no aplica).
 */
export const RuntimePreviewIframe: React.FC<Props> = ({ appId }) => {
  const src = `https://preview.creatu.app/?appId=${encodeURIComponent(appId)}`;

  return (
    <iframe
      src={src}
      title="Preview de la app"
      className="absolute inset-0 w-full h-full border-0"
      loading="lazy"
      allow=""
    />
  );
};
