import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { getRegistry, getModule } from '../../modules/registry';
import { useBuilderStore, type CanvasElement } from '../../store/useBuilderStore';
import { computeTabs } from './utils/computeTabs';
import { DropTargetPopover } from './DropTargetPopover';

/**
 * Etiqueta en español para la sección de navegación cuando se crea
 * una nueva sección a partir de un módulo. Si el módulo no está en
 * el mapa, fallback al `name` de su ModuleDefinition. Recuperado del
 * BuilderLayout viejo (commit 3a2799b^) — verbatim, sin tocar el
 * mapeo para no alterar UX que el cliente ya conocía.
 */
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

/**
 * Icono Lucide para la sección de navegación cuando se crea una
 * nueva sección. Las keys deben existir en el ICON_MAP de
 * LucideIconByName — si no, el TabBar pinta el fallback genérico.
 * Recuperado verbatim del BuilderLayout viejo (commit 3a2799b^).
 */
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

interface PendingAdd {
  moduleId: string;
  moduleName: string;
  config: Record<string, any>;
  tabLabel: string;
  tabIcon: string;
}

/**
 * ModuleItem (catálogo, sección superior): tarjeta de un módulo
 * disponible. Click en el botón "+" levanta la intención al padre
 * (LeftSidebar) vía `onStartAdd(definition)`. El padre decide si
 * añade el módulo directo (app sin secciones todavía) o si abre el
 * DropTargetPopover preguntando en qué sección colocarlo (app con
 * secciones existentes). Lift-up necesario porque el popover es
 * `fixed inset-0` y debe vivir por encima del catálogo, no dentro
 * del row del módulo.
 *
 * `e.stopPropagation()` defensivo en el button — evita que clicks
 * burbujeen a listeners del aside / sidebar padre si en el futuro
 * se añaden.
 */
const ModuleItem: React.FC<{ definition: any; onStartAdd: (definition: any) => void }> = ({ definition, onStartAdd }) => {
  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    onStartAdd(definition);
  };

  return (
    <div className="group relative flex items-center space-x-3 p-3 mx-4 my-2 bg-white rounded-xl transition-all duration-200 border border-gray-200 shadow-sm hover:border-gray-300 hover:shadow-md">
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

export const LeftSidebar: React.FC = () => {
  const modules = getRegistry();
  const elements = useBuilderStore((s) => s.elements);
  const addElement = useBuilderStore((s) => s.addElement);

  const [pendingAdd, setPendingAdd] = useState<PendingAdd | null>(null);

  /**
   * Entrada del flujo de "+": decide si añadimos directo o si abrimos
   * el popover. Recuperado del BuilderLayout viejo (handleDragEnd
   * branch "Palette → Canvas"), traducido del drop event a un click.
   *
   * Si no hay secciones todavía → first-section-implicit: el módulo
   * entra con tabIndex:0 y crea la primera sección con su label/icon
   * por defecto, sin preguntar nada.
   * Si ya hay secciones → setPendingAdd → render del popover.
   */
  const handleStartAdd = (def: any) => {
    const tabLabel = MODULE_TAB_LABELS[def.id] ?? def.name;
    const tabIcon = MODULE_TAB_ICONS[def.id] ?? 'circle';
    const config = { ...def.defaultConfig };

    const existingTabs = computeTabs(elements);
    if (existingTabs.length === 0) {
      addElement(def.id, config, { tabIndex: 0, tabLabel, tabIcon });
    } else {
      setPendingAdd({ moduleId: def.id, moduleName: def.name, config, tabLabel, tabIcon });
    }
  };

  const handleSelectTab = (tabIndex: number) => {
    if (!pendingAdd) return;
    // tabLabel/tabIcon vacíos: el módulo aterriza en una sección que
    // ya existe — su label/icono no se sobreescriben. Mismo patrón
    // del handleDropSelectTab viejo (BuilderLayout 209-214).
    addElement(pendingAdd.moduleId, pendingAdd.config, { tabIndex, tabLabel: '', tabIcon: '' });
    setPendingAdd(null);
  };

  const handleCreateNew = () => {
    if (!pendingAdd) return;
    const usedIndexes = elements
      .map((el) => el.tabIndex)
      .filter((i): i is number => i != null);
    const nextTabIndex = usedIndexes.length > 0 ? Math.max(...usedIndexes) + 1 : 0;
    addElement(pendingAdd.moduleId, pendingAdd.config, {
      tabIndex: nextTabIndex,
      tabLabel: pendingAdd.tabLabel,
      tabIcon: pendingAdd.tabIcon,
    });
    setPendingAdd(null);
  };

  const handleCancel = () => setPendingAdd(null);

  return (
    <aside className="w-[320px] bg-gray-50/50 border-r border-gray-200/80 flex flex-col h-full overflow-hidden shrink-0 z-10">
      {/* Sección 1: catálogo de módulos disponibles. */}
      <div className="px-6 py-4 border-b border-gray-200/60 bg-white/50 backdrop-blur-sm">
        <h2 className="font-bold text-[11px] uppercase tracking-widest text-gray-500">Módulos Disponibles</h2>
        <p className="text-[13px] text-gray-500 mt-1 font-medium">Pulsa + para añadir un módulo a tu app</p>
      </div>

      {/* Catálogo: flex-[2] (2/3 del alto). La estructura abajo se queda
          con flex-1 (1/3). El catálogo es siempre 23 módulos fijos; la
          estructura de un app típico tiene 4-8 — proporción que evita
          desperdiciar media pantalla en estructura casi vacía y reduce
          el scrolling del catálogo. */}
      <div className="flex-[2] overflow-y-auto py-3 space-y-1 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; }`}</style>
        {modules.map((mod) => (
          <ModuleItem key={mod.id} definition={mod} onStartAdd={handleStartAdd} />
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
              Pulsa + en uno de la lista de arriba.
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

      {/* Popover modal de selección de sección al añadir un módulo
          cuando la app ya tiene secciones. Renderizado vía portal a
          <body> para desacoplar el `position: fixed` del contexto
          del aside — defensa contra futuros transform/filter/
          will-change/backdrop-filter en cualquier ancestro, que
          crearían un containing block nuevo y recortarían el modal
          al ancho del sidebar (320px). Hoy ningún ancestro tiene
          esas propiedades, pero el portal elimina la dependencia
          de layout para siempre. */}
      {pendingAdd && createPortal(
        <DropTargetPopover
          existingTabs={computeTabs(elements)}
          moduleName={pendingAdd.moduleName}
          onSelectTab={handleSelectTab}
          onCreateNew={handleCreateNew}
          onCancel={handleCancel}
        />,
        document.body,
      )}
    </aside>
  );
};
