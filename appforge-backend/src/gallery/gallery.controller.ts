import { Controller, Get, Post, Put, Delete, Body, Param, Request, UseGuards } from '@nestjs/common';
import { GalleryService } from './gallery.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { CreateGalleryItemDto } from './dto/create-gallery-item.dto';
import { UpdateGalleryItemDto } from './dto/update-gallery-item.dto';

@Controller('apps/:appId/gallery')
export class GalleryController {
  constructor(private readonly galleryService: GalleryService) {}

  /* ─── Public (end-user) ─── */

  @Get()
  findAll(@Param('appId') appId: string) {
    return this.galleryService.findAll(appId);
  }

  @Get(':id')
  findOne(@Param('appId') appId: string, @Param('id') id: string) {
    return this.galleryService.findOne(appId, id);
  }

  /* ─── Protected (builder client) ─── */

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  create(@Param('appId') appId: string, @Body() dto: CreateGalleryItemDto, @Request() req) {
    return this.galleryService.create(appId, dto, req.user.tenantId);
  }

  @Put('reorder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  reorder(
    @Param('appId') appId: string,
    @Body() body: { items: { id: string; order: number }[] },
    @Request() req,
  ) {
    return this.galleryService.reorder(appId, body.items, req.user.tenantId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  update(
    @Param('appId') appId: string,
    @Param('id') id: string,
    @Body() dto: UpdateGalleryItemDto,
    @Request() req,
  ) {
    return this.galleryService.update(appId, id, dto, req.user.tenantId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  remove(@Param('appId') appId: string, @Param('id') id: string, @Request() req) {
    return this.galleryService.remove(appId, id, req.user.tenantId);
  }
}
