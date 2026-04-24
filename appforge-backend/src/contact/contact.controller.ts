import {
  Controller, Get, Post, Delete, Body, Param, Req, Request, UseGuards,
} from '@nestjs/common';
import { ContactService } from './contact.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { SubmitContactDto } from './dto/submit-contact.dto';

@Controller('apps/:appId/contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  // --- Endpoints PÚBLICOS (sin guard) ---

  @Get('captcha')
  getCaptcha(@Param('appId') appId: string) {
    return this.contactService.generateCaptcha(appId);
  }

  @Post('submit')
  submit(
    @Param('appId') appId: string,
    @Body() dto: SubmitContactDto,
    @Req() req: { ip?: string; socket?: { remoteAddress?: string } },
  ) {
    const ip = req.ip ?? req.socket?.remoteAddress;
    return this.contactService.submit(appId, dto, ip);
  }

  // --- Endpoints AUTENTICADOS (con tenancy check) ---

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  findAll(@Param('appId') appId: string, @Request() req) {
    return this.contactService.findAll(appId, req.user.tenantId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  findOne(@Param('appId') appId: string, @Param('id') id: string) {
    return this.contactService.findOne(appId, id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  remove(@Param('appId') appId: string, @Param('id') id: string, @Request() req) {
    return this.contactService.remove(appId, id, req.user.tenantId);
  }
}
