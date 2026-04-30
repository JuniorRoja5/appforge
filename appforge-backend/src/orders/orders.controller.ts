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
  NotFoundException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { OptionalAppUserAuthGuard } from '../push/optional-app-user.guard';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Controller('apps/:appId/orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ─── Static routes first (before dynamic :id) ───

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  getStats(@Param('appId') appId: string, @Request() req) {
    return this.ordersService.getStats(appId, req.user.tenantId);
  }

  // ─── Public tracking page (con tracking token) ───

  @Get('public/:id')
  async findPublic(
    @Param('appId') appId: string,
    @Param('id') id: string,
    @Query('t') token: string,
  ) {
    if (!token) throw new NotFoundException();
    return this.ordersService.findPublicByToken(appId, id, token);
  }

  // ─── Create order (público con JWT opcional para asociar AppUser) ───

  @Post()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @UseGuards(OptionalAppUserAuthGuard)
  create(
    @Param('appId') appId: string,
    @Body() dto: CreateOrderDto,
    @Request() req: any,
  ) {
    // El cliente puede enviar appUserId en el body, pero NUNCA confiamos en él.
    // Solo usamos appUserId si viene del JWT validado del runtime.
    const safeDto: CreateOrderDto = {
      ...dto,
      appUserId: req.user?.appUserId ?? undefined,
    };
    return this.ordersService.create(appId, safeDto);
  }

  // ─── Protected (panel del comerciante) ───

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

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  findOne(@Param('appId') appId: string, @Param('id') id: string) {
    return this.ordersService.findOne(appId, id);
  }

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
