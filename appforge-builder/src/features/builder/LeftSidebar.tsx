import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { getRegistry } from '../../modules/registry';

const DraggableModule: React.FC<{ definition: any }> = ({ definition }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `module-${definition.id}`,
    data: {
      type: 'module',
      moduleId: definition.id,
    },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`group flex items-center space-x-3 p-3 mx-4 my-2 bg-white rounded-xl cursor-grab transition-all duration-200 select-none border ${
        isDragging ? 'opacity-50 ring-2 ring-indigo-500 shadow-lg scale-95 border-indigo-500' : 'border-gray-200 shadow-sm hover:border-gray-300 hover:shadow-md'
      }`}
    >
      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-50 text-gray-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors shrink-0">
        <span className="text-xl leading-none">{definition.icon}</span>
      </div>
      <div className="min-w-0 pr-2">
        <h3 className="text-[13px] font-semibold text-gray-800 truncate mb-0.5">{definition.name}</h3>
        <p className="text-[11px] text-gray-500 leading-snug line-clamp-2">{definition.description}</p>
      </div>
    </div>
  );
};

export const LeftSidebar: React.FC = () => {
  const modules = getRegistry();

  return (
    <aside className="w-[320px] bg-gray-50/50 border-r border-gray-200/80 flex flex-col h-full overflow-hidden shrink-0 z-10">
      <div className="px-6 py-4 border-b border-gray-200/60 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
        <h2 className="font-bold text-[11px] uppercase tracking-widest text-gray-500">Módulos Disponibles</h2>
        <p className="text-[13px] text-gray-500 mt-1 font-medium">Arrastra componentes al simulador</p>
      </div>
      
      <div className="flex-1 overflow-y-auto py-3 space-y-1 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; }`}</style>
        {modules.map((mod) => (
          <DraggableModule key={mod.id} definition={mod} />
        ))}
        {/* Spacer at bottom */}
        <div className="h-6" />
      </div>
    </aside>
  );
};
