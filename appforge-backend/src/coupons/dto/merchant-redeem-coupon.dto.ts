import { IsString, IsOptional, IsEmail, MinLength } from 'class-validator';

export class MerchantRedeemCouponDto {
  @IsString()
  @MinLength(1, { message: 'El código del cupón es obligatorio' })
  code: string;

  @IsString()
  @MinLength(6, { message: 'PIN inválido' })
  pin: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email del cliente inválido' })
  appUserEmail?: string;
}
