import React from 'react';
import { BrowserShim as Browser } from '../../lib/platform';
import { registerRuntimeModule } from '../registry';

// Map builder's style names to variant styles
const STYLE_MAP: Record<string, string> = {
  solid: 'filled',
  outline: 'outlined',
  filled: 'filled',
  outlined: 'outlined',
  ghost: 'ghost',
};

const ButtonRuntime: React.FC<{ data: Record<string, unknown> }> = ({ data }) => {
  const label = (data.label as string) ?? 'Botón';
  const url = (data.url as string) ?? '';
  // Builder uses 'style', runtime used 'variant' — accept both
  const rawStyle = (data.style as string) ?? (data.variant as string) ?? 'solid';
  const variant = STYLE_MAP[rawStyle] ?? 'filled';
  const color = (data.color as string) || '';
  const textColor = (data.textColor as string) || '';
  const radius = (data.radius as string) || '';

  const handleClick = async () => {
    if (url) {
      try {
        await Browser.open({ url });
      } catch {
        window.open(url, '_blank');
      }
    }
  };

  const baseStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px 24px',
    borderRadius: radius || 'var(--radius-button, 12px)',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'center',
  };

  const bgColor = color || 'var(--color-primary, #4F46E5)';
  const fgColor = textColor || 'var(--color-text-on-primary, #fff)';

  const variantStyles: Record<string, React.CSSProperties> = {
    filled: {
      backgroundColor: bgColor,
      color: fgColor,
      border: 'none',
    },
    outlined: {
      backgroundColor: 'transparent',
      color: color || 'var(--color-primary, #4F46E5)',
      border: `2px solid ${bgColor}`,
    },
    ghost: {
      backgroundColor: 'transparent',
      color: color || 'var(--color-primary, #4F46E5)',
      border: 'none',
    },
  };

  return (
    <button onClick={handleClick} style={{ ...baseStyle, ...variantStyles[variant] }}>
      {label}
    </button>
  );
};

registerRuntimeModule({ id: 'button_module', Component: ButtonRuntime });