import { Controller, Get, Post, Put, Delete, Body, Param, Request, UseGuards } from '@nestjs/common';
import { NewsService } from './news.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { CreateNewsArticleDto } from './dto/create-news-article.dto';
import { UpdateNewsArticleDto } from './dto/update-news-article.dto';

@Controller('apps/:appId/news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  /* ─── Public (end-user) ─── */

  @Get()
  findAll(@Param('appId') appId: string) {
    return this.newsService.findAll(appId);
  }

  // @Get('admin') DEBE declararse antes que @Get(':id'). Express resuelve
  // por orden de declaración, no prioriza segmento estático sobre param.
  // Invertir el orden hace que /apps/:appId/news/admin caiga en findOne con
  // id='admin' — comportamiento roto sin error visible. No reordenar.
  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  findAllForAdmin(@Param('appId') appId: string, @Request() req) {
    return this.newsService.findAllForAdmin(appId, req.user.tenantId);
  }

  @Get(':id')
  findOne(@Param('appId') appId: string, @Param('id') id: string) {
    return this.newsService.findOne(appId, id);
  }

  /* ─── Protected (builder client) ─── */

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  create(@Param('appId') appId: string, @Body() dto: CreateNewsArticleDto, @Request() req) {
    return this.newsService.create(appId, dto, req.user.tenantId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  update(
    @Param('appId') appId: string,
    @Param('id') id: string,
    @Body() dto: UpdateNewsArticleDto,
    @Request() req,
  ) {
    return this.newsService.update(appId, id, dto, req.user.tenantId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  remove(@Param('appId') appId: string, @Param('id') id: string, @Request() req) {
    return this.newsService.remove(appId, id, req.user.tenantId);
  }
}
