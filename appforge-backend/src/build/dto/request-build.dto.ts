import { IsOptional, IsIn } from 'class-validator';

export class RequestBuildDto {
  @IsOptional()
  @IsIn(['debug', 'release', 'aab', 'ios-export'])
  buildType?: 'debug' | 'release' | 'aab' | 'ios-export';
}
