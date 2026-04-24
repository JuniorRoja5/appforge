import { Controller, Post, UseInterceptors, UploadedFile, UseGuards, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { AppUserAuthGuard } from '../app-users/app-user-auth.guard';
import { validateFileType } from '../lib/validate-file-type';
import * as fs from 'fs';

const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

@Controller('upload')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UploadController {
  
  @Post('image')
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: uploadDir,
      filename: (req, file, cb) => {
        const uniqueSuffix = uuidv4() + extname(file.originalname);
        cb(null, uniqueSuffix);
      }
    }),
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB
    },
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp|svg\+xml)$/i) && !file.originalname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
        return cb(new BadRequestException('Solo se permiten archivos de imagen'), false);
      }
      cb(null, true);
    }
  }))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Archivo no subido correctamente o es demasiado grande.');
    }
    await validateFileType(file.path, 'image');

    const url = `/uploads/${file.filename}`;

    return {
      message: 'Imagen subida exitosamente',
      url,
      filename: file.filename,
    };
  }

  @Post('app-icon')
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: uploadDir,
      filename: (req, file, cb) => {
        const uniqueSuffix = uuidv4() + extname(file.originalname);
        cb(null, uniqueSuffix);
      }
    }),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB max for app icons
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype !== 'image/png') {
        return cb(new BadRequestException('Solo se permiten archivos PNG para el icono de la app'), false);
      }
      cb(null, true);
    }
  }))
  async uploadAppIcon(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Archivo no subido. El icono debe ser PNG y máximo 5MB.');
    }
    await validateFileType(file.path, 'image');

    const url = `/uploads/${file.filename}`;

    return {
      message: 'Icono subido exitosamente',
      url,
      filename: file.filename,
    };
  }

  @Post('avatar')
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: uploadDir,
      filename: (req, file, cb) => {
        const uniqueSuffix = uuidv4() + extname(file.originalname);
        cb(null, uniqueSuffix);
      }
    }),
    limits: {
      fileSize: 2 * 1024 * 1024, // 2MB max for avatars
    },
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.match(/^image\/(jpg|jpeg|png|gif|webp)$/i)) {
        return cb(new BadRequestException('Solo se permiten imágenes (JPG, PNG, GIF, WEBP). Máximo 2MB.'), false);
      }
      cb(null, true);
    }
  }))
  async uploadAvatar(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Archivo no subido. El avatar debe ser una imagen y máximo 2MB.');
    }
    await validateFileType(file.path, 'image');

    const url = `/uploads/${file.filename}`;

    return {
      message: 'Avatar subido exitosamente',
      url,
      filename: file.filename,
    };
  }

  @Post('file')
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: uploadDir,
      filename: (req, file, cb) => {
        const uniqueSuffix = uuidv4() + extname(file.originalname);
        cb(null, uniqueSuffix);
      }
    }),
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB
    },
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.match(/\/(pdf|jpg|jpeg|png|gif|webp|svg\+xml)$/i) && !file.originalname.match(/\.(pdf|jpg|jpeg|png|gif|webp|svg)$/i)) {
        return cb(new BadRequestException('Tipo de archivo no permitido'), false);
      }
      cb(null, true);
    }
  }))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Archivo no subido correctamente o es demasiado grande.');
    }
    await validateFileType(file.path, 'document');

    const url = `/uploads/${file.filename}`;

    return {
      message: 'Archivo subido exitosamente',
      url,
      filename: file.filename,
      originalName: file.originalname,
    };
  }

  // ──────────────────── App-user upload (for social/fan wall) ────────────────────

  @Post('app-user-image')
  @UseGuards(AppUserAuthGuard)
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: uploadDir,
      filename: (req, file, cb) => {
        const uniqueSuffix = uuidv4() + extname(file.originalname);
        cb(null, uniqueSuffix);
      }
    }),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.match(/^image\/(jpg|jpeg|png|gif|webp)$/i)) {
        return cb(new BadRequestException('Solo se permiten imágenes (JPG, PNG, GIF, WEBP). Máximo 10MB.'), false);
      }
      cb(null, true);
    }
  }))
  async uploadAppUserImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Archivo no subido. Debe ser una imagen y máximo 10MB.');
    }
    await validateFileType(file.path, 'image');

    const url = `/uploads/${file.filename}`;

    return {
      message: 'Imagen subida exitosamente',
      url,
      filename: file.filename,
    };
  }
}
