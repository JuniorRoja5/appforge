import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Controller('apps/:appId/orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // Stats must be declared BEFORE :id to avoid NestJS interpreting "stats" as an ID
  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  getStats(@Param('appId') appId: string, @Request() req) {
    return this.ordersService.getStats(appId, req.user.tenantId);
  }

  // Public: create order (rate limited)
  @Post()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  create(@Param('appId') appId: string, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(appId, dto);
  }

  // Builder client: list orders
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  findAll(
    @Param('appId') appId: string,
    @Query('status') status: string,
    @Query('page') page: string,
    @Request() req,
  ) {
    return this.ordersService.findAll(appId, req.user.tenantId, {
      status,
      page: page ? parseInt(page, 10) : undefined,
    });
  }

  // Public: get single order (for confirmation)
  @Get(':id')
  findOne(@Param('appId') appId: string, @Param('id') id: string) {
    return this.ordersService.findOne(appId, id);
  }

  // Builder client: update order status
  @Put(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  updateStatus(
    @Param('appId') appId: string,
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @Request() req,
  ) {
    return this.ordersService.updateStatus(appId, id, dto, req.user.tenantId);
  }
}
