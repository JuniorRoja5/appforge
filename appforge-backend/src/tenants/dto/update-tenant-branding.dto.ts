import { Type } from 'class-transformer';
import {
  IsHexColor,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

class BrandColorsDto {
  @IsOptional()
  @IsHexColor()
  primary?: string;
}

export class UpdateTenantBrandingDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  brandName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  brandLogoUrl?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => BrandColorsDto)
  brandColors?: BrandColorsDto;
}
