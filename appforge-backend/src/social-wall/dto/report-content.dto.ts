import { IsString, IsNotEmpty, IsOptional, IsIn, MaxLength } from 'class-validator';
import { REPORTABLE_TARGET_TYPES } from '../social-wall.constants';

export class ReportContentDto {
  @IsString()
  @IsNotEmpty()
  @IsIn([...REPORTABLE_TARGET_TYPES])
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
