import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class AppUserAuthGuard extends AuthGuard('app-user-jwt') {}
