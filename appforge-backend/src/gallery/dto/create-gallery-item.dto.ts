import { IsString, IsNotEmpty, IsOptional, IsUrl, IsInt, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateGalleryItemDto {
  @IsUrl()
  @IsNotEmpty()
  @MaxLength(512)
  imageUrl!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  order?: number;
}
