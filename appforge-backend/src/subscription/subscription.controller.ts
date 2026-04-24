import {
  Controller, Get, Put, Param, Body, Request, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role, PlanType } from '@prisma/client';
import { SubscriptionService } from './subscription.service';
import { ChangePlanDto } from './dto/change-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Controller('subscription')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  /** Get current user's subscription + usage */
  @Get()
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  getMySubscription(@Request() req) {
    return this.subscriptionService.getTenantPlan(req.user.tenantId);
  }

  /** List all available plans */
  @Get('plans')
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  listPlans() {
    return this.subscriptionService.listPlans();
  }

  /** List all subscriptions (SUPER_ADMIN only) */
  @Get('all')
  @Roles(Role.SUPER_ADMIN)
  listAll() {
    return this.subscriptionService.listAllSubscriptions();
  }

  /** Change a tenant's plan (SUPER_ADMIN only) */
  @Put('change')
  @Roles(Role.SUPER_ADMIN)
  changePlan(@Body() dto: ChangePlanDto) {
    return this.subscriptionService.changePlan(dto.tenantId, dto.planType);
  }

  /** Update plan limits/prices (SUPER_ADMIN only) */
  @Put('plans/:planType')
  @Roles(Role.SUPER_ADMIN)
  updatePlan(
    @Param('planType') planType: PlanType,
    @Body() dto: UpdatePlanDto,
  ) {
    return this.subscriptionService.updatePlan(planType, dto);
  }
}
