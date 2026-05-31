import { IsOptional, IsIn } from 'class-validator';

export class RequestBuildDto {
  @IsOptional()
  @IsIn(['debug', 'release', 'aab', 'ios-export', 'pwa'])
  buildType?: 'debug' | 'release' | 'aab' | 'ios-export' | 'pwa';
}
