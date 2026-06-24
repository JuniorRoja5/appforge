import { IsEmail } from 'class-validator';

export class RequestDeleteAccountDto {
  @IsEmail()
  email!: string;
}
