import { IsOptional, IsInt, Min, Max, IsString, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Query params para GET /stripe/invoices. Decoradores obligatorios:
 * con `whitelist: true` del ValidationPipe global, params sin decorar
 * se eliminarían silenciosamente y el filtro llegaría vacío al service
 * (mismo patrón de bug de TECH_DEBT #47).
 */
export class ListInvoicesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  startingAfter?: string;

  @IsOptional()
  @IsDateString()
  createdAfter?: string;   // ISO 8601 (YYYY-MM-DD o full ISO)

  @IsOptional()
  @IsDateString()
  createdBefore?: string;
}
