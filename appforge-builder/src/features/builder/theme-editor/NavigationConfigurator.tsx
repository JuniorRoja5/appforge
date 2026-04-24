import React from 'react';
import { useBuilderStore } from '../../../store/useBuilderStore';
import { getModule } from '../../../modules/registry';
import { AVAILABLE_ICONS } from '../LucideIconByName';
import {
  LayoutGrid, PanelTop, Menu,
} from 'lucide-react';

type NavStyle = 'bottom_tabs' | 'top_tabs' | 'side_drawer';
type ActiveIndicator = 'pill' | 'dot' | 'underline' | 'none';

const NAV_STYLES: { value: NavStyle; label: string; icon: React.ReactNode }[] = [
  { value: 'bottom_tabs', label: 'Inferior', icon: <LayoutGrid size={16} /> },
  { value: 'top_tabs', label: 'Superior', icon: <PanelTop size={16} /> },
  { value: 'side_drawer', label: 'Lateral', icon: <Menu size={16} /> },
];

const INDICATORS: { value: ActiveIndicator; label: string }[] = [
  { value: 'pill', label: 'Pastilla' },
  { value: 'dot', label: 'Punto' },
  { value: 'underline', label: 'Línea' },
  { value: 'none', label: 'Ninguno' },
];

export const NavigationConfigurator: React.FC = () => {
  const designTokens = useBuilderStore((s) => s.designTokens);
  const elements = useBuilderStore((s) => s.elements);
  const updateTokens = useBuilderStore((s) => s.updateDesignTokensPartial);
  const updateNavMeta = useBuilderStore((s) => s.updateElementNavMeta);

  const navStyle = designTokens?.navigation?.style ?? 'bottom_tabs';
  const showLabels = designTokens?.navigation?.show_labels ?? true;
  const activeIndicator = designTokens?.navigation?.active_indicator ?? 'pill';

  return (
    <div className="space-y-4">
      {/* Nav Style */}
      <div>
        <p className="text-xs font-medium text-gray-700 mb-2">Estilo de navegación</p>
        <div className="grid grid-cols-3 gap-2">
          {NAV_STYLES.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateTokens(['navigation', 'style'], opt.value)}
              className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg border-2 transition-all text-xs ${
                navStyle === opt.value
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              {opt.icon}
              <span className="font-medium">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Show Labels */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-700">Mostrar etiquetas</span>
        <button
          onClick={() => updateTokens(['navigation', 'show_labels'], !showLabels)}
          className={`relative w-10 h-5 rounded-full transition-colors ${
            showLabels ? 'bg-indigo-500' : 'bg-gray-300'
          }`}
        >
          <span
            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
              showLabels ? 'left-[22px]' : 'left-0.5'
            }`}
          />
        </button>
      </div>

      {/* Active Indicator */}
      <div>
        <p className="text-xs font-medium text-gray-700 mb-2">Indicador activo</p>
        <div className="flex gap-1">
          {INDICATORS.map((ind) => (
            <button
              key={ind.value}
              onClick={() => updateTokens(['navigation', 'active_indicator'], ind.value)}
              className={`flex-1 py-1.5 text-[11px] font-medium rounded-md transition-colors ${
                activeIndicator === ind.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {ind.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Assignments */}
      <div>
        <p className="text-xs font-medium text-gray-700 mb-2">Asignación de tabs</p>
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {elements.map((el) => {
            const mod = getModule(el.moduleId);
            return (
              <div key={el.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                {/* Module name */}
                <span className="text-xs font-medium text-gray-700 truncate flex-1 min-w-0">
                  {mod?.name ?? el.moduleId}
                </span>

                {/* Tab index */}
                <select
                  value={el.tabIndex == null ? 'all' : String(el.tabIndex)}
                  onChange={(e) => {
                    const val = e.target.value;
                    updateNavMeta(el.id, {
                      tabIndex: val === 'all' ? null : Number(val),
                    });
                  }}
                  className="border border-gray-300 rounded px-1.5 py-1 text-[11px] w-16 shrink-0"
                >
                  <option value="all">Todas</option>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <option key={i} value={String(i)}>Tab {i + 1}</option>
                  ))}
                </select>

                {/* Tab label */}
                <input
                  type="text"
                  value={el.tabLabel ?? ''}
                  onChange={(e) => updateNavMeta(el.id, { tabLabel: e.target.value })}
                  placeholder="Label"
                  className="border border-gray-300 rounded px-1.5 py-1 text-[11px] w-16 shrink-0"
                />

                {/* Tab icon */}
                <select
                  value={el.tabIcon ?? 'circle'}
                  onChange={(e) => updateNavMeta(el.id, { tabIcon: e.target.value })}
                  className="border border-gray-300 rounded px-1 py-1 text-[11px] w-14 shrink-0"
                >
                  {AVAILABLE_ICONS.map((icon) => (
                    <option key={icon} value={icon}>{icon}</option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
