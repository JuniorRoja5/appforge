import {
  IsString,
  IsOptional,
  IsNumber,
  IsPositive,
  IsUrl,
  IsBoolean,
  IsArray,
  ArrayMaxSize,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateMenuItemDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  price?: number;

  @IsOptional()
  @IsUrl()
  @MaxLength(512)
  imageUrl?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  allergens?: string[];

  @IsOptional()
  @IsBoolean()
  available?: boolean;
}
