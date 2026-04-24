import { IsString, MinLength } from 'class-validator';

export class StampDto {
  @IsString()
  appUserEmail: string;

  @IsString()
  @MinLength(6)
  pin: string;
}
