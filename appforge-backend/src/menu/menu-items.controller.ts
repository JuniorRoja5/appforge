import { Controller, Post, Put, Delete, Body, Param, Request, UseGuards } from '@nestjs/common';
import { MenuService } from './menu.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';

@Controller('apps/:appId/menu/:categoryId/items')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.CLIENT)
export class MenuItemsController {
  constructor(private readonly menuService: MenuService) {}

  @Post()
  create(
    @Param('appId') appId: string,
    @Param('categoryId') categoryId: string,
    @Body() dto: CreateMenuItemDto,
    @Request() req,
  ) {
    return this.menuService.createItem(appId, categoryId, dto, req.user.tenantId);
  }

  @Put('reorder')
  reorder(
    @Param('appId') appId: string,
    @Param('categoryId') categoryId: string,
    @Body() body: { items: { id: string; order: number }[] },
    @Request() req,
  ) {
    return this.menuService.reorderItems(appId, categoryId, body.items, req.user.tenantId);
  }

  @Put(':itemId')
  update(
    @Param('appId') appId: string,
    @Param('categoryId') categoryId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateMenuItemDto,
    @Request() req,
  ) {
    return this.menuService.updateItem(appId, categoryId, itemId, dto, req.user.tenantId);
  }

  @Delete(':itemId')
  remove(
    @Param('appId') appId: string,
    @Param('categoryId') categoryId: string,
    @Param('itemId') itemId: string,
    @Request() req,
  ) {
    return this.menuService.removeItem(appId, categoryId, itemId, req.user.tenantId);
  }
}
