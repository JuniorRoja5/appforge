import React from 'react';
import { useBuilderStore } from '../../../store/useBuilderStore';

const FONT_LIST = [
  // Sans-serif
  { family: 'Inter', category: 'Sans-serif' },
  { family: 'Poppins', category: 'Sans-serif' },
  { family: 'Montserrat', category: 'Sans-serif' },
  { family: 'Nunito', category: 'Sans-serif' },
  { family: 'Open Sans', category: 'Sans-serif' },
  { family: 'Lato', category: 'Sans-serif' },
  { family: 'DM Sans', category: 'Sans-serif' },
  { family: 'Plus Jakarta Sans', category: 'Sans-serif' },
  { family: 'Space Grotesk', category: 'Sans-serif' },
  { family: 'Rubik', category: 'Sans-serif' },
  // Serif
  { family: 'Playfair Display', category: 'Serif' },
  { family: 'Merriweather', category: 'Serif' },
  { family: 'Lora', category: 'Serif' },
  { family: 'Cormorant Garamond', category: 'Serif' },
  { family: 'EB Garamond', category: 'Serif' },
  // Display
  { family: 'Syne', category: 'Display' },
  { family: 'Bebas Neue', category: 'Display' },
  { family: 'Oswald', category: 'Display' },
  { family: 'Raleway', category: 'Display' },
  { family: 'Abril Fatface', category: 'Display' },
  // Mono
  { family: 'JetBrains Mono', category: 'Mono' },
  { family: 'Fira Code', category: 'Mono' },
  { family: 'IBM Plex Mono', category: 'Mono' },
];

/** Load a Google Font dynamically */
function loadGoogleFont(family: string) {
  const id = `gf-${family.replace(/\s+/g, '-').toLowerCase()}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
}

interface FontSelectorProps {
  label: string;
  path: string[]; // e.g. ['typography', 'families', 'heading']
}

export const FontSelector: React.FC<FontSelectorProps> = ({ label, path }) => {
  const designTokens = useBuilderStore((s) => s.designTokens);
  const update = useBuilderStore((s) => s.updateDesignTokensPartial);

  const getCurrentFont = (): string => {
    if (!designTokens) return 'Inter';
    let obj: any = designTokens;
    for (const key of path) obj = obj?.[key];
    return (typeof obj === 'string' ? obj : 'Inter');
  };

  const currentFont = getCurrentFont();

  const handleChange = (family: string) => {
    loadGoogleFont(family);
    update(path, family);
    // Also update display font when heading changes
    if (path[path.length - 1] === 'heading') {
      update(['typography', 'families', 'display'], family);
    }
  };

  // Group fonts by category
  const categories = [...new Set(FONT_LIST.map((f) => f.category))];

  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1.5">{label}</label>
      <select
        value={currentFont}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white"
        style={{ fontFamily: `'${currentFont}', sans-serif` }}
      >
        {categories.map((cat) => (
          <optgroup key={cat} label={cat}>
            {FONT_LIST.filter((f) => f.category === cat).map((f) => (
              <option key={f.family} value={f.family} style={{ fontFamily: `'${f.family}', sans-serif` }}>
                {f.family}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <p
        className="mt-1.5 text-xs text-gray-500 truncate"
        style={{ fontFamily: `'${currentFont}', sans-serif` }}
      >
        Ejemplo de texto con {currentFont}
      </p>
    </div>
  );
};
