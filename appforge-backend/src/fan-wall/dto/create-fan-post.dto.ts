import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateFanPostDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  imageUrl!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  caption?: string;
}
