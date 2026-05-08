import {
  IsBoolean, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min,
} from 'class-validator';

export class UpdatePlanDto {
  @IsOptional() @IsString() @MaxLength(60)
  name?: string;

  @IsOptional() @IsInt() @Min(0)
  maxApps?: number;

  @IsOptional() @IsInt() @Min(0)
  maxBuildsPerMonth?: number;

  // Decimal — seed uses 0.2, 0.6, 2.0, etc. so @IsInt would 400 valid input.
  @IsOptional() @IsNumber() @Min(0)
  storageGb?: number;

  // Decimal too — supports cents (e.g. $9.99) without forcing whole-dollar pricing.
  @IsOptional() @IsNumber() @Min(0)
  priceMonthly?: number;

  @IsOptional() @IsBoolean()
  canBuild?: boolean;

  @IsOptional() @IsBoolean()
  isWhiteLabel?: boolean;
}
