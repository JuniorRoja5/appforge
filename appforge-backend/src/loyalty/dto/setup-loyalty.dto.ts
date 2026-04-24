import { IsString, IsInt, IsOptional, MinLength, Min, Max } from 'class-validator';

export class SetupLoyaltyDto {
  @IsInt()
  @Min(4)
  @Max(20)
  totalStamps: number;

  @IsString()
  reward: string;

  @IsOptional()
  @IsString()
  rewardDescription?: string;

  @IsString()
  @MinLength(6, { message: 'El PIN debe tener al menos 6 caracteres' })
  pin: string;
}
