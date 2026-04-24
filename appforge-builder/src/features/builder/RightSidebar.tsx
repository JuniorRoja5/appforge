import React from 'react';
import { useBuilderStore } from '../../store/useBuilderStore';
import { getModule } from '../../modules/registry';
import { ThemeEditorPanel } from './ThemeEditorPanel';
import { computeTabs } from './utils/computeTabs';
import { LucideIconByName } from './LucideIconByName';

const TAB_LABELS_FALLBACK: Record<string, string> = {
  news_feed: 'Noticias', photo_gallery: 'Galería', events: 'Eventos', contact: 'Contacto',
  menu_restaurant: 'Carta', discount_coupon: 'Cupones', catalog: 'Catálogo', booking: 'Reservas',
  social_wall: 'Social', fan_wall: 'Fan Wall', push_notification: 'Avisos', user_profile: 'Perfil',
  links: 'Enlaces', pdf_reader: 'PDF', loyalty_card: 'Fidelidad', custom_page: 'Página',
  text_module: 'Texto', image_module: 'Imagen', button_module: 'Botón',
};
const TAB_ICONS_FALLBACK: Record<string, string> = {
  news_feed: 'book-open', photo_gallery: 'camera', events: 'calendar', contact: 'phone',
  menu_restaurant: 'utensils', discount_coupon: 'tag', catalog: 'shopping-bag', booking: 'clock',
  social_wall: 'message-circle', fan_wall: 'heart', push_notification: 'bell', user_profile: 'user',
  links: 'link', pdf_reader: 'file-text', loyalty_card: 'star', custom_page: 'file-text',
  text_module: 'file-text', image_module: 'image', button_module: 'circle',
};

/** Small section selector shown above the module's SettingsPanel */
const TabAssignment: React.FC<{ elementId: string; moduleId: string; currentTabIndex: number | null | undefined }> = ({
  elementId, moduleId, currentTabIndex,
}) => {
  const { elements, updateElementNavMeta } = useBuilderStore();
  const tabs = computeTabs(elements);

  const handleChange = (value: string) => {
    if (value === '__new__') {
      const usedIndexes = elements.map((el) => el.tabIndex).filter((i): i is number => i != null);
      const nextIdx = usedIndexes.length > 0 ? Math.max(...usedIndexes) + 1 : 0;
      updateElementNavMeta(elementId, {
        tabIndex: nextIdx,
        tabLabel: TAB_LABELS_FALLBACK[moduleId] ?? getModule(moduleId)?.name ?? 'Sección',
        tabIcon: TAB_ICONS_FALLBACK[moduleId] ?? 'circle',
      });
    } else if (value === '__all__') {
      updateElementNavMeta(elementId, { tabIndex: null });
    } else {
      updateElementNavMeta(elementId, { tabIndex: parseInt(value, 10), tabLabel: '', tabIcon: '' });
    }
  };

  return (
    <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-xl">
      <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
        Sección del menú
      </label>
      <select
        value={currentTabIndex == null ? '__all__' : String(currentTabIndex)}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
      >
        {tabs.map((tab) => (
          <option key={tab.index} value={String(tab.index)}>
            {tab.label}
          </option>
        ))}
        <option value="__all__">Visible en todas</option>
        <option value="__new__">+ Crear nueva sección</option>
      </select>
      {/* Show current tab icon preview */}
      {currentTabIndex != null && (
        <div className="flex items-center gap-2 mt-2 text-[11px] text-gray-400">
          <LucideIconByName name={tabs.find(t => t.index === currentTabIndex)?.icon || 'circle'} size={14} />
          <span>Aparece en: {tabs.find(t => t.index === currentTabIndex)?.label || 'Sección'}</span>
        </div>
      )}
    </div>
  );
};

export const RightSidebar: React.FC = () => {
  const { elements, selectedElementId, updateElementConfig, removeElement } = useBuilderStore();

  const selectedElement = elements.find(el => el.id === selectedElementId);
  const moduleDef = selectedElement ? getModule(selectedElement.moduleId) : null;

  const showTheme = !selectedElement || !moduleDef;

  return (
    <aside className="w-[400px] bg-white border-l border-gray-200/80 flex flex-col h-full overflow-hidden shrink-0 shadow-[-4px_0_24px_rgba(0,0,0,0.02)] z-10 relative">
      <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-white/95 backdrop-blur-xl sticky top-0 z-10">
        <div>
          <h2 className="font-bold text-[11px] uppercase tracking-widest text-gray-400">
            {showTheme ? 'Tema y Diseño' : 'Propiedades'}
          </h2>
          <p className="text-[13px] font-medium text-gray-800 mt-1">
            {moduleDef ? moduleDef.name : 'Personalización'}
          </p>
        </div>

        {selectedElement && (
          <button
            onClick={() => removeElement(selectedElement.id)}
            className="group flex items-center justify-center w-8 h-8 rounded-full text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
            title="Eliminar elemento"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-5 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; }`}</style>
        {showTheme ? (
          <ThemeEditorPanel />
        ) : (
          <div className="space-y-6 pb-8">
            {/* Tab/Section assignment */}
            <TabAssignment
              elementId={selectedElement.id}
              moduleId={selectedElement.moduleId}
              currentTabIndex={selectedElement.tabIndex}
            />
            {React.createElement(moduleDef.SettingsPanel, {
              data: selectedElement.config,
              onChange: (newConfig: any) => updateElementConfig(selectedElement.id, newConfig)
            })}
          </div>
        )}
      </div>
    </aside>
  );
};
