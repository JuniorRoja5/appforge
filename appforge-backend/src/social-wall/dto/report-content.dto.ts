import { IsString, IsNotEmpty, IsOptional, IsIn, MaxLength } from 'class-validator';

export class ReportContentDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['social_post', 'social_comment', 'fan_post'])
  targetType!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  targetId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
