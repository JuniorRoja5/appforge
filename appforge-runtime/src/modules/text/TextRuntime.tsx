import React from 'react';
import { sanitize } from '../../lib/sanitize';
import { registerRuntimeModule } from '../registry';
// Phase 3c — Outer/Inner wrapper pattern. Inner keeps the 3a pilot
// verbatim (safeParse against the schema + fallback to TEXT_DEFAULTS
// when invalid). Outer adds the preview placeholder gate BEFORE
// Inner mounts, so an invalid config in preview never runs the
// Inner's safeParse (redundant work) — the placeholder wins.
// The 3a `console.warn` inside Inner is REMOVED because the helper's
// dedup'd warn in validateConfig covers it (single warn per moduleId
// per session, matches operator's ajuste 1).
import { TextModuleConfigSchema } from '../../lib/shared/module-schemas/text_module.schema';
import { validateConfig } from '../../lib/module-validation';
import { InvalidConfigPlaceholder } from '../../components/InvalidConfigPlaceholder';
import { isPreviewMode } from '../../lib/manifest';

const TEXT_DEFAULTS = {
  content: '',
  align: 'left' as const,
  fontSize: '1rem',
};

const TextRuntimeInner: React.FC<{ data: Record<string, unknown> }> = ({ data }) => {
  const parsed = TextModuleConfigSchema.safeParse(data);
  const cfg = parsed.success ? parsed.data : TEXT_DEFAULTS;

  return (
    <div
      style={{
        textAlign: cfg.align,
        fontSize: cfg.fontSize,
        color: 'var(--color-text-primary, #111827)',
        lineHeight: '1.6',
      }}
      dangerouslySetInnerHTML={{ __html: sanitize(cfg.content) }}
    />
  );
};

const TextRuntime: React.FC<{ data: Record<string, unknown> }> = ({ data }) => {
  const cfg = validateConfig(TextModuleConfigSchema, data, 'text_module');
  if (!cfg.ok && isPreviewMode()) {
    return <InvalidConfigPlaceholder moduleId="text_module" error={cfg.error!} />;
  }
  return <TextRuntimeInner data={data} />;
};

registerRuntimeModule({ id: 'text_module', Component: TextRuntime });
