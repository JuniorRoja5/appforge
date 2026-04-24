import { Controller, Get, Post, Put, Delete, Body, Param, Request, UseGuards } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';

@Controller('apps/:appId/catalog')
export class CatalogCollectionsController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  findAll(@Param('appId') appId: string) {
    return this.catalogService.findAllCollections(appId);
  }

  @Get(':collectionId')
  findOne(@Param('appId') appId: string, @Param('collectionId') collectionId: string) {
    return this.catalogService.findOneCollection(appId, collectionId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  create(@Param('appId') appId: string, @Body() dto: CreateCollectionDto, @Request() req) {
    return this.catalogService.createCollection(appId, dto, req.user.tenantId);
  }

  @Put('reorder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  reorder(
    @Param('appId') appId: string,
    @Body() body: { items: { id: string; order: number }[] },
    @Request() req,
  ) {
    return this.catalogService.reorderCollections(appId, body.items, req.user.tenantId);
  }

  @Put(':collectionId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  update(
    @Param('appId') appId: string,
    @Param('collectionId') collectionId: string,
    @Body() dto: UpdateCollectionDto,
    @Request() req,
  ) {
    return this.catalogService.updateCollection(appId, collectionId, dto, req.user.tenantId);
  }

  @Delete(':collectionId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  remove(@Param('appId') appId: string, @Param('collectionId') collectionId: string, @Request() req) {
    return this.catalogService.removeCollection(appId, collectionId, req.user.tenantId);
  }
}
