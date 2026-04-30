import { IsString, MinLength, MaxLength } from 'class-validator';

export class SetupCouponMerchantConfigDto {
  @IsString()
  @MinLength(6, { message: 'El PIN debe tener al menos 6 caracteres' })
  @MaxLength(20, { message: 'El PIN no puede exceder 20 caracteres' })
  pin: string;
}
