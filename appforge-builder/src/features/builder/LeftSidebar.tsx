import React from 'react';
import { Plus } from 'lucide-react';
import { getRegistry } from '../../modules/registry';
import { useBuilderStore } from '../../store/useBuilderStore';

/**
 * ModuleItem: tarjeta del catálogo de módulos. Click en el botón "+"
 * añade el módulo al schema con su defaultConfig. El drag-and-drop
 * tradicional sobre el canvas se retiró cuando el canvas pasó a ser
 * un iframe cross-origin (el browser bloquea drag-drop cross-origin
 * por seguridad — out of scope reintroducirlo via overlay editorial,
 * TECH_DEBT futuro).
 *
 * `e.stopPropagation()` defensivo en el button — evita que clicks
 * burbujeen a listeners del aside / sidebar padre si en el futuro
 * se añaden.
 */
const ModuleItem: React.FC<{ definition: any }> = ({ definition }) => {
  const addElement = useBuilderStore((s) => s.addElement);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    addElement(definition.id, definition.defaultConfig);
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

export const LeftSidebar: React.FC = () => {
  const modules = getRegistry();

  return (
    <aside className="w-[320px] bg-gray-50/50 border-r border-gray-200/80 flex flex-col h-full overflow-hidden shrink-0 z-10">
      <div className="px-6 py-4 border-b border-gray-200/60 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
        <h2 className="font-bold text-[11px] uppercase tracking-widest text-gray-500">Módulos Disponibles</h2>
        <p className="text-[13px] text-gray-500 mt-1 font-medium">Pulsa + para añadir un módulo a tu app</p>
      </div>

      <div className="flex-1 overflow-y-auto py-3 space-y-1 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; }`}</style>
        {modules.map((mod) => (
          <ModuleItem key={mod.id} definition={mod} />
        ))}
        <div className="h-6" />
      </div>
    </aside>
  );
};
