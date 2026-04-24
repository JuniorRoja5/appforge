import React from 'react';
import { CollapsibleSection } from './theme-editor/CollapsibleSection';
import { ColorGroupEditor } from './theme-editor/ColorGroupEditor';
import { SurfaceColorEditor } from './theme-editor/SurfaceColorEditor';
import { FontSelector } from './theme-editor/FontSelector';
import { ShapePresetPicker } from './theme-editor/ShapePresetPicker';
import { NavigationConfigurator } from './theme-editor/NavigationConfigurator';
import { useBuilderStore } from '../../store/useBuilderStore';

export const ThemeEditorPanel: React.FC = () => {
  const designTokens = useBuilderStore((s) => s.designTokens);

  if (!designTokens) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 opacity-60">
        <svg className="w-12 h-12 mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
        <span className="text-sm font-medium">Sin tema configurado</span>
        <span className="text-[11px] mt-1">Crea una app desde una plantilla para empezar</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Colors */}
      <CollapsibleSection title="Colores" defaultOpen>
        <ColorGroupEditor label="Primario" path={['colors', 'primary']} />
        <ColorGroupEditor label="Secundario" path={['colors', 'secondary']} />
        <ColorGroupEditor label="Acento" path={['colors', 'accent']} />
        <div className="border-t border-gray-100 pt-3">
          <SurfaceColorEditor />
        </div>
      </CollapsibleSection>

      {/* Typography */}
      <CollapsibleSection title="Tipografía">
        <FontSelector label="Fuente de títulos" path={['typography', 'families', 'heading']} />
        <FontSelector label="Fuente de cuerpo" path={['typography', 'families', 'body']} />
      </CollapsibleSection>

      {/* Shape */}
      <CollapsibleSection title="Forma">
        <ShapePresetPicker />
      </CollapsibleSection>

      {/* Navigation */}
      <CollapsibleSection title="Navegación">
        <NavigationConfigurator />
      </CollapsibleSection>
    </div>
  );
};
