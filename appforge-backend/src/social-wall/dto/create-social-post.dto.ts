import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateSocialPostDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content!: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  imageUrl?: string;
}
