export class CreateMenuItemDto {
  name!: string;
  description?: string;
  price!: number;
  imageUrl?: string;
  allergens?: string[];
  available?: boolean;
}
