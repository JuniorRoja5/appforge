import React, { useEffect, useRef } from 'react';
import { LucideIconByName } from './LucideIconByName';
import { Plus } from 'lucide-react';
import type { TabInfo } from './utils/computeTabs';

interface DropTargetPopoverProps {
  existingTabs: TabInfo[];
  moduleName: string;
  onSelectTab: (tabIndex: number) => void;
  onCreateNew: () => void;
  onCancel: () => void;
}

export const DropTargetPopover: React.FC<DropTargetPopoverProps> = ({
  existingTabs,
  moduleName,
  onSelectTab,
  onCreateNew,
  onCancel,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onCancel();
      }
    };
    // Delay to avoid immediate dismissal from the drop event itself
    const timer = setTimeout(() => document.addEventListener('mousedown', handler), 100);
    return () => { clearTimeout(timer); document.removeEventListener('mousedown', handler); };
  }, [onCancel]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/10 backdrop-blur-[1px]">
      <div
        ref={ref}
        className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-[300px] overflow-hidden animate-in fade-in zoom-in-95"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/80">
          <p className="text-[13px] font-bold text-gray-800">¿Dónde colocar "{moduleName}"?</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Elige una sección existente o crea una nueva</p>
        </div>

        {/* Existing tabs */}
        <div className="max-h-[240px] overflow-y-auto">
          {existingTabs.map((tab) => (
            <button
              key={tab.index}
              onClick={() => onSelectTab(tab.index)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 transition-colors text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
                <LucideIconByName name={tab.icon} size={16} className="text-gray-500 group-hover:text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[13px] font-medium text-gray-700 group-hover:text-blue-700 truncate block">
                  Añadir a "{tab.label}"
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Divider + Create new */}
        <div className="border-t border-gray-100">
          <button
            onClick={onCreateNew}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-emerald-50 transition-colors text-left group"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center transition-colors">
              <Plus size={16} className="text-emerald-600" />
            </div>
            <span className="text-[13px] font-semibold text-emerald-700">
              Crear nueva sección
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
