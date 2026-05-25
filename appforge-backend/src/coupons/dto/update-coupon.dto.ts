import {
  IsString,
  IsOptional,
  IsNumber,
  IsPositive,
  IsUrl,
  IsIn,
  IsDateString,
  IsInt,
  IsBoolean,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCouponDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsOptional()
  @IsIn(['PERCENTAGE', 'FIXED_AMOUNT'])
  discountType?: 'PERCENTAGE' | 'FIXED_AMOUNT';

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  discountValue?: number;

  @IsOptional()
  @IsUrl()
  @MaxLength(512)
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  conditions?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  maxUses?: number;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
