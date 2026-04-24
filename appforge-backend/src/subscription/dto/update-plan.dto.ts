export class UpdatePlanDto {
  name?: string;
  maxApps?: number;
  maxBuildsPerMonth?: number;
  storageGb?: number;
  priceMonthly?: number;
  canBuild?: boolean;
  isWhiteLabel?: boolean;
}
