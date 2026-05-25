import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateSocialCommentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content!: string;
}
