import { Controller, Post, Put, Delete, Body, Param, Request, UseGuards } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Controller('apps/:appId/catalog/:collectionId/products')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.CLIENT)
export class CatalogProductsController {
  constructor(private readonly catalogService: CatalogService) {}

  @Post()
  create(
    @Param('appId') appId: string,
    @Param('collectionId') collectionId: string,
    @Body() dto: CreateProductDto,
    @Request() req,
  ) {
    return this.catalogService.createProduct(appId, collectionId, dto, req.user.tenantId);
  }

  @Put('reorder')
  reorder(
    @Param('appId') appId: string,
    @Param('collectionId') collectionId: string,
    @Body() body: { items: { id: string; order: number }[] },
    @Request() req,
  ) {
    return this.catalogService.reorderProducts(appId, collectionId, body.items, req.user.tenantId);
  }

  @Put(':productId')
  update(
    @Param('appId') appId: string,
    @Param('collectionId') collectionId: string,
    @Param('productId') productId: string,
    @Body() dto: UpdateProductDto,
    @Request() req,
  ) {
    return this.catalogService.updateProduct(appId, collectionId, productId, dto, req.user.tenantId);
  }

  @Delete(':productId')
  remove(
    @Param('appId') appId: string,
    @Param('collectionId') collectionId: string,
    @Param('productId') productId: string,
    @Request() req,
  ) {
    return this.catalogService.removeProduct(appId, collectionId, productId, req.user.tenantId);
  }
}
