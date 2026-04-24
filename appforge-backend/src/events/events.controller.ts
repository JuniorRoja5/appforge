import { Controller, Get, Post, Put, Delete, Body, Param, Request, UseGuards } from '@nestjs/common';
import { EventsService } from './events.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Controller('apps/:appId/events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  findAll(@Param('appId') appId: string) {
    return this.eventsService.findAll(appId);
  }

  @Get(':id')
  findOne(@Param('appId') appId: string, @Param('id') id: string) {
    return this.eventsService.findOne(appId, id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  create(@Param('appId') appId: string, @Body() dto: CreateEventDto, @Request() req) {
    return this.eventsService.create(appId, dto, req.user.tenantId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  update(
    @Param('appId') appId: string,
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
    @Request() req,
  ) {
    return this.eventsService.update(appId, id, dto, req.user.tenantId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  remove(@Param('appId') appId: string, @Param('id') id: string, @Request() req) {
    return this.eventsService.remove(appId, id, req.user.tenantId);
  }
}
