import React from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';

export type PreviewErrorCode =
  | 'manifest-404'
  | 'manifest-500'
  | 'manifest-network'
  | 'manifest-unknown'
  | 'handshake-timeout';

interface Props {
  code: PreviewErrorCode;
  onRetry: () => void;
}

/**
 * Preview-as-Runtime Phase 2.3 — error banner that appears above
 * the smartphone mockup in CentralCanvas when the preview channel
 * fails (manifest fetch error, handshake timeout, etc).
 *
 * Yellow (warning, not red) because the builder itself keeps
 * working — only the preview panel failed. Conceptually mirrors
 * ImpersonationBanner's style but contextual to the preview, not
 * top-bar global (a global red banner would compete visually with
 * the impersonation one and overstate the severity).
 *
 * User-facing copy in plain Spanish for non-technical users
 * (regla feedback_ui_copy_audience). Each error code maps to a
 * specific message that hints at the likely cause — never raw
 * stack traces or status numbers in the UI.
 *
 * onRetry triggers the iframe remount via key change (see
 * RuntimePreviewIframe: iframeKey state). Single CTA, single
 * source of truth for retry.
 */
const COPY: Record<PreviewErrorCode, string> = {
  'manifest-404': 'Esta app no se encontró. ¿La has borrado o cambiado el ID?',
  'manifest-500': 'Algo falló en el servidor. Reintenta en unos segundos.',
  'manifest-network': 'Sin conexión. Revisa tu internet y reintenta.',
  'manifest-unknown': 'Hubo un problema al cargar el preview. Reintenta.',
  'handshake-timeout': 'El preview no responde. Reintenta.',
};

export const PreviewErrorBanner: React.FC<Props> = ({ code, onRetry }) => {
  const message = COPY[code] ?? COPY['manifest-unknown'];
  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 rounded-lg shrink-0 bg-yellow-50 border border-yellow-300 shadow-sm"
      role="alert"
    >
      <AlertTriangle size={18} className="text-yellow-600 shrink-0" strokeWidth={2} />
      <p className="flex-1 text-[13px] font-medium text-yellow-900 min-w-0">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-yellow-600 text-white text-[12px] font-semibold hover:bg-yellow-700 transition-colors shrink-0"
      >
        <RotateCw size={13} strokeWidth={2.5} />
        Reintentar
      </button>
    </div>
  );
};
