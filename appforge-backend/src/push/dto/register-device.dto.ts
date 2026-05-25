import { IsString, IsNotEmpty, IsOptional, IsIn, MaxLength } from 'class-validator';

export class RegisterDeviceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  token!: string;

  @IsOptional()
  @IsIn(['android', 'ios'])
  platform?: string; // 'android' | 'ios'
}
