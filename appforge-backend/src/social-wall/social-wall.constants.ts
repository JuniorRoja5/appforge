/**
 * Lista canónica de tipos de contenido reportable en el sistema.
 *
 * Consumida por:
 *   - dto/report-content.dto.ts → validación @IsIn al crear un report.
 *   - social-wall.service.ts → validación en reportContent (defense in depth)
 *     y en el filtro targetTypes del endpoint getReports (admin).
 *   - cualquier futuro consumidor que necesite saber qué se puede reportar.
 *
 * NO modificar valores existentes sin migración de datos — están persistidos
 * como string en ContentReport.targetType. Añadir nuevos al final del array.
 */
export const REPORTABLE_TARGET_TYPES = [
  'social_post',
  'social_comment',
  'fan_post',
] as const;

export type ReportableTargetType = (typeof REPORTABLE_TARGET_TYPES)[number];
