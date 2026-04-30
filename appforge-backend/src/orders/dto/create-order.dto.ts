import { IsString, IsOptional, IsEmail, IsArray, ValidateNested, IsInt, Min, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

class OrderItemDto {
  @IsString()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @IsString()
  customerName: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  customerNotes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  // appUserId NO debe venir del cliente — el controller lo sobreescribe con el del JWT.
  // Se acepta como opcional para que el TypeScript del controller no se queje.
  @IsOptional()
  @IsUUID()
  appUserId?: string;
}
