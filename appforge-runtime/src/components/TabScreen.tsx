import React, { useEffect, useMemo, useRef } from 'react';
import type { CanvasElement } from '../lib/manifest';
import { getModule } from '../modules/registry';
import { trackModuleView } from '../lib/analytics';
import { RuntimeErrorBoundary } from './RuntimeErrorBoundary';
import { PreviewSelectableWrapper } from './PreviewSelectableWrapper';

interface Props {
  elements: CanvasElement[];
  apiUrl: string;
  appId: string;
}

export const TabScreen: React.FC<Props> = ({ elements, apiUrl, appId }) => {
  const trackedRef = useRef<string | null>(null);

  // Track module views when this tab's elements render
  useEffect(() => {
    const key = elements.map((e) => e.moduleId).join(',');
    if (key === trackedRef.current) return;
    trackedRef.current = key;
    for (const el of elements) {
      trackModuleView(el.moduleId);
    }
  }, [elements]);

  // schemaSignal: stable string that changes whenever the structure
  // of this tab's elements changes (add/remove/reorder). Each
  // PreviewSelectableWrapper takes it as a dep to know when to
  // re-measure its bounds — necessary because reorder keeps the
  // React subtree mounted but moves it in the DOM, and
  // ResizeObserver does NOT fire on position-only changes.
  const schemaSignal = useMemo(
    () => elements.map((e) => e.id).join('|'),
    [elements],
  );

  return (
    <div
      className="flex-1 overflow-y-auto"
      style={{
        padding: `var(--spacing-screen-v, 20px) var(--spacing-screen-h, 16px)`,
        backgroundColor: 'var(--color-surface-bg, #fff)',
        WebkitOverflowScrolling: 'touch',
        height: '100%',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-section, 24px)' }}>
        {elements.map((element) => {
          const mod = getModule(element.moduleId);
          if (!mod) {
            return (
              <PreviewSelectableWrapper key={element.id} elementId={element.id} schemaSignal={schemaSignal}>
                <div className="p-4 rounded-lg text-sm text-center" style={{ backgroundColor: 'var(--color-surface-variant, #f3f4f6)', color: 'var(--color-text-secondary, #6b7280)' }}>
                  Módulo "{element.moduleId}" no disponible
                </div>
              </PreviewSelectableWrapper>
            );
          }
          const Component = mod.Component;
          // Per-module boundary: a crash inside one Component renders a small
          // fallback for that module only — sibling modules on the same tab
          // and the surrounding AppShell (nav, tab bar) keep working.
          // PreviewSelectableWrapper sits BETWEEN TabScreen and
          // RuntimeErrorBoundary so that boundary error fallbacks are
          // also clickable in preview (clicking a crashed module's
          // fallback still selects it in the builder).
          return (
            <PreviewSelectableWrapper key={element.id} elementId={element.id} schemaSignal={schemaSignal}>
              <RuntimeErrorBoundary label={element.moduleId}>
                <Component data={element.config} apiUrl={apiUrl} appId={appId} />
              </RuntimeErrorBoundary>
            </PreviewSelectableWrapper>
          );
        })}
      </div>
    </div>
  );
};
