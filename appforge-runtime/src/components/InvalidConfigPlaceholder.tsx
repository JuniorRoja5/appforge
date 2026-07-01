import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { ZodError } from 'zod';

/**
 * Phase 3c — Placeholder shown in place of a module whose config fails
 * safeParse in preview mode. Visual style mirrors PreviewErrorBanner
 * (fase 2.3) — same yellow palette (bg #fffbeb, border #fcd34d, icon
 * color #b45309, text color #713f12), same AlertTriangle icon — but
 * lives in the runtime so it renders INSIDE the iframe, right where
 * the module would have rendered.
 *
 * Only ever mounted when the runtime's Outer detects `isPreviewMode() &&
 * !cfg.ok`. In production PWAs the runtime falls back silently through
 * the Inner's per-field defensive reads; the placeholder never renders.
 *
 * Displays up to 3 issues from the ZodError; if more, shows a "+N más"
 * summary. This is enough for the constructor to identify what field
 * is wrong in the SettingsPanel; the full error is available in the
 * DevTools console via the helper's console.warn.
 */
export const InvalidConfigPlaceholder: React.FC<{
  moduleId: string;
  error: ZodError;
}> = ({ moduleId, error }) => {
  const issues = error.issues.slice(0, 3);
  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-lg shadow-sm my-2"
      style={{
        backgroundColor: '#fffbeb',
        border: '1px solid #fcd34d',
        color: '#713f12',
      }}
    >
      <AlertTriangle
        size={18}
        style={{ color: '#b45309', flexShrink: 0, marginTop: 2 }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium">
          Configuración inválida — revisa el panel de propiedades.
        </p>
        <p className="text-[12px] mt-0.5 opacity-90">
          Módulo: <code>{moduleId}</code>
        </p>
        {issues.map((issue, i) => (
          <p key={i} className="text-[11px] mt-1 font-mono opacity-80">
            {issue.path.length ? issue.path.join('.') : '(root)'}: {issue.message}
          </p>
        ))}
        {error.issues.length > 3 && (
          <p className="text-[11px] mt-1 opacity-60">
            +{error.issues.length - 3} problemas más…
          </p>
        )}
      </div>
    </div>
  );
};
