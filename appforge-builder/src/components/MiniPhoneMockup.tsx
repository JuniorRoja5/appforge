import React, { useMemo } from 'react';
import type { DesignTokens } from '../lib/niche-templates/types';
import { getDesignTokenStyles } from '../lib/niche-templates/applyTheme';

interface MiniPhoneMockupProps {
  tokens: DesignTokens;
  templateName?: string;
}

/**
 * Renders a small (~160×280px) stylized phone preview
 * that reflects the template's design tokens.
 */
export const MiniPhoneMockup: React.FC<MiniPhoneMockupProps> = ({ tokens, templateName }) => {
  // trigger font loading as a side effect
  useMemo(() => getDesignTokenStyles(tokens), [tokens]);

  const { colors, shape, typography, navigation: nav } = tokens;
  const cardRadius = shape.components.card;
  const isDark = isColorDark(colors.surface.background);

  return (
    <div
      className="w-[156px] h-[270px] rounded-[20px] overflow-hidden flex flex-col relative"
      style={{
        backgroundColor: '#1C1C1E',
        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
      }}
    >
      {/* Screen content */}
      <div
        className="flex-1 flex flex-col overflow-hidden m-[3px] rounded-[18px]"
        style={{ backgroundColor: colors.surface.background }}
      >
        {/* Status bar */}
        <div
          className="h-5 flex items-center justify-center shrink-0"
          style={{ backgroundColor: colors.navigation.background }}
        >
          <div className="w-12 h-1.5 rounded-full bg-black/20" />
        </div>

        {/* Hero banner */}
        <div
          className="h-16 shrink-0 flex items-end px-3 pb-2"
          style={{
            background: `linear-gradient(135deg, ${colors.primary.main}, ${colors.primary.dark})`,
          }}
        >
          {templateName && (
            <span
              className="text-[10px] font-bold truncate"
              style={{
                color: colors.text.on_primary,
                fontFamily: `'${typography.families.heading}', sans-serif`,
                letterSpacing: typography.letter_spacing.tight,
              }}
            >
              {templateName}
            </span>
          )}
        </div>

        {/* Content cards */}
        <div className="flex-1 px-2 py-2 space-y-1.5 overflow-hidden">
          {/* Card 1 - full width */}
          <div
            className="h-10 flex items-center px-2 gap-1.5"
            style={{
              backgroundColor: colors.surface.card,
              borderRadius: cardRadius,
              boxShadow: shape.shadow.sm,
            }}
          >
            <div
              className="w-7 h-7 rounded shrink-0"
              style={{
                backgroundColor: colors.primary.light,
                borderRadius: shape.components.image,
              }}
            />
            <div className="flex-1 space-y-0.5">
              <div className="h-1.5 rounded-full w-3/4" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)' }} />
              <div className="h-1 rounded-full w-1/2" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }} />
            </div>
          </div>

          {/* Card 2 + 3 - two columns */}
          <div className="flex gap-1.5">
            {[colors.accent.light, colors.secondary.light].map((bg, i) => (
              <div
                key={i}
                className="flex-1 h-14 p-1.5 flex flex-col justify-end"
                style={{
                  backgroundColor: colors.surface.card,
                  borderRadius: cardRadius,
                  boxShadow: shape.shadow.sm,
                }}
              >
                <div
                  className="w-full h-6 rounded mb-1"
                  style={{ backgroundColor: bg, borderRadius: shape.components.image }}
                />
                <div className="h-1 rounded-full w-3/4" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)' }} />
              </div>
            ))}
          </div>

          {/* CTA button */}
          <div
            className="h-6 flex items-center justify-center mx-2"
            style={{
              backgroundColor: colors.accent.main,
              borderRadius: shape.components.button,
            }}
          >
            <div className="h-1 rounded-full w-10" style={{ backgroundColor: colors.text.on_primary }} />
          </div>
        </div>

        {/* Bottom navigation */}
        <div
          className="h-9 flex items-center justify-around px-3 shrink-0 border-t"
          style={{
            backgroundColor: colors.navigation.background,
            borderColor: colors.extras.divider,
          }}
        >
          {Array.from({ length: nav.tab_count }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: i === 0 ? colors.navigation.active : colors.navigation.inactive,
                  opacity: i === 0 ? 1 : 0.5,
                }}
              />
              {nav.show_labels && (
                <div
                  className="h-0.5 rounded-full"
                  style={{
                    width: '14px',
                    backgroundColor: i === 0 ? colors.navigation.active : colors.navigation.inactive,
                    opacity: i === 0 ? 0.8 : 0.3,
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/** Quick check if a hex color is dark (for choosing placeholder tints) */
function isColorDark(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
}
