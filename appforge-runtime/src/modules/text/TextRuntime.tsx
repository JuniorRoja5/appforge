import React from 'react';
import { sanitize } from '../../lib/sanitize';
import { registerRuntimeModule } from '../registry';

const TextRuntime: React.FC<{ data: Record<string, unknown> }> = ({ data }) => {
  const content = (data.content as string) ?? '';
  const align = (data.align as string) ?? 'left';
  const fontSize = (data.fontSize as string) ?? '1rem';
  const fontWeight = (data.fontWeight as string) ?? '400';

  return (
    <div
      style={{
        textAlign: align as 'left' | 'center' | 'right',
        fontSize,
        fontWeight,
        color: 'var(--color-text-primary, #111827)',
        lineHeight: '1.6',
      }}
      dangerouslySetInnerHTML={{ __html: sanitize(content) }}
    />
  );
};

registerRuntimeModule({ id: 'text_module', Component: TextRuntime });
