import {
  Controller, Post, Get, Param, Body, Request, UseGuards, Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { BuildService } from './build.service';
import { KeystoreService } from './keystore.service';
import { StorageService } from '../storage/storage.service';
import { RequestBuildDto } from './dto/request-build.dto';
import * as path from 'path';

@Controller('apps/:appId')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BuildController {
  constructor(
    private readonly buildService: BuildService,
    private readonly keystoreService: KeystoreService,
    private readonly storage: StorageService,
  ) {}

  // --- Builds ---

  @Post('builds')
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  requestBuild(
    @Param('appId') appId: string,
    @Body() dto: RequestBuildDto,
    @Request() req,
  ) {
    return this.buildService.requestBuild(
      appId,
      req.user.tenantId,
      req.user.role,
      dto.buildType ?? 'debug',
    );
  }

  @Get('builds')
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  findAll(@Param('appId') appId: string, @Request() req) {
    return this.buildService.findAll(appId, req.user.tenantId, req.user.role);
  }

  @Get('builds/latest')
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  getLatest(@Param('appId') appId: string, @Request() req) {
    return this.buildService.getLatest(appId, req.user.tenantId, req.user.role);
  }

  @Get('builds/:buildId')
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  findOne(
    @Param('appId') appId: string,
    @Param('buildId') buildId: string,
    @Request() req,
  ) {
    return this.buildService.findOne(appId, buildId, req.user.tenantId, req.user.role);
  }

  @Get('builds/:buildId/download')
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  async download(
    @Param('appId') appId: string,
    @Param('buildId') buildId: string,
    @Request() req,
    @Res() res: Response,
  ) {
    const build = await this.buildService.findOne(
      appId,
      buildId,
      req.user.tenantId,
      req.user.role,
    );

    if (!build.artifactUrl) {
      res.status(404).json({ message: 'No artifact available' });
      return;
    }

    try {
      const stream = await this.storage.getStream(build.artifactUrl);
      const ext = path.extname(build.artifactUrl);
      const filename = `${build.appId}-${build.buildType}${ext}`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', ext === '.aab'
        ? 'application/octet-stream'
        : ext === '.zip'
          ? 'application/zip'
          : 'application/vnd.android.package-archive');
      if (build.artifactSize) res.setHeader('Content-Length', build.artifactSize);
      (stream as any).pipe(res);
    } catch {
      res.status(404).json({ message: 'Artifact file not found' });
    }
  }

  // --- Keystore ---

  @Get('keystore/info')
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  getKeystoreInfo(@Param('appId') appId: string) {
    return this.keystoreService.hasKeystore(appId);
  }

  @Get('keystore/download')
  @Roles(Role.SUPER_ADMIN, Role.CLIENT)
  async downloadKeystore(
    @Param('appId') appId: string,
    @Request() req,
    @Res() res: Response,
  ) {
    try {
      const stream = await this.keystoreService.getKeystoreStream(
        appId,
        req.user.tenantId,
        req.user.role,
      );
      res.setHeader('Content-Disposition', `attachment; filename="${appId}-release.jks"`);
      res.setHeader('Content-Type', 'application/octet-stream');
      (stream as any).pipe(res);
    } catch (err: any) {
      const status = err.status || 404;
      res.status(status).json({ message: err.message || 'Keystore not found' });
    }
  }
}
