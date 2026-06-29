import { create } from 'zustand';
import { temporal } from 'zundo';
import type { DesignTokens } from '../lib/niche-templates/types';

export interface CanvasElement {
  id: string; // Unique ID in the canvas (uuid)
  moduleId: string; // Refers to ModuleDefinition.id
  config: Record<string, any>;
  // Navigation metadata (optional for backward compat)
  tabIndex?: number | null; // null = visible on all tabs
  tabLabel?: string;
  tabIcon?: string;
}

interface BuilderState {
  elements: CanvasElement[];
  selectedElementId: string | null;
  designTokens: DesignTokens | null;
  // Feature flag para Preview-as-Runtime (Fase 1): cuando es true, el
  // CentralCanvas sustituye el área de contenido del smartphone por un
  // iframe que carga el runtime real desde preview.creatu.app. Default
  // false — se activa manualmente desde DevTools por app de prueba:
  //   useBuilderStore.getState().setUsePreviewIframe(true)
  // En Fase 4 del plan, cuando el iframe se vuelva default, se elimina
  // este flag junto con todos los PreviewComponent.
  usePreviewIframe: boolean;
  // Actions
  addElement: (moduleId: string, config: any, navMeta?: { tabIndex?: number | null; tabLabel?: string; tabIcon?: string }) => void;
  updateElementConfig: (elementId: string, config: any) => void;
  removeElement: (elementId: string) => void;
  moveElement: (activeId: string, overId: string) => void;
  selectElement: (elementId: string | null) => void;
  setDesignTokens: (tokens: DesignTokens | null) => void;
  updateDesignTokensPartial: (path: string[], value: unknown) => void;
  updateElementNavMeta: (elementId: string, meta: { tabIndex?: number | null; tabLabel?: string; tabIcon?: string }) => void;
  loadApp: (elements: CanvasElement[], designTokens: DesignTokens | null) => void;
  setUsePreviewIframe: (value: boolean) => void;
}

/** Deep-set a value at a given path in an object, returning a new object */
function deepSet<T extends Record<string, any>>(obj: T, path: string[], value: unknown): T {
  if (path.length === 0) return value as T;
  const [head, ...rest] = path;
  return {
    ...obj,
    [head]: rest.length === 0 ? value : deepSet((obj[head] ?? {}) as Record<string, any>, rest, value),
  } as T;
}

export const useBuilderStore = create<BuilderState>()(
  temporal(
    (set) => ({
      elements: [],
      selectedElementId: null,
      designTokens: null,
      usePreviewIframe: false,

      addElement: (moduleId, config, navMeta) => set((state) => ({
        elements: [...state.elements, {
          id: crypto.randomUUID(),
          moduleId,
          config,
          tabIndex: navMeta?.tabIndex ?? null,
          tabLabel: navMeta?.tabLabel ?? '',
          tabIcon: navMeta?.tabIcon ?? 'circle',
        }]
      })),

      updateElementConfig: (elementId, config) => set((state) => ({
        elements: state.elements.map(el => el.id === elementId ? { ...el, config } : el)
      })),

      removeElement: (elementId) => set((state) => ({
        elements: state.elements.filter(el => el.id !== elementId),
        selectedElementId: state.selectedElementId === elementId ? null : state.selectedElementId
      })),

      moveElement: (activeId, overId) => set((state) => {
        const oldIndex = state.elements.findIndex(el => el.id === activeId);
        const newIndex = state.elements.findIndex(el => el.id === overId);
        if (oldIndex === -1 || newIndex === -1) return state;

        const newElements = [...state.elements];
        const [movedItem] = newElements.splice(oldIndex, 1);
        newElements.splice(newIndex, 0, movedItem);
        return { elements: newElements };
      }),

      selectElement: (elementId) => set({ selectedElementId: elementId }),

      setDesignTokens: (tokens) => set({ designTokens: tokens }),

      updateDesignTokensPartial: (path, value) => set((state) => {
        if (!state.designTokens) return state;
        return { designTokens: deepSet(state.designTokens, path, value) };
      }),

      updateElementNavMeta: (elementId, meta) => set((state) => ({
        elements: state.elements.map(el =>
          el.id === elementId ? { ...el, ...meta } : el
        ),
      })),

      loadApp: (elements, designTokens) => set({
        elements,
        designTokens,
        selectedElementId: null,
      }),

      setUsePreviewIframe: (value) => set({ usePreviewIframe: value }),
    }),
    { limit: 50 } // Keep up to 50 past states for undo/redo
  )
);
