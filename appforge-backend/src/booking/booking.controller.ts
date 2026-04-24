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
} from '@nestjs/common';
import { BookingService } from './booking.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role, BookingStatus } from '@prisma/client';
import { CreateBookingDto } from './dto/create-booking.dto';

@Controller('apps/:appId/bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  /* ─── Public: available slots ─── */

  @Get('available')
  getAvailableSlots(
    @Param('appId') appId: string,
    @Query('date') date: string,
  ) {
    return this.bookingService.getAvailableSlots(appId, date);
  }

  /* ─── Public: create booking ─── */

  @Post()
  createBooking(
    @Param('appId') appId: string,
    @Body() dto: CreateBookingDto,
  ) {
    return this.bookingService.createBooking(appId, dto);
  }

  /* ─── Protected: list bookings ─── */

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  findAll(
    @Param('appId') appId: string,
    @Request() req,
    @Query('date') date?: string,
    @Query('status') status?: BookingStatus,
  ) {
    return this.bookingService.findAll(appId, req.user.tenantId, { date, status });
  }

  /* ─── Protected: update status ─── */

  @Put(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  updateStatus(
    @Param('appId') appId: string,
    @Param('id') id: string,
    @Request() req,
    @Body('status') status: BookingStatus,
  ) {
    return this.bookingService.updateStatus(appId, id, req.user.tenantId, status);
  }

  /* ─── Protected: delete booking ─── */

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  remove(
    @Param('appId') appId: string,
    @Param('id') id: string,
    @Request() req,
  ) {
    return this.bookingService.remove(appId, id, req.user.tenantId);
  }
}
