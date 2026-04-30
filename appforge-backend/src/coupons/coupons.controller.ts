import { Controller, Get, Post, Put, Delete, Body, Param, Request, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CouponsService } from './coupons.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { RedeemCouponDto } from './dto/redeem-coupon.dto';
import { SetupCouponMerchantConfigDto } from './dto/setup-coupon-merchant-config.dto';
import { MerchantRedeemCouponDto } from './dto/merchant-redeem-coupon.dto';

@Controller('apps/:appId/coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) { }

  // ============================================================
  // IMPORTANTE: las rutas estáticas DEBEN declararse ANTES
  // que las dinámicas (:id, :couponId) para que NestJS no
  // las confunda con un parámetro.
  // ============================================================

  // --- Merchant Config (panel del cliente) ---

  @Get('merchant-config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  getMerchantConfigStatus(@Param('appId') appId: string, @Request() req) {
    return this.couponsService.getMerchantConfigStatus(appId, req.user.tenantId);
  }

  @Post('merchant-config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  setupMerchantConfig(
    @Param('appId') appId: string,
    @Body() dto: SetupCouponMerchantConfigDto,
    @Request() req,
  ) {
    return this.couponsService.setupMerchantConfig(appId, dto, req.user.tenantId);
  }

  // --- Public: info pública para la página /redeem/:appId ---

  @Get('merchant-info')
  getMerchantPublicInfo(@Param('appId') appId: string) {
    return this.couponsService.getMerchantPublicInfo(appId);
  }

  // --- Public: canje con PIN del comerciante (rate limited + Redis lockout) ---

  @Post('merchant-redeem')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  redeemByMerchant(
    @Param('appId') appId: string,
    @Body() dto: MerchantRedeemCouponDto,
  ) {
    return this.couponsService.redeemByMerchant(appId, dto);
  }

  // --- Generate code (cliente builder) ---

  @Post('generate-code')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  generateCode(@Param('appId') appId: string, @Request() req) {
    return this.couponsService.generateCode(appId, req.user.tenantId);
  }

  // ============================================================
  // CRUD básico (sin cambios)
  // ============================================================

  @Get()
  findAll(@Param('appId') appId: string) {
    return this.couponsService.findAll(appId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  create(@Param('appId') appId: string, @Body() dto: CreateCouponDto, @Request() req) {
    return this.couponsService.create(appId, dto, req.user.tenantId);
  }

  @Get(':id')
  findOne(@Param('appId') appId: string, @Param('id') id: string) {
    return this.couponsService.findOne(appId, id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  update(
    @Param('appId') appId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCouponDto,
    @Request() req,
  ) {
    return this.couponsService.update(appId, id, dto, req.user.tenantId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  remove(@Param('appId') appId: string, @Param('id') id: string, @Request() req) {
    return this.couponsService.remove(appId, id, req.user.tenantId);
  }

  // ============================================================
  // Redemption endpoints (existentes, sin cambios)
  // ============================================================

  @Post(':couponId/redeem')
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  redeem(
    @Param('appId') appId: string,
    @Param('couponId') couponId: string,
    @Body() dto: RedeemCouponDto,
  ) {
    return this.couponsService.redeem(appId, couponId, dto);
  }

  @Get(':couponId/redemptions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  getRedemptions(
    @Param('appId') appId: string,
    @Param('couponId') couponId: string,
    @Request() req,
  ) {
    return this.couponsService.getRedemptions(appId, couponId, req.user.tenantId);
  }

  @Post(':couponId/reset-redemptions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  resetRedemptions(
    @Param('appId') appId: string,
    @Param('couponId') couponId: string,
    @Request() req,
  ) {
    return this.couponsService.resetRedemptions(appId, couponId, req.user.tenantId);
  }
}