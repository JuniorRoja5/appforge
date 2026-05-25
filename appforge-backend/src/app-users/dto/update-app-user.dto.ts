import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class UpdateAppUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  lastName?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(512)
  avatarUrl?: string;
}
