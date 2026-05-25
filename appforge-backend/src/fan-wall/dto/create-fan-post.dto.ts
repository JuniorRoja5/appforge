import { IsString, IsNotEmpty, IsOptional, IsUrl, MaxLength } from 'class-validator';

export class CreateFanPostDto {
  @IsUrl()
  @IsNotEmpty()
  @MaxLength(512)
  imageUrl!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  caption?: string;
}
