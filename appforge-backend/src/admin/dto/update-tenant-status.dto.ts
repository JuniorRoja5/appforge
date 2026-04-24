import { TenantStatus } from '@prisma/client';

export class UpdateTenantStatusDto {
  status!: TenantStatus;
}
