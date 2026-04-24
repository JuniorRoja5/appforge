import React, { useState } from 'react';
import { useBuilderStore } from '../../../store/useBuilderStore';
import { darken, lighten } from '../../../lib/niche-templates/migration';
import { ChevronDown } from 'lucide-react';

interface ColorGroupEditorProps {
  label: string;
  path: string[]; // e.g. ['colors', 'primary']
}

export const ColorGroupEditor: React.FC<ColorGroupEditorProps> = ({ label, path }) => {
  const designTokens = useBuilderStore((s) => s.designTokens);
  const update = useBuilderStore((s) => s.updateDesignTokensPartial);
  const [showVariants, setShowVariants] = useState(false);

  // Navigate to the color variant at the given path
  const getColor = (subKey: string): string => {
    if (!designTokens) return '#000000';
    let obj: any = designTokens;
    for (const key of path) obj = obj?.[key];
    return obj?.[subKey] ?? '#000000';
  };

  const mainColor = getColor('main');
  const darkColor = getColor('dark');
  const lightColor = getColor('light');

  const handleMainChange = (hex: string) => {
    // Update main and auto-derive dark/light
    update([...path, 'main'], hex);
    update([...path, 'dark'], darken(hex));
    update([...path, 'light'], lighten(hex));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-gray-50 transition-colors group">
        <label className="relative w-8 h-8 rounded-full overflow-hidden border border-gray-200 cursor-pointer shadow-sm ring-2 ring-transparent group-hover:ring-orange-500/30 transition-all shrink-0">
          <input
            type="color"
            value={mainColor}
            onChange={(e) => handleMainChange(e.target.value)}
            className="absolute inset-0 w-full h-[150%] -translate-y-1/4 opacity-0 cursor-pointer"
          />
          <div className="w-full h-full" style={{ backgroundColor: mainColor }} />
        </label>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
          <input
            type="text"
            value={mainColor}
            onChange={(e) => {
              const v = e.target.value;
              if (/^#[0-9A-Fa-f]{6}$/.test(v)) handleMainChange(v);
            }}
            className="w-full text-xs font-mono text-gray-900 bg-transparent border-none p-0 focus:outline-none focus:text-orange-600 transition-colors"
            maxLength={7}
          />
        </div>
        <button
          onClick={() => setShowVariants((v) => !v)}
          className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          title="Variantes"
        >
          <ChevronDown size={14} className={`transition-transform ${showVariants ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {showVariants && (
        <div className="ml-11 flex flex-col gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100">
          <VariantRow
            label="Oscuro"
            color={darkColor}
            onChange={(hex) => update([...path, 'dark'], hex)}
          />
          <VariantRow
            label="Claro"
            color={lightColor}
            onChange={(hex) => update([...path, 'light'], hex)}
          />
        </div>
      )}
    </div>
  );
};

const VariantRow: React.FC<{ label: string; color: string; onChange: (hex: string) => void }> = ({
  label,
  color,
  onChange,
}) => (
  <div className="flex items-center gap-2">
    <label className="relative w-5 h-5 rounded-full overflow-hidden border border-gray-200 cursor-pointer shrink-0">
      <input
        type="color"
        value={color}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 w-full h-[150%] -translate-y-1/4 opacity-0 cursor-pointer"
      />
      <div className="w-full h-full" style={{ backgroundColor: color }} />
    </label>
    <span className="text-[10px] font-semibold text-gray-500 uppercase flex-1">{label}</span>
    <span className="text-[10px] font-mono text-gray-500">{color}</span>
  </div>
);
