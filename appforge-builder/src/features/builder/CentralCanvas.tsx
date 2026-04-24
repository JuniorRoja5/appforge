import React, { useMemo, useState } from 'react';
import { useBuilderStore } from '../../store/useBuilderStore';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getModule } from '../../modules/registry';
import { getDesignTokenStyles } from '../../lib/niche-templates/applyTheme';
import { LucideIconByName } from './LucideIconByName';
import { computeTabs } from './utils/computeTabs';
import { X } from 'lucide-react';

// --- Sortable wrapper for each canvas element ---
const SortableCanvasElement: React.FC<{
  elementId: string;
  moduleId: string;
  config: Record<string, any>;
  isSelected: boolean;
  onSelect: (id: string) => void;
}> = ({ elementId, moduleId, config, isSelected, onSelect }) => {
  const moduleDef = getModule(moduleId);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: elementId });

  if (!moduleDef) return null;
  const Preview = moduleDef.PreviewComponent;

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`relative cursor-grab active:cursor-grabbing group ${isDragging ? 'shadow-lg rounded-lg' : ''}`}
      onClick={(e) => { e.stopPropagation(); onSelect(elementId); }}
    >
      <Preview data={config} isSelected={isSelected} />
    </div>
  );
};

export const CentralCanvas: React.FC<{ appName?: string }> = ({ appName }) => {
  const { elements, selectedElementId, selectElement, designTokens } = useBuilderStore();
  const { setNodeRef, isOver } = useDroppable({
    id: 'canvas-droppable',
    data: { type: 'canvas' },
  });

  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Compute CSS variable styles from design tokens for the phone preview
  const tokenStyles = useMemo(() => {
    if (!designTokens) return {};
    return getDesignTokenStyles(designTokens);
  }, [designTokens]);

  const bgColor = designTokens?.colors?.surface?.background ?? '#FFFFFF';
  const textColor = designTokens?.colors?.text?.primary ?? undefined;
  const fontFamily = designTokens?.typography?.families?.body
    ? `'${designTokens.typography.families.body}', sans-serif`
    : undefined;

  const navStyle = designTokens?.navigation?.style ?? 'bottom_tabs';
  const showLabels = designTokens?.navigation?.show_labels ?? true;
  const activeIndicator = designTokens?.navigation?.active_indicator ?? 'pill';
  const navBg = designTokens?.colors?.navigation?.background ?? '#FFFFFF';
  const navActive = designTokens?.colors?.navigation?.active ?? '#3B82F6';
  const navInactive = designTokens?.colors?.navigation?.inactive ?? '#9CA3AF';

  // Compute dynamic tabs from elements
  const tabs = useMemo(() => computeTabs(elements), [elements]);

  const hasTabs = tabs.length > 0;

  // Ensure activeTabIndex is valid
  const safeActiveTab = tabs.find((t) => t.index === activeTabIndex)
    ? activeTabIndex
    : tabs[0]?.index ?? 0;

  // Filter visible elements based on active tab
  const visibleElements = hasTabs
    ? elements.filter((el) => el.tabIndex === safeActiveTab || el.tabIndex == null)
    : elements;

  // --- Tab Bar Component ---
  const TabBar: React.FC<{ className?: string }> = ({ className = '' }) => {
    if (!hasTabs) return null;
    return (
      <div
        className={`flex items-start justify-around px-2 ${className}`}
        style={{ backgroundColor: `${navBg}E6` }}
      >
        {tabs.map((tab) => {
          const isActive = tab.index === safeActiveTab;
          return (
            <button
              key={tab.index}
              onClick={(e) => { e.stopPropagation(); setActiveTabIndex(tab.index); }}
              className="flex flex-col items-center transition-all active:scale-95 py-2 px-1 relative"
            >
              {/* Active indicator: pill */}
              {isActive && activeIndicator === 'pill' && (
                <div
                  className="absolute -top-0.5 w-8 h-1 rounded-full"
                  style={{ backgroundColor: navActive }}
                />
              )}
              {/* Active indicator: dot */}
              {isActive && activeIndicator === 'dot' && (
                <div
                  className="absolute -top-0.5 w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: navActive }}
                />
              )}

              <LucideIconByName
                name={tab.icon}
                size={22}
                className="mb-0.5"
              />
              {showLabels && (
                <span className="text-[10px] font-medium tracking-wide">
                  {tab.label}
                </span>
              )}

              {/* Active indicator: underline */}
              {isActive && activeIndicator === 'underline' && (
                <div
                  className="absolute -bottom-0.5 w-6 h-0.5 rounded-full"
                  style={{ backgroundColor: navActive }}
                />
              )}

              {/* Color the icon+label */}
              <style>{`
                [data-tab-idx="${tab.index}"] { color: ${isActive ? navActive : navInactive}; }
              `}</style>
            </button>
          );
        })}
      </div>
    );
  };

  // --- Drawer for side_drawer mode ---
  const DrawerOverlay: React.FC = () => {
    if (!drawerOpen || navStyle !== 'side_drawer') return null;
    return (
      <div className="absolute inset-0 z-50 flex" onClick={() => setDrawerOpen(false)}>
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/40 transition-opacity" />
        {/* Drawer panel */}
        <div
          className="relative w-[260px] h-full shadow-xl flex flex-col pt-14 pb-6 px-4 z-10 transition-transform"
          style={{ backgroundColor: navBg }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setDrawerOpen(false)}
            className="absolute top-4 right-3 p-1 rounded-full hover:bg-gray-200/50 transition-colors"
            style={{ color: navInactive }}
          >
            <X size={18} />
          </button>
          <div className="space-y-1 mt-2">
            {tabs.map((tab) => {
              const isActive = tab.index === safeActiveTab;
              return (
                <button
                  key={tab.index}
                  onClick={() => { setActiveTabIndex(tab.index); setDrawerOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                    isActive ? 'font-semibold' : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{
                    color: isActive ? navActive : navInactive,
                    backgroundColor: isActive ? `${navActive}15` : 'transparent',
                  }}
                >
                  <LucideIconByName name={tab.icon} size={20} />
                  <span className="text-sm">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <main
      className="flex-1 flex justify-center items-center overflow-y-auto p-12"
      onClick={() => selectElement(null)}
      style={{ backgroundColor: '#f8fafc', backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)', backgroundSize: '32px 32px' }}
    >
      {/* Mobile Device Simulator Frame */}
      <div
        className="w-[390px] h-[844px] bg-white rounded-[44px] shadow-[0_24px_60px_rgba(0,0,0,0.1),0_0_0_12px_#0f172a,0_0_0_13px_#334155] relative overflow-hidden flex flex-col transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Notch simulation (Dynamic Island Style) */}
        <div className="absolute top-3 inset-x-0 h-7 bg-[#0f172a] rounded-full w-[120px] mx-auto z-50 shadow-[0_2px_15px_rgba(0,0,0,0.1)]" />

        {/* Phone Header */}
        <div className="absolute top-0 inset-x-0 h-24 bg-white/60 backdrop-blur-xl z-40 border-b border-gray-200/50 flex items-end justify-between px-6 pb-4">
          {navStyle === 'side_drawer' && hasTabs ? (
            <>
              <button
                onClick={() => setDrawerOpen(true)}
                className="text-gray-900 hover:opacity-70 transition-opacity"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h8" />
                </svg>
              </button>
              <span className="font-semibold text-[17px] tracking-tight text-gray-900" style={{ fontFamily }}>
                {tabs.find((t) => t.index === safeActiveTab)?.label ?? 'AppForge'}
              </span>
              <div className="w-6" /> {/* Spacer for alignment */}
            </>
          ) : (
            <span className="font-semibold text-[17px] tracking-tight text-gray-900" style={{ fontFamily }}>{appName || 'Mi App'}</span>
          )}
        </div>

        {/* Top Tabs (when style is top_tabs) */}
        {navStyle === 'top_tabs' && hasTabs && (
          <div className="absolute top-24 inset-x-0 z-30 border-b border-gray-200/50 backdrop-blur-xl">
            <TabBar />
          </div>
        )}

        {/* App Content Area — design tokens applied here only */}
        <div
          ref={setNodeRef}
          className={`flex-1 overflow-x-hidden overflow-y-auto transition-colors ${isOver ? 'bg-blue-50/50' : ''}`}
          style={{
            ...tokenStyles,
            backgroundColor: bgColor,
            color: textColor,
            fontFamily,
            paddingTop: navStyle === 'top_tabs' && hasTabs ? '10rem' : '7rem',
            paddingBottom: navStyle === 'bottom_tabs' && hasTabs ? '6rem' : '1.5rem',
          } as React.CSSProperties}
        >
          {visibleElements.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 text-center space-y-4">
              <svg className="w-16 h-16 text-gray-300 drop-shadow-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <p className="text-[15px] font-medium opacity-70">Arrastra módulos aquí para<br />construir tu App</p>
            </div>
          ) : (
            <SortableContext items={visibleElements.map((el) => el.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-4">
                {visibleElements.map((el) => (
                  <SortableCanvasElement
                    key={el.id}
                    elementId={el.id}
                    moduleId={el.moduleId}
                    config={el.config}
                    isSelected={selectedElementId === el.id}
                    onSelect={selectElement}
                  />
                ))}
              </div>
            </SortableContext>
          )}
        </div>

        {/* Bottom Tab Bar (when style is bottom_tabs) */}
        {navStyle === 'bottom_tabs' && hasTabs && (
          <div className="absolute bottom-0 inset-x-0 h-[88px] backdrop-blur-xl z-40 border-t border-gray-200/50 pt-3 pb-6">
            <TabBar />
          </div>
        )}

        {/* Fallback: No tabs configured — show simple indicator */}
        {!hasTabs && (
          <div className="absolute bottom-0 inset-x-0 h-[88px] bg-white/80 backdrop-blur-xl z-40 border-t border-gray-200/50 flex items-center justify-center">
            <span className="text-[10px] text-gray-400">Configura tabs en el panel de Navegación →</span>
          </div>
        )}

        {/* Side Drawer Overlay */}
        <DrawerOverlay />
      </div>
    </main>
  );
};
