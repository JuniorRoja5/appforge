import { IsString, IsNotEmpty } from 'class-validator';

export class UpdatePlatformFcmDto {
  @IsString()
  @IsNotEmpty()
  serviceAccountJson!: string;

  @IsString()
  @IsNotEmpty()
  googleServicesJson!: string;
}
