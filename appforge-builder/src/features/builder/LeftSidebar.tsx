import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Plus, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { getRegistry, getModule } from '../../modules/registry';
import { useBuilderStore, type CanvasElement } from '../../store/useBuilderStore';

/**
 * ModuleItem (catálogo, sección superior): tarjeta de un módulo
 * disponible. Two ways to add the module to the app:
 *
 *   1. Drag-from-palette (Phase 2.4b): the card itself is draggable
 *      via dnd-kit's useDraggable. The drag id is `module-${def.id}`
 *      so it matches the DragOverlay check in BuilderLayout and the
 *      data carries type:'module' + moduleId so handleDragEnd routes
 *      it to addModuleFromPalette when dropped on the canvas drop
 *      zone. The PointerSensor activation distance (5px) ensures
 *      casual clicks don't start a drag.
 *
 *   2. Button "+" (Phase 2.1c): the accessible / keyboard-friendly
 *      path. Click invokes `onStartAdd(def.id)` which the parent
 *      (LeftSidebar) bubbles up to BuilderLayout's addModuleFromPalette.
 *      Both paths now flow through the SAME helper (consolidated in
 *      2.4b — there used to be two duplicate implementations).
 *
 * The "+" button has `stopPropagation` on its onClick so it cannot
 * accidentally trigger the drag's pointer listeners attached to the
 * card div, and so its click doesn't bubble to ancestor listeners.
 */
const ModuleItem: React.FC<{ definition: any; onStartAdd: (moduleId: string) => void }> = ({ definition, onStartAdd }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `module-${definition.id}`,
    data: {
      type: 'module',
      moduleId: definition.id,
    },
  });

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    onStartAdd(definition.id);
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`group relative flex items-center space-x-3 p-3 mx-4 my-2 bg-white rounded-xl transition-all duration-200 select-none border cursor-grab active:cursor-grabbing ${
        isDragging ? 'opacity-30' : 'border-gray-200 shadow-sm hover:border-gray-300 hover:shadow-md'
      }`}
    >
      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-50 text-gray-500 group-hover:bg-primary/10 group-hover:text-primary transition-colors shrink-0">
        <span className="text-xl leading-none">{definition.icon}</span>
      </div>
      <div className="min-w-0 pr-2 flex-1">
        <h3 className="text-[13px] font-semibold text-gray-800 truncate mb-0.5">{definition.name}</h3>
        <p className="text-[11px] text-gray-500 leading-snug line-clamp-2">{definition.description}</p>
      </div>
      <button
        type="button"
        onClick={handleAdd}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute top-1/2 right-2 -translate-y-1/2 w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center opacity-0 group-hover:opacity-100 hover:scale-110 transition-all shadow-md cursor-pointer shrink-0"
        title={`Añadir ${definition.name}`}
        aria-label={`Añadir ${definition.name} a la app`}
      >
        <Plus size={16} strokeWidth={2.5} />
      </button>
    </div>
  );
};

/**
 * LayerRow (estructura, sección inferior): fila de un módulo ya
 * añadido al schema. Reconecta el SettingsPanel huérfano del
 * RightSidebar: click en una fila → selectElement(el.id) → el
 * RightSidebar deja el modo "Tema y Diseño" y muestra las
 * propiedades del módulo + el selector de tab.
 *
 * Acciones en hover (no en touch — el builder es desktop-first):
 *  - ↑ subir un puesto (deshabilitado si ya es el primero).
 *  - ↓ bajar un puesto (deshabilitado si ya es el último).
 *  - 🗑 eliminar el módulo del schema.
 *
 * `e.stopPropagation()` en cada botón de acción para que el click
 * NO burbujee al onClick del row (que llamaría selectElement).
 * Sin esto, mover un módulo lo dejaría seleccionado, conflicto con
 * la intención del usuario.
 *
 * `moveElement(activeId, overId)` toma el id del módulo a mover y
 * el id del módulo de destino (no índices). Para flecha ↑ pasamos
 * el id del vecino anterior; para ↓ el del siguiente. Idéntico al
 * patrón que usaba el dnd-kit antes del refactor del canvas.
 */
