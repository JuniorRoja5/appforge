import { IsEmail, IsString } from 'class-validator';

export class LoginAppUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}
