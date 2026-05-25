import { IsString, IsNotEmpty, IsOptional, IsEmail, IsInt, IsBoolean, Min, Max, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdatePlatformSmtpDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(253)
  host: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  @Type(() => Number)
  port: number;

  @IsBoolean()
  secure: boolean;

  @IsString()
  @IsNotEmpty()
  @MaxLength(253)
  username: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  password?: string;

  @IsEmail()
  @MaxLength(254)
  fromEmail: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  fromName: string;
}
