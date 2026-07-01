import React from 'react';
import { sanitize } from '../../lib/sanitize';
import { responsiveHtmlClass } from '../../lib/responsive-html';
import { registerRuntimeModule } from '../registry';
// Phase 3c — Outer/Inner wrapper. Inner byte-identical to 6e1290a.
// Legacy `data.content` fallback preserved.
import { CustomPageConfigSchema } from '../../lib/shared/module-schemas/custom_page.schema';
import { validateConfig } from '../../lib/module-validation';
import { InvalidConfigPlaceholder } from '../../components/InvalidConfigPlaceholder';
import { isPreviewMode } from '../../lib/manifest';

const CustomPageRuntimeInner: React.FC<{ data: Record<string, unknown> }> = ({ data }) => {
  const content = (data.htmlContent as string) ?? (data.content as string) ?? '';
  const bgColor = (data.backgroundColor as string) ?? '';
  const padding = (data.padding as number) ?? 16;
  const maxWidth = (data.maxWidth as string) ?? 'full';
  const widthMap: Record<string, string> = { full: '100%', narrow: '480px', medium: '640px' };

  return (
    <div style={{ backgroundColor: bgColor || undefined, padding }}>
      <div
        className={`${responsiveHtmlClass} mx-auto`}
        style={{ color: 'var(--color-text-primary)', lineHeight: '1.6', maxWidth: widthMap[maxWidth] ?? '100%' }}
        dangerouslySetInnerHTML={{ __html: sanitize(content).replace(/&nbsp;/g, ' ') }}
      />
    </div>
  );
};

const CustomPageRuntime: React.FC<{ data: Record<string, unknown> }> = ({ data }) => {
  const cfg = validateConfig(CustomPageConfigSchema, data, 'custom_page');
  if (!cfg.ok && isPreviewMode()) {
    return <InvalidConfigPlaceholder moduleId="custom_page" error={cfg.error!} />;
  }
  return <CustomPageRuntimeInner data={data} />;
};

registerRuntimeModule({ id: 'custom_page', Component: CustomPageRuntime });
