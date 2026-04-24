import { IsOptional, IsString, IsInt, Min, Max, IsIn, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class ListAppUsersQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'BANNED'])
  status?: 'ACTIVE' | 'BANNED';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
