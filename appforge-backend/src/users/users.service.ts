import { Injectable, NotFoundException, UnauthorizedException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlatformEmailService } from '../platform/platform-email.service';
import { Prisma, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import type { ChangePasswordDto } from './dto/change-password.dto';

// Fields to exclude from public responses
const publicSelect = {
  id: true,
  email: true,
  role: true,
  status: true,
  tenantId: true,
  firstName: true,
  lastName: true,
  company: true,
  avatarUrl: true,
  phone: true,
  address: true,
  address2: true,
  zipCode: true,
  city: true,
  country: true,
  stateProvince: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private emailService: PlatformEmailService,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({
      data,
    });
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: publicSelect,
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        company: dto.company,
        avatarUrl: dto.avatarUrl,
        phone: dto.phone,
        address: dto.address,
        address2: dto.address2,
        zipCode: dto.zipCode,
        city: dto.city,
        country: dto.country,
        stateProvince: dto.stateProvince,
      },
      select: publicSelect,
    });
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    if (!dto.newPassword || dto.newPassword.length < 8) {
      throw new BadRequestException('La nueva contraseña debe tener al menos 8 caracteres.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const isValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isValid) {
      throw new UnauthorizedException('La contraseña actual es incorrecta.');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Fire-and-forget email notification
    const name = user.firstName || user.email.split('@')[0];
    this.emailService.sendPasswordChangedEmail(user.email, name).catch(() => {});

    return { message: 'Contraseña actualizada correctamente.' };
  }

  async requestDeletion(userId: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (user.role === 'SUPER_ADMIN') {
      throw new ForbiddenException('Las cuentas de administrador no pueden ser eliminadas.');
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new UnauthorizedException('La contraseña es incorrecta.');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: 'PENDING_DELETION',
        deletionRequestedAt: new Date(),
      },
    });

    // Fire-and-forget email notifications (user + admin)
    const name = user.firstName || user.email.split('@')[0];
    this.emailService.sendDeletionRequestEmail(user.email, name).catch(() => {});

    return { message: 'Solicitud de eliminación registrada. Tu cuenta ha sido desactivada.' };
  }
}
