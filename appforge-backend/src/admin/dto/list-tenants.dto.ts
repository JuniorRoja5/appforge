import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PlanType, TenantStatus } from '@prisma/client';

export class ListTenantsDto {
  @IsOptional() @IsString() @MaxLength(120)
  search?: string;

  @IsOptional() @IsEnum(PlanType)
  planType?: PlanType;

  @IsOptional() @IsEnum(TenantStatus)
  status?: TenantStatus;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  limit?: number;
}