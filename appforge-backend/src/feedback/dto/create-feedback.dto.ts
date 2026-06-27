import { IsEmail, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO de feedback de plataforma (no es soporte — el cliente expresa
 * satisfacción o crítica general, no reporta un problema concreto).
 *
 * Rating es REQUERIDO (1-5). Es el dato anclaje del feedback: una
 * estrella sin texto es suficiente para que el equipo entienda el
 * sentimiento. El message es opcional precisamente para reducir la
 * fricción de envío — investigación UX consultada con el operador:
 * cuanto menos pedimos, más probable que el usuario lo envíe.
 *
 * Identidad (name, email, company) sigue el mismo patrón que el ticket
 * de soporte: pre-rellenado desde useAuthStore en el frontend, pero
 * modificable por si el cliente quiere que respondamos a otra cuenta.
 */
export class CreateFeedbackDto {
  // @Type(() => Number) — sin esto, ValidationPipe con transform:true
  // no convierte el string del JSON body si el frontend envía
  // accidentalmente "5" en vez de 5, y @IsInt() rechazaría. Defensivo.
  @Type(() => Number)
  @IsInt({ message: 'La valoración debe ser un número entero.' })
  @Min(1, { message: 'La valoración mínima es 1 estrella.' })
  @Max(5, { message: 'La valoración máxima es 5 estrellas.' })
  rating!: number;

  // Opcional con tope alto pero razonable. 2000 chars cubre un párrafo
  // largo o un párrafo + ejemplo concreto, sin permitir abuso.
  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'El comentario no puede superar 2000 caracteres.' })
  message?: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre no puede estar vacío.' })
  @MaxLength(100, { message: 'El nombre no puede superar 100 caracteres.' })
  name!: string;

  @IsEmail({}, { message: 'Email no válido.' })
  @MaxLength(320, { message: 'El email no puede superar 320 caracteres.' })
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'El nombre de empresa no puede superar 200 caracteres.' })
  company?: string;
}
