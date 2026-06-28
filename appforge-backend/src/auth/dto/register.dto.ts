import { IsEmail, IsString, Matches, MaxLength } from 'class-validator';
import { PASSWORD_MAX_LENGTH, PASSWORD_MESSAGE, PASSWORD_PATTERN } from './password-rules';

/**
 * DTO de registro de usuario nuevo. Reemplaza el uso directo de
 * `Prisma.UserCreateInput` que estaba en el controller (línea 26
 * pre-fix), el cual bypassaba completamente el ValidationPipe global
 * porque Prisma no expone metadatos de class-validator.
 *
 * Política de contraseña: importada de `password-rules.ts` (single
 * source of truth, compartida con change-password y reset-password
 * para evitar drift).
 *
 * El backend NO valida si el dominio del email existe — solo el formato
 * estricto via `@IsEmail`. Verificación real por magic-link queda como
 * TECH_DEBT futuro.
 */
export class RegisterDto {
  @IsEmail({}, { message: 'Introduce un email válido.' })
  @MaxLength(320, { message: 'El email no puede superar 320 caracteres.' })
  email!: string;

  @IsString()
  @MaxLength(PASSWORD_MAX_LENGTH, {
    message: `La contraseña no puede superar ${PASSWORD_MAX_LENGTH} caracteres.`,
  })
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_MESSAGE })
  password!: string;
}
