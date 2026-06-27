import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Escenarios típicos por los que un cliente abre un ticket de soporte.
 *
 * IMPORTANTE: estos strings son la ÚNICA fuente de verdad del backend.
 * El frontend (`appforge-builder/src/pages/SupportPage.tsx`) DUPLICA esta
 * lista con un comentario cruzado para evitar drift. Si la lista cambia
 * aquí, hay que replicarla allí — el desplegable del builder y el regex
 * del @IsIn de abajo deben coincidir o el formulario devuelve 400 al
 * enviar (silenciosamente roto desde la perspectiva del cliente).
 *
 * Decisión "duplicar vs. compartir vía copy-shared.mjs" tomada con el
 * operador en el plan: para 7 strings, dos fuentes bien documentadas
 * son más simples que mover esto a `appforge-shared/`. Si en el futuro
 * la lista crece o se modifica con frecuencia, automatizar.
 */
export const SUPPORT_SCENARIOS = [
  'Problema al generar mi app (build falla, AAB rechazado)',
  'Mi app no funciona como esperaba (módulo, runtime)',
  'Pregunta sobre cómo usar la plataforma',
  'Problema con mi cuenta o facturación',
  'Sugerencia o mejora',
  'Problema legal (privacidad, términos, Play Store)',
  'Otro',
] as const;

export type SupportScenario = (typeof SUPPORT_SCENARIOS)[number];

export class CreateSupportTicketDto {
  @IsString()
  @IsIn(SUPPORT_SCENARIOS as unknown as string[], {
    message: 'Escenario no válido. Selecciona uno de los disponibles.',
  })
  scenario!: SupportScenario;

  @IsString()
  @IsNotEmpty({ message: 'El asunto no puede estar vacío.' })
  @MaxLength(200, { message: 'El asunto no puede superar 200 caracteres.' })
  subject!: string;

  @IsString()
  @IsNotEmpty({ message: 'El mensaje no puede estar vacío.' })
  @MaxLength(5000, { message: 'El mensaje no puede superar 5000 caracteres.' })
  message!: string;

  // Nombre y email vienen pre-rellenados desde useAuthStore pero son
  // modificables en el formulario. Validamos por si el usuario los edita
  // a algo inválido (email mal-formado, nombre vacío).
  @IsString()
  @IsNotEmpty({ message: 'El nombre no puede estar vacío.' })
  @MaxLength(100, { message: 'El nombre no puede superar 100 caracteres.' })
  name!: string;

  @IsEmail({}, { message: 'Email no válido.' })
  @MaxLength(320, { message: 'El email no puede superar 320 caracteres.' })
  email!: string;

  // Empresa es opcional — algunos clientes son personas físicas sin company
  // configurada en useAuthStore.
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'El nombre de empresa no puede superar 200 caracteres.' })
  company?: string;
}
