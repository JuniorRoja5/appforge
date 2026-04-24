import { IsString, IsEmail, MinLength } from 'class-validator';

export class RedeemPasswordResetDto {
  @IsEmail()
  email: string;

  @IsString()
  token: string;

  @IsString()
  @MinLength(6)
  newPassword: string;
}
