import React from 'react';
import { sanitize } from '../../lib/sanitize';
import { registerRuntimeModule } from '../registry';

const CustomPageRuntime: React.FC<{ data: Record<string, unknown> }> = ({ data }) => {
  const content = (data.htmlContent as string) ?? (data.content as string) ?? '';
  const bgColor = (data.backgroundColor as string) ?? '';
  const padding = (data.padding as number) ?? 16;
  const maxWidth = (data.maxWidth as string) ?? 'full';
  const widthMap: Record<string, string> = { full: '100%', narrow: '480px', medium: '640px' };

  return (
    <div style={{ backgroundColor: bgColor || undefined, padding }}>
      <div
        className="prose prose-sm max-w-none mx-auto"
        style={{ color: 'var(--color-text-primary)', lineHeight: '1.6', maxWidth: widthMap[maxWidth] ?? '100%' }}
        dangerouslySetInnerHTML={{ __html: sanitize(content) }}
      />
    </div>
  );
};

registerRuntimeModule({ id: 'custom_page', Component: CustomPageRuntime });
