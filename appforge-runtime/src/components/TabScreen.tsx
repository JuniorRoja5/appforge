import React, { useEffect, useRef } from 'react';
import type { CanvasElement } from '../lib/manifest';
import { getModule } from '../modules/registry';
import { trackModuleView } from '../lib/analytics';

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
              <div key={element.id} className="p-4 rounded-lg text-sm text-center" style={{ backgroundColor: 'var(--color-surface-variant, #f3f4f6)', color: 'var(--color-text-secondary, #6b7280)' }}>
                Módulo "{element.moduleId}" no disponible
              </div>
            );
          }
          const Component = mod.Component;
          return <Component key={element.id} data={element.config} apiUrl={apiUrl} appId={appId} />;
        })}
      </div>
    </div>
  );
};
