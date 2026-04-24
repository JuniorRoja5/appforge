export class SendPushDto {
  title!: string;
  body!: string;
  imageUrl?: string;
  data?: Record<string, string>;
}
