export class SubmitContactDto {
  data!: Record<string, unknown>;
  fileUrls?: string[];
  captchaToken!: string;
  honeypot?: string;
}
