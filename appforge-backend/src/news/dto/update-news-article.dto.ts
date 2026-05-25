import { IsString, IsOptional, IsUrl, IsDateString, MaxLength } from 'class-validator';

export class UpdateNewsArticleDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(512)
  imageUrl?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(512)
  videoUrl?: string;

  @IsOptional()
  @IsDateString()
  publishedAt?: string; // ISO 8601
}
