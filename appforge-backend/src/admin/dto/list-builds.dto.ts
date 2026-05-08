import { IsDateString, IsEnum, IsInt, IsOptional, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { BuildStatus } from '@prisma/client';

export class ListBuildsDto {
  @IsOptional() @IsEnum(BuildStatus)
  status?: BuildStatus;

  @IsOptional() @IsUUID()
  tenantId?: string;

  @IsOptional() @IsUUID()
  appId?: string;

  @IsOptional() @IsDateString()
  from?: string;

  @IsOptional() @IsDateString()
  to?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  limit?: number;
}
