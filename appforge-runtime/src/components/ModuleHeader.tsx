import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface Props {
  title: string;
  icon?: LucideIcon;
}

// Gradient section header for content modules. Closes the visual parity gap
// (F6) between the builder previews — which all show this colored bar — and
// the native APK, where the same modules were rendering plain gray <h3>
// titles. Reuses the design-token gradient (var(--color-primary) →
// var(--color-secondary)) so the bar adapts to the app's theme automatically.
//
// Renders null when title is empty so modules with optional titles
// (e.g. PdfReader with showTitle=false) can pass an empty string without
// the caller having to wrap it in a conditional.
//
// Future refactor opportunity: SocialWallRuntime and FanWallRuntime have
// their own near-identical gradient headers with extra props (headerColor
// override, emoji span). Migrating them to this component would require
// adding those props here. Left out of this commit to keep the change
// surface tight; opening to extension is straightforward when needed.
export const ModuleHeader: React.FC<Props> = ({ title, icon: Icon }) => {
  if (!title) return null;
  return (
    <div
      style={{
        background: 'linear-gradient(to right, var(--color-primary), var(--color-secondary))',
        borderRadius: 'var(--radius-card, 12px)',
        padding: '12px 16px',
        marginBottom: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      {Icon && <Icon size={18} color="#fff" />}
      <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{title}</span>
    </div>
  );
};
