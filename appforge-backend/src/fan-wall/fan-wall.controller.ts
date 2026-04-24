import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { AppUserAuthGuard } from '../app-users/app-user-auth.guard';
import { FanWallService } from './fan-wall.service';
import { CreateFanPostDto } from './dto/create-fan-post.dto';

@Controller('apps/:appId/fan-wall')
export class FanWallController {
  constructor(
    private readonly fanWallService: FanWallService,
    private readonly jwtService: JwtService,
  ) {}

  // ──────────────────── Public (runtime) ────────────────────

  @Get('posts')
  async getPosts(
    @Param('appId') appId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '24',
    @Req() req: any,
  ) {
    const appUserId = this.extractOptionalAppUserId(req);
    return this.fanWallService.getPosts(appId, +page, +limit, appUserId);
  }

  // ──────────────────── Authenticated app-user ────────────────────

  @Post('posts')
  @UseGuards(AppUserAuthGuard)
  createPost(
    @Param('appId') appId: string,
    @Req() req: any,
    @Body() dto: CreateFanPostDto,
  ) {
    return this.fanWallService.createPost(appId, req.user.appUserId, dto);
  }

  @Post('posts/:postId/like')
  @HttpCode(200)
  @UseGuards(AppUserAuthGuard)
  toggleLike(@Param('postId') postId: string, @Req() req: any) {
    return this.fanWallService.toggleLike(postId, req.user.appUserId);
  }

  @Post('posts/:postId/report')
  @UseGuards(AppUserAuthGuard)
  reportPost(
    @Param('appId') appId: string,
    @Param('postId') postId: string,
    @Req() req: any,
    @Body() body: { reason?: string },
  ) {
    return this.fanWallService.reportPost(appId, req.user.appUserId, postId, body.reason);
  }

  @Delete('posts/:postId')
  @UseGuards(AppUserAuthGuard)
  deleteOwnPost(@Param('postId') postId: string, @Req() req: any) {
    return this.fanWallService.deleteOwnPost(postId, req.user.appUserId);
  }

  // ──────────────────── Protected (builder/platform) ────────────────────

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLIENT, Role.SUPER_ADMIN)
  getStats(@Param('appId') appId: string, @Req() req: any) {
    return this.fanWallService.getStats(appId, req.user.tenantId, req.user.role);
  }

  @Delete('posts/:postId/moderate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLIENT, Role.SUPER_ADMIN)
  moderateDeletePost(
    @Param('appId') appId: string,
    @Param('postId') postId: string,
    @Req() req: any,
  ) {
    return this.fanWallService.moderateDeletePost(appId, postId, req.user.tenantId, req.user.role);
  }

  // ──────────────────── Private helpers ────────────────────

  private extractOptionalAppUserId(req: any): string | undefined {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return undefined;
    try {
      const payload = this.jwtService.verify(authHeader.slice(7));
      return payload.sub;
    } catch {
      return undefined;
    }
  }
}
