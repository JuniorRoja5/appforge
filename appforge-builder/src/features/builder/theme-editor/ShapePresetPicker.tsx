import React from 'react';
import { useBuilderStore } from '../../../store/useBuilderStore';

interface ShapePreset {
  id: string;
  label: string;
  card: string;
  button: string;
  input: string;
  image: string;
}

const PRESETS: ShapePreset[] = [
  { id: 'rounded', label: 'Redondeado', card: '16px', button: '12px', input: '8px', image: '12px' },
  { id: 'sharp', label: 'Angular', card: '4px', button: '4px', input: '4px', image: '4px' },
  { id: 'pill', label: 'Pastilla', card: '24px', button: '9999px', input: '12px', image: '16px' },
];

export const ShapePresetPicker: React.FC = () => {
  const designTokens = useBuilderStore((s) => s.designTokens);
  const update = useBuilderStore((s) => s.updateDesignTokensPartial);

  // Detect current preset based on button radius
  const currentButton = designTokens?.shape?.components?.button ?? '12px';
  const activePreset =
    currentButton === '9999px' ? 'pill' : currentButton === '4px' ? 'sharp' : 'rounded';

  const applyPreset = (preset: ShapePreset) => {
    update(['shape', 'components', 'card'], preset.card);
    update(['shape', 'components', 'button'], preset.button);
    update(['shape', 'components', 'input'], preset.input);
    update(['shape', 'components', 'image'], preset.image);
    // Also update the general radius scale to match
    const baseNum = parseInt(preset.card) || 16;
    update(['shape', 'radius', 'sm'], `${Math.max(4, baseNum - 8)}px`);
    update(['shape', 'radius', 'md'], `${baseNum}px`);
    update(['shape', 'radius', 'lg'], `${baseNum + 4}px`);
    update(['shape', 'radius', 'xl'], `${baseNum + 12}px`);
  };

  return (
    <div>
      <p className="text-xs font-medium text-gray-700 mb-2">Estilo de bordes</p>
      <div className="grid grid-cols-3 gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => applyPreset(preset)}
            className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
              activePreset === preset.id
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            {/* Visual preview */}
            <div
              className="w-10 h-7 bg-gray-200 border border-gray-300"
              style={{ borderRadius: preset.card }}
            />
            <span className="text-[10px] font-medium text-gray-600">{preset.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
