import { IsString, IsNotEmpty, IsOptional, IsObject, MaxLength } from 'class-validator';

export class SendPushDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  body!: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  imageUrl?: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, string>;
}
