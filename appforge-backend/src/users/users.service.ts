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

    // Construir `data` solo con los campos realmente presentes en el body.
    // El ValidationPipe global con `transform: true` + `enableImplicitConversion`
    // materializa las props ausentes del DTO como `null` (no como `undefined`),
    // y Prisma trata `null` como "escribir NULL" en el update — borraría el campo
    // en BD. Filtrar `null` y `undefined` aquí evita ese borrado accidental para
    // CUALQUIER campo no enviado, no solo avatarUrl. Confirmado por medición:
    // sesión 2026-06-04, columna `User.avatarUrl` salía NULL tras un Guardar que
    // no incluía la clave en el body.
    //
    // Contrato: para vaciar un campo de texto, mandar cadena vacía `""` (Prisma
    // lo escribe). El endpoint NO permite borrar un campo a NULL explícitamente.
    const fields = [
      'firstName', 'lastName', 'company', 'avatarUrl', 'phone',
      'address', 'address2', 'zipCode', 'city', 'country', 'stateProvince',
    ] as const;

    const data: Prisma.UserUpdateInput = {};
    for (const key of fields) {
      if (dto[key] !== undefined && dto[key] !== null) {
        data[key] = dto[key];
      }
    }

    return this.prisma.user.update({
      where: { id: userId },
      data,
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
