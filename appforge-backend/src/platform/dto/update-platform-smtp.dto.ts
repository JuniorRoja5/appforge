export class UpdatePlatformSmtpDto {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password?: string;
  fromEmail: string;
  fromName: string;
}
