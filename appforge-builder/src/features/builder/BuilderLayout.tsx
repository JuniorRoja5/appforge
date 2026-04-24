import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LeftSidebar } from './LeftSidebar';
import { CentralCanvas } from './CentralCanvas';
import { RightSidebar } from './RightSidebar';
import { useBuilderStore } from '../../store/useBuilderStore';
import { useAuthStore } from '../../store/useAuthStore';
import { getModule } from '../../modules/registry';
import { saveAppSchema, getApp } from '../../lib/api';
import { resolveAssetUrl } from '../../lib/resolve-asset-url';
import type { CanvasElement } from '../../store/useBuilderStore';
import { resolveDesignTokens } from '../../lib/niche-templates/applyTheme';
import { DndContext, type DragEndEvent, type DragStartEvent, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { AppConfigModal } from './app-config/AppConfigModal';
import { BuildPanel } from './BuildPanel';
import { DropTargetPopover } from './DropTargetPopover';
import { computeTabs } from './utils/computeTabs';
import { useAppConfigStore } from '../../store/useAppConfigStore';
import { Loader2, Check } from 'lucide-react';

const MODULE_IDS_WITH_APPID = [
  'news_feed', 'contact', 'photo_gallery', 'events',
  'menu_restaurant', 'discount_coupon', 'catalog', 'booking',
  'social_wall', 'fan_wall', 'push_notification', 'user_profile',
  'loyalty_card',
];

/** Spanish display labels for navigation tabs */
const MODULE_TAB_LABELS: Record<string, string> = {
  news_feed: 'Noticias',
  photo_gallery: 'Galería',
  events: 'Eventos',
  contact: 'Contacto',
  menu_restaurant: 'Carta',
  discount_coupon: 'Cupones',
  catalog: 'Catálogo',
  booking: 'Reservas',
  social_wall: 'Social',
  fan_wall: 'Fan Wall',
  push_notification: 'Avisos',
  user_profile: 'Perfil',
  links: 'Enlaces',
  pdf_reader: 'PDF',
  video: 'Videos',
  loyalty_card: 'Fidelidad',
  testimonials: 'Testimonios',
  hero_profile: 'Hero',
  custom_page: 'Página',
  text_module: 'Texto',
  image_module: 'Imagen',
  button_module: 'Botón',
};

/** Icon name mapping (must match keys in LucideIconByName ICON_MAP) */
const MODULE_TAB_ICONS: Record<string, string> = {
  news_feed: 'book-open',
  photo_gallery: 'camera',
  events: 'calendar',
  contact: 'phone',
  menu_restaurant: 'utensils',
  discount_coupon: 'tag',
  catalog: 'shopping-bag',
  booking: 'clock',
  social_wall: 'message-circle',
  fan_wall: 'heart',
  push_notification: 'bell',
  user_profile: 'user',
  links: 'link',
  pdf_reader: 'file-text',
  video: 'camera',
  loyalty_card: 'star',
  testimonials: 'message-circle',
  hero_profile: 'user',
  custom_page: 'file-text',
  text_module: 'file-text',
  image_module: 'image',
  button_module: 'circle',
};

export const BuilderLayout: React.FC = () => {
  const { appId } = useParams<{ appId: string }>();
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const { undo, redo, futureStates, pastStates } = useBuilderStore.temporal.getState();
  const { addElement, updateElementConfig, moveElement } = useBuilderStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [loadingApp, setLoadingApp] = useState(true);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [isConfigModalOpen, setConfigModalOpen] = useState(false);
  const [isBuildPanelOpen, setBuildPanelOpen] = useState(false);
  const [pendingDrop, setPendingDrop] = useState<{
    moduleId: string;
    config: Record<string, any>;
    tabLabel: string;
    tabIcon: string;
  } | null>(null);
  const [appName, setAppName] = useState('');
  const [appIconUrl, setAppIconUrl] = useState('');
  const configIconUrl = useAppConfigStore((s) => s.config?.icon?.url);
  const effectiveIconUrl = configIconUrl ?? appIconUrl;

  // Load app from backend on mount
  useEffect(() => {
    if (!appId || !token) return;
    let cancelled = false;

    const loadApp = async () => {
      try {
        setLoadingApp(true);
        const app = await getApp(appId, token);
        if (cancelled) return;
        const rawElements = Array.isArray(app.schema) ? (app.schema as CanvasElement[]) : [];
        // Migrate: ensure all elements have tabIndex (backward compat)
        // Also inject appId into modules that need it
        const elements = rawElements.map((el) => ({
          ...el,
          tabIndex: el.tabIndex !== undefined ? el.tabIndex : 0,
          tabLabel: el.tabLabel ?? '',
          tabIcon: el.tabIcon ?? '',
          config: MODULE_IDS_WITH_APPID.includes(el.moduleId)
            ? { ...el.config, appId }
            : el.config,
        }));
        const tokens = resolveDesignTokens(app.designTokens);
        useBuilderStore.getState().loadApp(elements, tokens);
        setAppName(app.name ?? '');
        setAppIconUrl(app.appConfig?.icon?.url ?? '');
      } catch (err) {
        console.error('Error loading app:', err);
        if (!cancelled) {
          alert('Error al cargar la app. Verifica que existe y tienes permisos.');
          navigate('/dashboard');
        }
      } finally {
        if (!cancelled) setLoadingApp(false);
      }
    };

    loadApp();
    return () => { cancelled = true; };
  }, [appId, token, navigate]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    // Palette → Canvas: add new module
    if (active.data.current?.type === 'module') {
      const isCanvasDrop = over.id === 'canvas-droppable' ||
        useBuilderStore.getState().elements.some((el) => el.id === over.id);
      if (isCanvasDrop) {
        const moduleId = active.data.current.moduleId;
        const moduleDef = getModule(moduleId);
        if (moduleDef) {
          const config = { ...moduleDef.defaultConfig };
          if (appId && MODULE_IDS_WITH_APPID.includes(moduleId)) {
            config.appId = appId;
          }
          const tabLabel = MODULE_TAB_LABELS[moduleId] ?? moduleDef.name;
          const tabIcon = MODULE_TAB_ICONS[moduleId] ?? 'circle';

          // Check existing tabs — if none, add directly; otherwise show popover
          const existingTabs = computeTabs(useBuilderStore.getState().elements);
          if (existingTabs.length === 0) {
            addElement(moduleId, config, { tabIndex: 0, tabLabel, tabIcon });
          } else {
            setPendingDrop({ moduleId, config, tabLabel, tabIcon });
          }
        }
      }
      return;
    }

    // Canvas element reorder (sortable)
    if (active.id !== over.id && active.data.current?.sortable) {
      moveElement(active.id as string, over.id as string);
    }
  };

  const handleDropSelectTab = (tabIndex: number) => {
    if (!pendingDrop) return;
    const { moduleId, config } = pendingDrop;
    addElement(moduleId, config, { tabIndex, tabLabel: '', tabIcon: '' });
    setPendingDrop(null);
  };

  const handleDropCreateNew = () => {
    if (!pendingDrop) return;
    const { moduleId, config, tabLabel, tabIcon } = pendingDrop;
    const usedIndexes = useBuilderStore.getState().elements
      .map((el) => el.tabIndex)
      .filter((i): i is number => i != null);
    const nextTabIndex = usedIndexes.length > 0 ? Math.max(...usedIndexes) + 1 : 0;
    addElement(moduleId, config, { tabIndex: nextTabIndex, tabLabel, tabIcon });
    setPendingDrop(null);
  };

  const handleSave = useCallback(async () => {
    if (!appId || !token) return;

    clearTimeout(autoSaveTimerRef.current);
    setSaving(true);
    try {
      const { elements, designTokens } = useBuilderStore.getState();
      await saveAppSchema(appId, elements, token, designTokens ?? undefined);

      // Inject appId into modules that need it
      const { elements: currentElements } = useBuilderStore.getState();
      for (const el of currentElements) {
        if (MODULE_IDS_WITH_APPID.includes(el.moduleId) && el.config.appId !== appId) {
          updateElementConfig(el.id, { ...el.config, appId });
        }
      }
      setDirty(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving app:', error);
      alert('Error al guardar. Verifica que el backend esté corriendo.');
    } finally {
      setSaving(false);
    }
  }, [appId, token, updateElementConfig]);

  // Ctrl+S keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave]);

  // Auto-save: debounce 30s after any store change
  useEffect(() => {
    const unsub = useBuilderStore.subscribe((state, prevState) => {
      if (state.elements !== prevState.elements || state.designTokens !== prevState.designTokens) {
        setDirty(true);
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = setTimeout(() => {
          handleSave();
        }, 30_000);
      }
    });
    return () => { unsub(); clearTimeout(autoSaveTimerRef.current); };
  }, [handleSave]);

  if (loadingApp) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Cargando app...</p>
        </div>
      </div>
    );
  }

  return (
    <>
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-screen w-full bg-gray-50 overflow-hidden font-sans">
        {/* Premium Top Navbar - Light Theme */}
        <header className="h-[64px] bg-white/80 backdrop-blur-2xl border-b border-gray-200/80 flex items-center justify-between px-6 shrink-0 z-20 shadow-sm relative">
          
          <div className="flex items-center space-x-5 w-1/3">
            <button
              onClick={() => navigate('/dashboard')}
              className="group flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200"
              title="Volver al dashboard"
            >
              <svg className="w-4 h-4 text-gray-500 group-hover:text-gray-800 transition-colors" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <div className="flex items-center space-x-2.5">
              {effectiveIconUrl ? (
                <div className="w-8 h-8 rounded-lg overflow-hidden shadow-sm border border-gray-200 shrink-0">
                  <img src={resolveAssetUrl(effectiveIconUrl)} alt="" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-sm shrink-0">
                  {appName ? appName.charAt(0).toUpperCase() : 'A'}
                </div>
              )}
              <h1 className="text-[15px] font-bold tracking-tight text-gray-900 truncate max-w-[160px]">
                {appName || 'Mi App'}
              </h1>
            </div>
          </div>

          {/* Central Toolbar (Undo/Redo) */}
          <div className="flex items-center justify-center w-1/3">
            <div className="flex bg-white/60 p-1.5 rounded-lg border border-gray-200/50 shadow-sm backdrop-blur-md">
              <button
                onClick={() => undo()}
                disabled={pastStates.length === 0}
                title="Deshacer"
                className={`p-1.5 rounded-md flex items-center justify-center transition-colors ${pastStates.length === 0 ? 'text-gray-300 cursor-not-allowed hidden' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'}`}
              >
                <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
              </button>
              <div className={`w-[1px] bg-gray-200 mx-1 ${pastStates.length === 0 && futureStates.length === 0 ? 'hidden' : 'block'}`} />
              <button
                onClick={() => redo()}
                disabled={futureStates.length === 0}
                title="Rehacer"
                className={`p-1.5 rounded-md flex items-center justify-center transition-colors ${futureStates.length === 0 ? 'text-gray-300 cursor-not-allowed hidden' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'}`}
              >
                <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" /></svg>
              </button>
            </div>
          </div>

          {/* Right Toolbar Actions */}
          <div className="flex items-center justify-end space-x-4 w-1/3">
              <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest hidden sm:flex mt-0.5">
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin" />
                    <span className="text-gray-400">Guardando...</span>
                  </>
                ) : dirty ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="text-amber-500">Sin guardar</span>
                  </>
                ) : saveSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-500">Guardado</span>
                  </>
                ) : null}
              </span>
              <button
                onClick={() => setConfigModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-[13px] font-semibold rounded-lg shadow-sm transition-all"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Ajustes
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 bg-gray-900 hover:bg-black text-white text-[13px] font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50"
              >
                {saving ? '...' : 'Guardar'}
              </button>
              <button
                onClick={() => setBuildPanelOpen(true)}
                className="px-5 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-[13px] font-bold rounded-lg shadow-sm transition-all flex items-center"
              >
                <span>Generar App</span>
                <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </button>
          </div>
        </header>

        {/* Main Builder Area */}
        <div className="flex flex-1 overflow-hidden">
          <LeftSidebar />
          <CentralCanvas appName={appName} />
          <RightSidebar />
        </div>
      </div>
      <DragOverlay dropAnimation={null}>
        {activeId && activeId.startsWith('module-') ? (
          <div className="flex items-center space-x-3 p-3 bg-white/95 backdrop-blur-sm border border-indigo-200 rounded-xl shadow-xl w-[240px] transform scale-105 rotate-2 transition-transform">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              {getModule(activeId.replace('module-', ''))?.icon || <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>}
            </div>
            <div>
              <h3 className="text-[13px] font-semibold text-gray-800">{getModule(activeId.replace('module-', ''))?.name || 'Módulo'}</h3>
              <p className="text-[11px] text-indigo-500 font-medium mt-0.5">Soltando en el simulador...</p>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
    <AppConfigModal isOpen={isConfigModalOpen} onClose={() => setConfigModalOpen(false)} />
    <BuildPanel isOpen={isBuildPanelOpen} onClose={() => setBuildPanelOpen(false)} />
    {pendingDrop && (
      <DropTargetPopover
        existingTabs={computeTabs(useBuilderStore.getState().elements)}
        moduleName={getModule(pendingDrop.moduleId)?.name ?? pendingDrop.moduleId}
        onSelectTab={handleDropSelectTab}
        onCreateNew={handleDropCreateNew}
        onCancel={() => setPendingDrop(null)}
      />
    )}
    </>
  );
};
