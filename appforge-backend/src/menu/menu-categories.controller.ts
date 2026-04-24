import { Controller, Get, Post, Put, Delete, Body, Param, Request, UseGuards } from '@nestjs/common';
import { MenuService } from './menu.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { CreateMenuCategoryDto } from './dto/create-menu-category.dto';
import { UpdateMenuCategoryDto } from './dto/update-menu-category.dto';

@Controller('apps/:appId/menu')
export class MenuCategoriesController {
  constructor(private readonly menuService: MenuService) {}

  @Get()
  findAll(@Param('appId') appId: string) {
    return this.menuService.findAllCategories(appId);
  }

  @Get(':categoryId')
  findOne(@Param('appId') appId: string, @Param('categoryId') categoryId: string) {
    return this.menuService.findOneCategory(appId, categoryId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  create(@Param('appId') appId: string, @Body() dto: CreateMenuCategoryDto, @Request() req) {
    return this.menuService.createCategory(appId, dto, req.user.tenantId);
  }

  @Put('reorder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  reorder(
    @Param('appId') appId: string,
    @Body() body: { items: { id: string; order: number }[] },
    @Request() req,
  ) {
    return this.menuService.reorderCategories(appId, body.items, req.user.tenantId);
  }

  @Put(':categoryId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  update(
    @Param('appId') appId: string,
    @Param('categoryId') categoryId: string,
    @Body() dto: UpdateMenuCategoryDto,
    @Request() req,
  ) {
    return this.menuService.updateCategory(appId, categoryId, dto, req.user.tenantId);
  }

  @Delete(':categoryId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  remove(@Param('appId') appId: string, @Param('categoryId') categoryId: string, @Request() req) {
    return this.menuService.removeCategory(appId, categoryId, req.user.tenantId);
  }
}
