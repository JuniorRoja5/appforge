import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { BookingService } from './booking.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role, BookingStatus } from '@prisma/client';
import { OptionalAppUserAuthGuard } from '../push/optional-app-user.guard';
import { CreateBookingDto } from './dto/create-booking.dto';

@Controller('apps/:appId/bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  // ─── Static routes first (before dynamic :id) ───

  @Get('available')
  getAvailable(@Param('appId') appId: string, @Query('date') date: string) {
    return this.bookingService.getAvailableSlots(appId, date);
  }

  // ─── Public tracking page (with tracking token) ───

  @Get('public/:id')
  async findPublic(
    @Param('appId') appId: string,
    @Param('id') id: string,
    @Query('t') token: string,
  ) {
    if (!token) throw new NotFoundException();
    return this.bookingService.findPublicByToken(appId, id, token);
  }

  @Post('public/:id/cancel')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  async cancelPublic(
    @Param('appId') appId: string,
    @Param('id') id: string,
    @Query('t') token: string,
  ) {
    if (!token) throw new NotFoundException();
    return this.bookingService.cancelByCustomer(appId, id, token);
  }

  // ─── Create booking (público, JWT opcional para asociar AppUser) ───

  @Post()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @UseGuards(OptionalAppUserAuthGuard)
  create(
    @Param('appId') appId: string,
    @Body() dto: CreateBookingDto,
    @Request() req: any,
  ) {
    // appUserId comes from validated JWT only — never trust body
    return this.bookingService.createBooking(appId, dto, req.user?.appUserId);
  }

  // ─── Protected (panel del comerciante) ───

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  findAll(
    @Param('appId') appId: string,
    @Query('date') date: string,
    @Query('status') status: BookingStatus,
    @Request() req: any,
  ) {
    return this.bookingService.findAll(appId, req.user.tenantId, { date, status });
  }

  @Put(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  updateStatus(
    @Param('appId') appId: string,
    @Param('id') id: string,
    @Body('status') status: BookingStatus,
    @Request() req: any,
  ) {
    return this.bookingService.updateStatus(appId, id, req.user.tenantId, status);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  remove(
    @Param('appId') appId: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.bookingService.remove(appId, id, req.user.tenantId);
  }
}
