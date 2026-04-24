import { Module } from '@nestjs/common';
import { MenuCategoriesController } from './menu-categories.controller';
import { MenuItemsController } from './menu-items.controller';
import { MenuService } from './menu.service';

@Module({
  controllers: [MenuCategoriesController, MenuItemsController],
  providers: [MenuService],
})
export class MenuModule {}
