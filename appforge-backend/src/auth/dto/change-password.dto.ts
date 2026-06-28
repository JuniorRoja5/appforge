import { IsString, Matches, MaxLength } from 'class-validator';
import { PASSWORD_MAX_LENGTH, PASSWORD_MESSAGE, PASSWORD_PATTERN } from './password-rules';

export class ChangePasswordDto {
  @IsString()
  currentPassword!: string;

  // Política unificada con register + reset (ver password-rules.ts).
  // Pre-fix tenía solo @MinLength(8) + @MaxLength(128) sin regla de
  // composición — drift que permitía contraseñas como "abcdefgh" tras
  // un cambio. Cerrado al alinear con el regex compartido.
  @IsString()
  @MaxLength(PASSWORD_MAX_LENGTH, {
    message: `La contraseña no puede superar ${PASSWORD_MAX_LENGTH} caracteres.`,
  })
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_MESSAGE })
  newPassword!: string;
}
