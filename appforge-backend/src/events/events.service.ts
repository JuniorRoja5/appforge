import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  async findAll(appId: string) {
    return this.prisma.event.findMany({
      where: { appId },
      orderBy: { eventDate: 'asc' },
    });
  }

  async findOne(appId: string, id: string) {
    const event = await this.prisma.event.findFirst({
      where: { id, appId },
    });
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    return event;
  }

  private async ensureAppOwnership(appId: string, tenantId: string) {
    const app = await this.prisma.app.findFirst({ where: { id: appId, deletedAt: null }, select: { tenantId: true } });
    if (!app) throw new NotFoundException('App not found');
    if (app.tenantId !== tenantId) throw new ForbiddenException('No tienes acceso a esta app');
  }

  async create(appId: string, dto: CreateEventDto, tenantId: string) {
    await this.ensureAppOwnership(appId, tenantId);

    if (!dto.title || !dto.eventDate) {
      throw new BadRequestException('title and eventDate are required');
    }

    return this.prisma.event.create({
      data: {
        title: dto.title,
        description: dto.description ?? null,
        imageUrl: dto.imageUrl ?? null,
        location: dto.location ?? null,
        eventDate: new Date(dto.eventDate),
        eventEndDate: dto.eventEndDate ? new Date(dto.eventEndDate) : null,
        price: dto.price ?? null,
        ticketUrl: dto.ticketUrl ?? null,
        ticketLabel: dto.ticketLabel ?? null,
        category: dto.category ?? null,
        organizer: dto.organizer ?? null,
        contactInfo: dto.contactInfo ?? null,
        app: { connect: { id: appId } },
      },
    });
  }

  async update(appId: string, id: string, dto: UpdateEventDto, tenantId: string) {
    await this.ensureAppOwnership(appId, tenantId);
    await this.findOne(appId, id);

    return this.prisma.event.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
        ...(dto.location !== undefined && { location: dto.location }),
        ...(dto.eventDate !== undefined && { eventDate: new Date(dto.eventDate) }),
        ...(dto.eventEndDate !== undefined && { eventEndDate: dto.eventEndDate ? new Date(dto.eventEndDate) : null }),
        ...(dto.price !== undefined && { price: dto.price || null }),
        ...(dto.ticketUrl !== undefined && { ticketUrl: dto.ticketUrl || null }),
        ...(dto.ticketLabel !== undefined && { ticketLabel: dto.ticketLabel || null }),
        ...(dto.category !== undefined && { category: dto.category || null }),
        ...(dto.organizer !== undefined && { organizer: dto.organizer || null }),
        ...(dto.contactInfo !== undefined && { contactInfo: dto.contactInfo || null }),
      },
    });
  }

  async remove(appId: string, id: string, tenantId: string) {
    await this.ensureAppOwnership(appId, tenantId);
    await this.findOne(appId, id);
    return this.prisma.event.delete({ where: { id } });
  }
}
