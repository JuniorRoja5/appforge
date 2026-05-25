import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ArrayMaxSize,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class SubmitContactDto {
  @IsNotEmpty()
  data!: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsUrl({}, { each: true })
  fileUrls?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  captchaToken?: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  honeypot?: string;
}
