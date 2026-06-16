import { useId } from 'react';
import type { FC, ReactNode } from 'react';
import { X } from 'lucide-react';

interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  onSave: () => void | Promise<void>;
  saving?: boolean;
  saveLabel?: string;
  cancelLabel?: string;
  disableSave?: boolean;
}

/**
 * Modal genérico para forms admin del builder. Molde estructural tomado
 * de AppConfigModal, desacoplado de useAppConfigStore y de su concepto
 * dirty/save propio.
 *
 * Vías de cierre en v1 (deliberadas, sin red de seguridad):
 *   - Botón X del header
 *   - Botón Cancelar del footer
 *   - El caller invocando onClose() tras onSave() con éxito
 *
 * NO cierra en v1 con click-fuera ni con Escape. Razón: sin dirty-warning
 * sería pérdida silenciosa de un form sin guardar. Ambas vías se
 * reactivan junto al dirty-warning como iteración futura.
 *
 * onSave no se await ni cierra el modal automáticamente: el caller
 * decide cuándo cerrar (permite mantenerlo abierto si hay error de
 * validación o fallo de servidor) y maneja su propio flag saving.
 */
export const FormModal: FC<FormModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  onSave,
  saving,
  saveLabel,
  cancelLabel,
  disableSave,
}) => {
  const titleId = useId();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop sin handler en v1 — ver nota del componente sobre cierre. */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 bg-white rounded-2xl shadow-2xl w-[600px] max-w-[95vw] max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 id={titleId} className="font-semibold text-[15px] text-gray-900">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-end gap-2 bg-gray-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-[13px] text-gray-600 hover:text-gray-900 transition-colors"
          >
            {cancelLabel ?? 'Cancelar'}
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || disableSave}
            className="px-4 py-1.5 bg-primary hover:opacity-90 disabled:bg-gray-300 text-white text-[13px] font-medium rounded-lg transition-colors"
          >
            {saving ? 'Guardando...' : (saveLabel ?? 'Guardar')}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────
// Reservado para iteraciones futuras (no en la firma para no mentir
// sobre lo que v1 soporta):
//
// - dirty?: boolean + onDiscard?: () => void
//     Bar de aviso "tienes cambios sin guardar" cuando se intenta
//     cerrar con datos no persistidos. Patrón análogo al dirty-warning
//     de AppConfigModal. Necesario antes de reactivar Escape y
//     click-fuera como vías de cierre.
//
// - Escape como vía de cierre
//     Entra junto al dirty-warning.
//
// - Click-fuera (backdrop con onClick={handleClose})
//     Entra junto al dirty-warning.
//
// - footerContent?: ReactNode
//     Si algún consumidor pide inyectar contenido extra en el footer.
//     Hoy ningún consumidor lo necesita — el botón "Generar código" de
//     Coupons vive inline con el input "Código", no en el footer.
//
// - size?: 'sm' | 'md' | 'lg'
//     Si Catalog products o Loyalty piden ancho distinto. Hoy hardcoded
//     w-[600px] max-w-[95vw] (md).
// ─────────────────────────────────────────────────────────────────────
