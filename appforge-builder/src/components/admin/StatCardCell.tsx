import type { FC, ReactNode } from 'react';

/**
 * Tarjeta de stat reutilizable para las páginas de moderación/admin.
 *
 * Patrón visual:
 *   - icono pequeño + label + valor numérico, en una caja gris neutra.
 *   - cuando `highlight` está activo (e.g. count de reportes pendientes > 0),
 *     la caja se tinta de rojo claro para llamar la atención sin gritar.
 *
 * Extraído de SocialWallModerationPage / FanWallModerationPage en Fase 1.4b.
 * Tener dos copias del mismo helper divergía en cuanto alguien tocara el
 * padding de una y no la otra — mismo aprendizaje que la lista canónica de
 * REPORTABLE_TARGET_TYPES (Fase 1.3a). Una sola fuente.
 *
 * Heredarán este componente las páginas de moderación/admin de Fase 2
 * (Loyalty, Coupons) que también muestran stats en tarjetas.
 */
export const StatCardCell: FC<{
  icon: ReactNode;
  label: string;
  value: number | string;
  highlight?: boolean;
}> = ({ icon, label, value, highlight }) => (
  <div
    className={`rounded-lg p-3 flex items-center gap-2 ${
      highlight ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
    }`}
  >
    <span className={highlight ? 'text-red-500' : 'text-gray-400'}>{icon}</span>
    <div>
      <p className={`text-xs ${highlight ? 'text-red-600' : 'text-gray-500'}`}>
        {label}
      </p>
      <p
        className={`text-base font-bold ${
          highlight ? 'text-red-700' : 'text-gray-800'
        }`}
      >
        {value}
      </p>
    </div>
  </div>
);
