export class UpdateProductDto {
  name?: string;
  description?: string;
  price?: number;
  comparePrice?: number;
  imageUrls?: string[];
  inStock?: boolean;
  tags?: string[];
}
