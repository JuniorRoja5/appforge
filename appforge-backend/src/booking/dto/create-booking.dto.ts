export class CreateBookingDto {
  date!: string; // 'YYYY-MM-DD'
  timeSlot!: string; // 'HH:MM'
  formData!: Record<string, unknown>;
}
