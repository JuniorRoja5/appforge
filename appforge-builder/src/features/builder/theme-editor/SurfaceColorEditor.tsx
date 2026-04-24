import React from 'react';
import { useBuilderStore } from '../../../store/useBuilderStore';

const SURFACE_FIELDS: { key: string; label: string; path: string[] }[] = [
  { key: 'background', label: 'Fondo', path: ['colors', 'surface', 'background'] },
  { key: 'card', label: 'Tarjeta', path: ['colors', 'surface', 'card'] },
  { key: 'variant', label: 'Variante', path: ['colors', 'surface', 'variant'] },
];

export const SurfaceColorEditor: React.FC = () => {
  const designTokens = useBuilderStore((s) => s.designTokens);
  const update = useBuilderStore((s) => s.updateDesignTokensPartial);

  const getColor = (path: string[]): string => {
    if (!designTokens) return '#FFFFFF';
    let obj: any = designTokens;
    for (const key of path) obj = obj?.[key];
    return (typeof obj === 'string' ? obj : '#FFFFFF');
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-gray-700">Superficies</p>
      <div className="grid grid-cols-3 gap-2">
        {SURFACE_FIELDS.map((field) => {
          const color = getColor(field.path);
          return (
            <div key={field.key} className="flex flex-col items-center gap-1">
              <label className="relative w-10 h-10 rounded-lg overflow-hidden border border-gray-200 cursor-pointer shadow-sm hover:shadow-md transition-shadow">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => update(field.path, e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="w-full h-full" style={{ backgroundColor: color }} />
              </label>
              <span className="text-[10px] text-gray-500">{field.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
