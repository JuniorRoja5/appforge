import {
  IsString,
  IsOptional,
  IsIn,
  IsArray,
  ArrayMaxSize,
  ValidateNested,
  IsDateString,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AnalyticsEventDto {
  @IsString()
  sessionId: string;

  @IsIn(['screen_view', 'session_start', 'session_end', 'module_view'])
  eventType: string;

  @IsOptional()
  @IsString()
  moduleId?: string;

  @IsIn(['android', 'ios', 'web'])
  platform: string;

  @IsOptional()
  @IsString()
  deviceModel?: string;

  @IsOptional()
  @IsString()
  osVersion?: string;

  @IsOptional()
  @IsString()
  appUserId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsDateString()
  timestamp: string;
}

export class IngestEventsDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => AnalyticsEventDto)
  events: AnalyticsEventDto[];
}
