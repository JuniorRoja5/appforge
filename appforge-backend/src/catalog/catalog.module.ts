import { Module } from '@nestjs/common';
import { CatalogCollectionsController } from './catalog-collections.controller';
import { CatalogProductsController } from './catalog-products.controller';
import { CatalogService } from './catalog.service';

@Module({
  controllers: [CatalogCollectionsController, CatalogProductsController],
  providers: [CatalogService],
})
export class CatalogModule {}
