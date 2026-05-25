import { IsString, IsNotEmpty, IsOptional, IsUrl, MaxLength } from 'class-validator';

export class CreateSocialPostDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content!: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(512)
  imageUrl?: string;
}
