import { IsString, IsOptional, IsUrl, MaxLength } from 'class-validator';

export class UpdateMenuCategoryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(512)
  imageUrl?: string;
}
