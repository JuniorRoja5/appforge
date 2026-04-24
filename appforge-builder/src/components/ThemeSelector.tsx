import React, { useState } from 'react';
import { nicheTemplates, templateCategories } from '../lib/niche-templates/nicheRegistry';
import type { NicheTemplate } from '../lib/niche-templates/types';
import { MiniPhoneMockup } from './MiniPhoneMockup';

interface ThemeSelectorProps {
  onSelect: (template: NicheTemplate) => void;
  onSelectBlank?: () => void;
  selectedId?: string | null;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({ onSelect, onSelectBlank, selectedId }) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const filtered = activeCategory === 'all'
    ? nicheTemplates
    : nicheTemplates.filter((t) => t.category === activeCategory);

  return (
    <div>
      {/* Category filter tabs */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {templateCategories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
              activeCategory === cat.id
                ? 'bg-gray-900 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Template grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Blank template card */}
        {activeCategory === 'all' && (
          <button
            onClick={() => onSelectBlank?.()}
            className={`group text-left rounded-2xl border-2 transition-all duration-200 overflow-hidden ${
              selectedId === '__blank'
                ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-lg'
                : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
            }`}
          >
            <div className="flex justify-center items-center pt-4 pb-2 bg-gradient-to-b from-gray-50 to-gray-100/50 h-[180px]">
              <div className="flex flex-col items-center gap-3 text-gray-400 group-hover:text-gray-500 transition-colors">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
                <span className="text-xs font-medium">Empezar desde cero</span>
              </div>
            </div>
            <div className="p-3 border-t border-gray-100">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-base">📄</span>
                <h3 className="text-sm font-bold text-gray-900">En Blanco</h3>
              </div>
              <p className="text-[11px] text-gray-500 line-clamp-1 mb-2">Sin plantilla, diseño libre</p>
              <div className="flex items-center justify-between">
                <div className="flex gap-0.5">
                  {['#4F46E5', '#6366F1', '#818CF8', '#F9FAFB', '#111827'].map((c, i) => (
                    <div key={i} className="w-3.5 h-3.5 rounded-full border border-white shadow-sm" style={{ backgroundColor: c }} />
                  ))}
                </div>
                <span className="text-[10px] text-gray-400 font-medium">0 módulos</span>
              </div>
            </div>
          </button>
        )}

        {filtered.map((template) => {
          const isSelected = selectedId === template.id;
          return (
            <button
              key={template.id}
              onClick={() => onSelect(template)}
              className={`group text-left rounded-2xl border-2 transition-all duration-200 overflow-hidden ${
                isSelected
                  ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-lg'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
              }`}
            >
              {/* Phone mockup preview */}
              <div className="flex justify-center pt-4 pb-2 bg-gradient-to-b from-gray-50 to-gray-100/50">
                <div className="transform transition-transform duration-200 group-hover:scale-[1.02]">
                  <MiniPhoneMockup
                    tokens={template.design_tokens}
                    templateName={template.name}
                  />
                </div>
              </div>

              {/* Info section */}
              <div className="p-3 border-t border-gray-100">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-base">{template.preview_emoji}</span>
                  <h3 className="text-sm font-bold text-gray-900 truncate">{template.name}</h3>
                </div>

                <p className="text-[11px] text-gray-500 line-clamp-1 mb-2">{template.tagline}</p>

                {/* Color swatches + module count */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-0.5">
                    {[
                      template.design_tokens.colors.primary.main,
                      template.design_tokens.colors.secondary.main,
                      template.design_tokens.colors.accent.main,
                      template.design_tokens.colors.surface.background,
                      template.design_tokens.colors.text.primary,
                    ].map((color, i) => (
                      <div
                        key={i}
                        className="w-3.5 h-3.5 rounded-full border border-white shadow-sm"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-gray-400 font-medium">
                    {template.default_modules.length} módulo{template.default_modules.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
