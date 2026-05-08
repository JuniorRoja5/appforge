import { IsEnum, IsUUID } from 'class-validator';
import { PlanType } from '@prisma/client';

export class ChangePlanDto {
  @IsUUID()
  tenantId!: string;

  @IsEnum(PlanType)
  planType!: PlanType;
}
