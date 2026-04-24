import { IsString, IsOptional } from 'class-validator';

export class RedeemCouponDto {
  @IsOptional()
  @IsString()
  appUserId?: string;

  @IsOptional()
  @IsString()
  deviceId?: string;
}