const LayerRow: React.FC<{ el: CanvasElement; index: number; total: number }> = ({ el, index, total }) => {
  const moduleDef = getModule(el.moduleId);
  const isSelected = useBuilderStore((s) => s.selectedElementId === el.id);
  const selectElement = useBuilderStore((s) => s.selectElement);
  const moveElement = useBuilderStore((s) => s.moveElement);
  const removeElement = useBuilderStore((s) => s.removeElement);
  const elements = useBuilderStore((s) => s.elements);

  if (!moduleDef) return null;

  const handleSelect = () => selectElement(el.id);

  const handleMoveUp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (index === 0) return;
    const prevId = elements[index - 1]?.id;
    if (prevId) moveElement(el.id, prevId);
  };

  const handleMoveDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (index === total - 1) return;
    const nextId = elements[index + 1]?.id;
    if (nextId) moveElement(el.id, nextId);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeElement(el.id);
  };

  const baseRow = 'group relative flex items-center gap-2 px-3 py-2 mx-3 my-1 rounded-lg cursor-pointer transition-colors';
  const selectedRow = 'bg-primary/10 ring-1 ring-primary';
  const idleRow = 'bg-white hover:bg-gray-50 border border-gray-200';

  return (
    <div
      onClick={handleSelect}
      className={`${baseRow} ${isSelected ? selectedRow : idleRow}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleSelect();
        }
      }}
    >
      <div className="w-7 h-7 rounded bg-gray-50 flex items-center justify-center text-gray-500 shrink-0">
        <span className="text-base leading-none">{moduleDef.icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-[12px] font-medium truncate ${isSelected ? 'text-primary' : 'text-gray-800'}`}>
          {moduleDef.name}
        </p>
      </div>
      {/* Acciones: visibles siempre cuando la fila está seleccionada (el
          módulo en el que el usuario está actuando — esconder sus flechas
          y papelera tras hover es fricción innecesaria); hover-only en
          las filas inactivas para no saturar visualmente la lista. */}
      <div className={`flex items-center gap-0.5 transition-opacity shrink-0 ${
        isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
      }`}>
        <button
          type="button"
          onClick={handleMoveUp}
          disabled={index === 0}
          title="Subir"
          aria-label={`Subir ${moduleDef.name}`}
          className="w-6 h-6 rounded flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        >
          <ChevronUp size={14} />
        </button>
        <button
          type="button"
          onClick={handleMoveDown}
          disabled={index === total - 1}
          title="Bajar"
          aria-label={`Bajar ${moduleDef.name}`}
          className="w-6 h-6 rounded flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        >
          <ChevronDown size={14} />
        </button>
        <button
          type="button"
          onClick={handleRemove}
          title="Eliminar"
          aria-label={`Eliminar ${moduleDef.name}`}
          className="w-6 h-6 rounded flex items-center justify-center text-gray-500 hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

interface LeftSidebarProps {
  /**
   * Phase 2.4b — callback to BuilderLayout's addModuleFromPalette
   * (the unified entry point for both drag-from-palette and the
   * "+" button). Receives the moduleId; the parent owns the
   * defaultConfig copy, the appId injection for modules that need
   * it, the tab label/icon resolution, and the pendingDrop /
   * DropTargetPopover flow. LeftSidebar no longer holds any of
   * that state — it's pure UI for catalog + structure.
   */
  onAddModule: (moduleId: string) => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({ onAddModule }) => {
  const modules = getRegistry();
  const elements = useBuilderStore((s) => s.elements);

  return (
    <aside className="w-[320px] bg-gray-50/50 border-r border-gray-200/80 flex flex-col h-full overflow-hidden shrink-0 z-10">
      {/* Sección 1: catálogo de módulos disponibles. */}
      <div className="px-6 py-4 border-b border-gray-200/60 bg-white/50 backdrop-blur-sm">
        <h2 className="font-bold text-[11px] uppercase tracking-widest text-gray-500">Módulos Disponibles</h2>
        <p className="text-[13px] text-gray-500 mt-1 font-medium">Arrastra al móvil o pulsa + para añadir</p>
      </div>

      {/* Catálogo: flex-[2] (2/3 del alto). La estructura abajo se queda
          con flex-1 (1/3). El catálogo es siempre 23 módulos fijos; la
          estructura de un app típico tiene 4-8 — proporción que evita
          desperdiciar media pantalla en estructura casi vacía y reduce
          el scrolling del catálogo. */}
      <div className="flex-[2] overflow-y-auto py-3 space-y-1 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; }`}</style>
        {modules.map((mod) => (
          <ModuleItem key={mod.id} definition={mod} onStartAdd={onAddModule} />
        ))}
        <div className="h-4" />
      </div>

      {/* Sección 2: estructura de la app — módulos ya añadidos.
          Click selecciona (abre SettingsPanel en RightSidebar);
          flechas reordenan; papelera elimina. */}
      <div className="px-6 py-4 border-t border-b border-gray-200/60 bg-white/50 backdrop-blur-sm">
        <h2 className="font-bold text-[11px] uppercase tracking-widest text-gray-500">Estructura</h2>
        <p className="text-[13px] text-gray-500 mt-1 font-medium">Toca un módulo para configurarlo</p>
      </div>

      <div className="flex-1 overflow-y-auto py-2 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {elements.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <p className="text-[12px] text-gray-400 leading-snug">
              Aún no has añadido módulos.<br />
              Arrastra uno al móvil o pulsa +.
            </p>
          </div>
        ) : (
          <>
            {elements.map((el, i) => (
              <LayerRow key={el.id} el={el} index={i} total={elements.length} />
            ))}
            <div className="h-4" />
          </>
        )}
      </div>

      {/* Phase 2.4b — DropTargetPopover render lives in BuilderLayout
          (consolidated entry point). LeftSidebar no longer renders
          it; the parent's portal places it above everything. */}
    </aside>
  );
};
