import {
  Matches, ValidateNested, IsOptional, IsString, IsNumber, IsObject,
  IsNotEmpty, IsInt, Min, Max, IsBoolean, IsEmail, IsUrl, MaxLength,
} from 'class-validator';
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

// Sub-DTO para documentos legales (terms + privacy). Shape simétrico:
// el cliente puede pegar una URL externa o editar contenido inline.
//
// IMPORTANTE: esta clase se usa anidada via @ValidateNested + @Type.
// NO importar como `import type` desde ningún consumidor — la clase
// debe sobrevivir al stripping de TypeScript en runtime para que
// class-transformer pueda instanciarla. `import type` la borraría
// y el ValidationPipe (whitelist: true) eliminaría el sub-objeto entero
// en silencio (el footgun cazado en G1 backend).
//
// content: hasta 50KB (HTML enriquecido típico de un doc legal va a
// ~5-15KB; 50KB es tope generoso que evita abuso sin estorbar).
// url: require_protocol: true falla rápido si el cliente pega
// "miempresa.com/x" sin esquema — mejor 400 en el editor que rechazo
// de Play Console.
class LegalDocDto {
  @IsOptional()
  @IsString()
  @MaxLength(50000)
  content?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  url?: string;
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

  // terms y privacy: NESTED DTO con @ValidateNested + @Type, divergiendo
  // del @IsObject del resto del fichero. Razón: estos dos campos tienen
  // shape simétrico { content?, url? } con validación distinta por
  // sub-campo (content como string limitado, url como IsUrl con
  // require_protocol). @IsObject los aceptaría como cajas opacas y un
  // cliente podría inyectar URLs mal-formadas que Play Console rechazaría
  // después. El nested catch el error antes.
  @IsOptional()
  @ValidateNested()
  @Type(() => LegalDocDto)
  terms?: LegalDocDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LegalDocDto)
  privacy?: LegalDocDto;

  @IsOptional() @IsObject()
  iosPermissions?: Record<string, string>;

  // Texto que se inyecta en <meta name="description"> + og:description + el
  // manifest.webmanifest del PWA deployed. Límite 200: margen sobre los ~160
  // de meta description ideal sin permitir abuso. Sin el decorador, el
  // ValidationPipe global con whitelist:true lo elimina silenciosamente
  // (TECH_DEBT #47).
  @IsOptional() @IsString() @MaxLength(200)
  description?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AndroidConfigDto)
  androidConfig?: AndroidConfigDto;

  @IsOptional() @IsObject()
  androidPermissions?: Record<string, boolean>;
}

export class UpdateSmtpConfigDto {
  @IsString() @IsNotEmpty() @MaxLength(255)
  host: string;

  @IsInt() @Min(1) @Max(65535)
  port: number;

  @IsBoolean()
  secure: boolean;

  @IsString() @MaxLength(255)
  username: string;

  // Optional + nullable: empty value means "preserve existing encrypted password"
  // (apps.service.updateSmtp:162-174 reads from DB when !dto.password). @IsNotEmpty
  // would 400 the legitimate UI flow where the placeholder reads "Ya hay una
  // contraseña guardada. Deja vacío para mantenerla." in SmtpTab.tsx.
  @IsOptional() @IsString() @MaxLength(255)
  password?: string;

  @IsEmail() @MaxLength(320)
  fromEmail: string;

  @IsString() @MaxLength(255)
  fromName: string;
}
