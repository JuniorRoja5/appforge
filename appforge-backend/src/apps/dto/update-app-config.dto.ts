import { Matches, ValidateNested, IsOptional, IsString, IsNumber, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

// SECURITY: Strict regex to prevent template injection in Capacitor config.
// Must be a valid Java/Android package name: segments separated by dots,
// each starting with a letter, containing only alphanumerics and underscores.
const PACKAGE_NAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*){1,}$/;

class AndroidConfigDto {
  @Matches(PACKAGE_NAME_REGEX, {
    message: 'packageName debe ser un identificador Java válido (ej: com.miempresa.miapp)',
  })
  packageName: string;

  @IsString()
  versionName: string;

  @IsNumber()
  versionCode: number;
}

export class UpdateAppConfigDto {
  // NOTE: nested object shapes are intentionally validated as plain objects (@IsObject)
  // rather than nested DTOs — these fields are persisted as JSON in App.appConfig and
  // their inner shape evolves frequently. Server-side guarantees that matter live in
  // the service (e.g. extractCustomerFields, sanitizeHtmlContent — see TECH_DEBT #9).

  @IsOptional() @IsObject()
  icon?: { url: string };

  @IsOptional() @IsObject()
  splash?: {
    enabled: boolean;
    type: 'color' | 'image';
    backgroundColor?: string;
    backgroundImageUrl?: string;
    logoUrl?: string;
    duration: number;
  };

  @IsOptional() @IsObject()
  onboarding?: {
    enabled: boolean;
    slides: Array<{
      id: string;
      title: string;
      description: string;
      imageUrl: string;
      order: number;
    }>;
  };

  @IsOptional() @IsObject()
  terms?: { content: string };

  @IsOptional() @IsObject()
  iosPermissions?: Record<string, string>;

  @IsOptional()
  @ValidateNested()
  @Type(() => AndroidConfigDto)
  androidConfig?: AndroidConfigDto;

  @IsOptional() @IsObject()
  androidPermissions?: Record<string, boolean>;
}

export class UpdateSmtpConfigDto {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
}
