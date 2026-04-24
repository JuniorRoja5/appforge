import {
  Controller,
  Get,
  Post,
  Delete,
  Put,
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
import { SocialWallService } from './social-wall.service';
import { CreateSocialPostDto } from './dto/create-social-post.dto';
import { CreateSocialCommentDto } from './dto/create-social-comment.dto';
import { ReportContentDto } from './dto/report-content.dto';

@Controller('apps/:appId/social')
export class SocialWallController {
  constructor(
    private readonly socialWallService: SocialWallService,
    private readonly jwtService: JwtService,
  ) {}

  // ──────────────────── Public (runtime) ────────────────────

  @Get('posts')
  async getPosts(
    @Param('appId') appId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Req() req: any,
  ) {
    // Optional: extract app-user identity for isLiked without requiring auth
    const appUserId = this.extractOptionalAppUserId(req);
    return this.socialWallService.getPosts(appId, +page, +limit, appUserId);
  }

  @Get('posts/:postId/comments')
  getComments(
    @Param('postId') postId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.socialWallService.getComments(postId, +page, +limit);
  }

  // ──────────────────── Authenticated app-user ────────────────────

  @Post('posts')
  @UseGuards(AppUserAuthGuard)
  createPost(
    @Param('appId') appId: string,
    @Req() req: any,
    @Body() dto: CreateSocialPostDto,
  ) {
    return this.socialWallService.createPost(appId, req.user.appUserId, dto);
  }

  @Post('posts/:postId/like')
  @HttpCode(200)
  @UseGuards(AppUserAuthGuard)
  toggleLike(@Param('postId') postId: string, @Req() req: any) {
    return this.socialWallService.toggleLike(postId, req.user.appUserId);
  }

  @Post('posts/:postId/comments')
  @UseGuards(AppUserAuthGuard)
  createComment(
    @Param('postId') postId: string,
    @Req() req: any,
    @Body() dto: CreateSocialCommentDto,
  ) {
    return this.socialWallService.createComment(postId, req.user.appUserId, dto);
  }

  @Delete('posts/:postId')
  @UseGuards(AppUserAuthGuard)
  deleteOwnPost(@Param('postId') postId: string, @Req() req: any) {
    return this.socialWallService.deleteOwnPost(postId, req.user.appUserId);
  }

  @Delete('comments/:commentId')
  @UseGuards(AppUserAuthGuard)
  deleteOwnComment(@Param('commentId') commentId: string, @Req() req: any) {
    return this.socialWallService.deleteOwnComment(commentId, req.user.appUserId);
  }

  @Post('report')
  @UseGuards(AppUserAuthGuard)
  reportContent(
    @Param('appId') appId: string,
    @Req() req: any,
    @Body() dto: ReportContentDto,
  ) {
    return this.socialWallService.reportContent(appId, req.user.appUserId, dto);
  }

  // ──────────────────── Protected (builder/platform) ────────────────────

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLIENT, Role.SUPER_ADMIN)
  getStats(@Param('appId') appId: string, @Req() req: any) {
    return this.socialWallService.getStats(appId, req.user.tenantId, req.user.role);
  }

  @Get('reports')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLIENT, Role.SUPER_ADMIN)
  getReports(@Param('appId') appId: string, @Req() req: any) {
    return this.socialWallService.getReports(appId, req.user.tenantId, req.user.role);
  }

  @Put('reports/:reportId/resolve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLIENT, Role.SUPER_ADMIN)
  resolveReport(
    @Param('appId') appId: string,
    @Param('reportId') reportId: string,
    @Req() req: any,
  ) {
    return this.socialWallService.resolveReport(appId, reportId, req.user.tenantId, req.user.role);
  }

  @Delete('posts/:postId/moderate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLIENT, Role.SUPER_ADMIN)
  moderateDeletePost(
    @Param('appId') appId: string,
    @Param('postId') postId: string,
    @Req() req: any,
  ) {
    return this.socialWallService.moderateDeletePost(appId, postId, req.user.tenantId, req.user.role);
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
