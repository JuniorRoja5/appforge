import React from 'react';
import { sanitize } from '../../lib/sanitize';
import { registerRuntimeModule } from '../registry';
// Phase 3a — schema imported from the shared package. safeParse below
// is the anticipo of the validation flow that Phase 3c formalizes with
// `validateConfig` + `InvalidConfigPlaceholder`. Here it's deliberately
// minimal — falls back to defaults on invalid input, no placeholder UI
// yet — to keep 3a focused on validating the copy-shared infrastructure
// end-to-end without introducing UX scope that belongs to 3c.
import { TextModuleConfigSchema } from '../../lib/shared/module-schemas/text_module.schema';

const TEXT_DEFAULTS = {
  content: '',
  align: 'left' as const,
  fontSize: '1rem',
};

const TextRuntime: React.FC<{ data: Record<string, unknown> }> = ({ data }) => {
  const parsed = TextModuleConfigSchema.safeParse(data);
  const cfg = parsed.success ? parsed.data : TEXT_DEFAULTS;
  if (!parsed.success) {
    console.warn('[text_module] invalid config, using defaults:', parsed.error.message);
  }
  // Phase 3a — previous code read `data.fontWeight` defensively, but
  // the builder never declares or edits fontWeight (no entry in
  // SettingsPanel, no entry in defaultConfig), so no real manifest
  // ever carries it. The cast was zombie code that always fell to
  // '400'. Removed — the browser inherits font-weight from the
  // surrounding context as it would for any element without an
  // explicit value. The schema is the source of truth: only fields
  // that exist in the schema are read. Anything else is a sign the
  // schema or the runtime drifted, not a license to read undeclared
  // fields defensively.

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

registerRuntimeModule({ id: 'text_module', Component: TextRuntime });
