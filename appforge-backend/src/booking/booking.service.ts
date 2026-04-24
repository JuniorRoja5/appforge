import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingStatus, Prisma } from '@prisma/client';

@Injectable()
export class BookingService {
  constructor(private prisma: PrismaService) {}

  /* ─── Tenancy helper ─── */

  private async ensureAppOwnership(appId: string, tenantId: string) {
    const app = await this.prisma.app.findFirst({
      where: { id: appId, deletedAt: null },
      select: { id: true, tenantId: true },
    });
    if (!app) throw new NotFoundException('App not found');
    if (app.tenantId !== tenantId) {
      throw new ForbiddenException('No tienes acceso a esta app');
    }
    return app;
  }

  /* ─── Config helper ─── */

  private async getBookingConfig(appId: string) {
    const app = await this.prisma.app.findFirst({
      where: { id: appId, deletedAt: null },
      select: { schema: true },
    });
    if (!app) throw new NotFoundException('App not found');

    const schema = app.schema as Array<{
      moduleId: string;
      config: { timeSlots?: string[]; slotDuration?: number };
    }>;
    const bookingElement = schema.find((el) => el.moduleId === 'booking');
    if (!bookingElement) {
      throw new NotFoundException('No se encontró configuración de booking en esta app');
    }
    return bookingElement.config;
  }

  /* ─── Public endpoints ─── */

  async getAvailableSlots(appId: string, date: string) {
    const config = await this.getBookingConfig(appId);
    const allSlots = config.timeSlots ?? [];

    const booked = await this.prisma.booking.findMany({
      where: {
        appId,
        date: new Date(date),
        status: BookingStatus.CONFIRMED,
      },
      select: { timeSlot: true },
    });

    const bookedSet = new Set(booked.map((b) => b.timeSlot));
    return allSlots.filter((slot) => !bookedSet.has(slot));
  }

  async createBooking(appId: string, dto: CreateBookingDto) {
    const config = await this.getBookingConfig(appId);
    const duration = config.slotDuration ?? 30;

    try {
      return await this.prisma.booking.create({
        data: {
          app: { connect: { id: appId } },
          date: new Date(dto.date),
          timeSlot: dto.timeSlot,
          duration,
          formData: dto.formData as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Este horario ya está reservado.');
      }
      throw err;
    }
  }

  /* ─── Protected endpoints ─── */

  async findAll(
    appId: string,
    tenantId: string,
    filters?: { date?: string; status?: BookingStatus },
  ) {
    await this.ensureAppOwnership(appId, tenantId);

    const where: Prisma.BookingWhereInput = { appId };

    if (filters?.date) {
      where.date = new Date(filters.date);
    }
    if (filters?.status) {
      where.status = filters.status;
    }

    return this.prisma.booking.findMany({
      where,
      orderBy: [{ date: 'asc' }, { timeSlot: 'asc' }],
    });
  }

  async updateStatus(
    appId: string,
    bookingId: string,
    tenantId: string,
    status: BookingStatus,
  ) {
    await this.ensureAppOwnership(appId, tenantId);

    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, appId },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { status },
    });
  }

  async remove(appId: string, bookingId: string, tenantId: string) {
    await this.ensureAppOwnership(appId, tenantId);

    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, appId },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    return this.prisma.booking.delete({ where: { id: bookingId } });
  }
}
