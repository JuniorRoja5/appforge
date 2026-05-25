import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsPositive,
  IsUrl,
  IsIn,
  IsDateString,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCouponDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code!: string;

  @IsIn(['PERCENTAGE', 'FIXED_AMOUNT'])
  discountType!: 'PERCENTAGE' | 'FIXED_AMOUNT';

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  discountValue!: number;

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
}
