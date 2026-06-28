import { IsEmail, IsString, Matches, MaxLength } from 'class-validator';
import { PASSWORD_MAX_LENGTH, PASSWORD_MESSAGE, PASSWORD_PATTERN } from './password-rules';

export class ResetPasswordDto {
  @IsEmail()
  email: string;

  @IsString()
  token: string;

  // Política unificada con register + change (ver password-rules.ts).
  // Pre-fix tenía SOLO @MinLength(6) — el más laxo de los 3 endpoints.
  // Era el agujero crítico: un usuario podía registrarse con contraseña
  // fuerte y luego resetear a "123456" via este flujo. Cerrado.
  @IsString()
  @MaxLength(PASSWORD_MAX_LENGTH, {
    message: `La contraseña no puede superar ${PASSWORD_MAX_LENGTH} caracteres.`,
  })
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_MESSAGE })
  newPassword: string;
}
