import React from 'react';
import { sanitize } from '../lib/sanitize';

interface Props {
  content: string;
  onAccept: () => void;
}

export const TermsScreen: React.FC<Props> = ({ content, onAccept }) => {
  const handleAccept = () => {
    localStorage.setItem('appforge_terms_accepted', 'true');
    onAccept();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 900,
      display: 'flex', flexDirection: 'column',
      backgroundColor: 'var(--color-surface-bg, #f9fafb)',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--color-divider, #e5e7eb)',
        backgroundColor: 'var(--color-surface-card, #fff)',
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary, #111827)', margin: 0 }}>
          Términos y Condiciones
        </h2>
        <p style={{ fontSize: 12, color: 'var(--color-text-secondary, #6b7280)', marginTop: 4 }}>
          Por favor lee y acepta los términos para continuar
        </p>
      </div>

      {/* Content */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: 20,
        WebkitOverflowScrolling: 'touch',
      }}>
        <div
          className="prose prose-sm max-w-none"
          style={{ color: 'var(--color-text-primary, #374151)', fontSize: 13, lineHeight: 1.7 }}
          dangerouslySetInnerHTML={{ __html: sanitize(content) }}
        />
      </div>

      {/* Accept button */}
      <div style={{
        padding: '16px 20px',
        borderTop: '1px solid var(--color-divider, #e5e7eb)',
        backgroundColor: 'var(--color-surface-card, #fff)',
      }}>
        <button
          onClick={handleAccept}
          style={{
            width: '100%', padding: '14px',
            backgroundColor: 'var(--color-primary, #4F46E5)',
            color: 'var(--color-text-on-primary, #fff)',
            borderRadius: 'var(--radius-button, 12px)',
            fontSize: 15, fontWeight: 600,
            border: 'none', cursor: 'pointer',
          }}
        >
          Acepto los Términos y Condiciones
        </button>
      </div>
    </div>
  );
};
