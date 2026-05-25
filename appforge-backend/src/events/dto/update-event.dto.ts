import {
  IsString,
  IsOptional,
  IsUrl,
  IsDateString,
  MaxLength,
} from 'class-validator';

export class UpdateEventDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(512)
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  location?: string;

  @IsOptional()
  @IsDateString()
  eventDate?: string;

  @IsOptional()
  @IsDateString()
  eventEndDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  price?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(512)
  ticketUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  ticketLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  organizer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  contactInfo?: string;
}
