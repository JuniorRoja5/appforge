import { PlanType } from '@prisma/client';

export class ChangePlanDto {
  tenantId!: string;
  planType!: PlanType;
}
