import { IsString, IsObject, IsOptional, IsUUID, Matches } from 'class-validator';

export class CreateBookingDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be in YYYY-MM-DD format' })
  date!: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'timeSlot must be in HH:MM format' })
  timeSlot!: string;

  @IsObject()
  formData!: Record<string, unknown>;

  // appUserId NEVER comes from the client body — it is overridden by the
  // controller from the validated JWT. Kept optional here just for typing.
  @IsOptional()
  @IsUUID()
  appUserId?: string;
}
