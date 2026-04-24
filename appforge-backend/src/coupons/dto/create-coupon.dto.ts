export class CreateCouponDto {
  title!: string;
  description?: string;
  code!: string;
  discountType!: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue!: number;
  imageUrl?: string;
  conditions?: string;
  maxUses?: number;
  validFrom?: string;
  validUntil?: string;
}
