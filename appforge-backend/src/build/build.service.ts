import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { BuildType } from '@prisma/client';
import { createHash } from 'crypto';
import stableStringify from 'json-stable-stringify';

const BUILD_TYPE_MAP: Record<string, BuildType> = {
  debug: BuildType.DEBUG,
  release: BuildType.RELEASE,
  aab: BuildType.AAB,
  'ios-export': BuildType.IOS_EXPORT,
  pwa: BuildType.PWA,
};

interface CanvasElement {
  moduleId: string;
  config: Record<string, unknown>;
  [key: string]: unknown;
}

function computeBuildableHash(schema: unknown, designTokens: unknown): string {
  const elements = Array.isArray(schema) ? schema : [];
  const structural = elements.map((el: CanvasElement) => {
    const { _refreshKey, appId, ...rest } = el.config ?? {};
    return { moduleId: el.moduleId, config: rest };
  });
  const payload = { elements: structural, designTokens: designTokens ?? null };
  const serialized = stableStringify(payload) ?? '';
  return createHash('sha256').update(serialized).digest('hex');
}

@Injectable()
export class BuildService {
  constructor(
    private prisma: PrismaService,
    private subscriptionService: SubscriptionService,
    @InjectQueue('app-build') private buildQueue: Queue,
  ) {}

  private async ensureOwnership(appId: string, tenantId: string, role: string) {
    const app = await this.prisma.app.findFirst({ where: { id: appId, deletedAt: null } });
    if (!app) throw new NotFoundException('App not found');
    if (role === 'CLIENT' && app.tenantId !== tenantId) {
      throw new ForbiddenException('No tienes acceso a esta app');
    }
    return app;
  }

  async requestBuild(
    appId: string,
    tenantId: string,
    role: string,
    buildTypeInput: string = 'debug',
  ) {
    const buildType = BUILD_TYPE_MAP[buildTypeInput];
    if (!buildType) {
      throw new BadRequestException(`Tipo de build inválido: ${buildTypeInput}`);
    }
    const app = await this.ensureOwnership(appId, tenantId, role);

    // Subscription enforcement: check if tenant can build
    const buildCheck = await this.subscriptionService.canBuild(tenantId);
    if (!buildCheck.allowed) {
      throw new ForbiddenException(buildCheck.reason);
    }

    // Validate build readiness
    const appConfig = (app.appConfig as Record<string, unknown>) ?? {};
    const androidConfig = appConfig.androidConfig as Record<string, unknown> | undefined;
    const schema = Array.isArray(app.schema) ? app.schema : [];

    if (schema.length === 0) {
      throw new BadRequestException('La app necesita al menos un módulo para construir.');
    }

    // Android builds require packageName; iOS export and PWA do not
    if (buildType !== BuildType.IOS_EXPORT && buildType !== BuildType.PWA && !androidConfig?.packageName) {
      throw new BadRequestException('Configura el nombre de paquete Android antes de construir.');
    }

    // Check no active build
    const active = await this.prisma.appBuild.findFirst({
      where: {
        appId,
        status: { in: ['QUEUED', 'PREPARING', 'BUILDING', 'SIGNING'] },
      },
    });
    if (active) {
      throw new ConflictException('Ya hay un build en progreso para esta app.');
    }

    const schemaHash = computeBuildableHash(app.schema, app.designTokens);

    const build = await this.prisma.appBuild.create({
      data: { appId, buildType, schemaHash, status: 'QUEUED' },
    });

    await this.prisma.app.update({
      where: { id: appId },
      data: { status: 'BUILDING' },
    });

    await this.buildQueue.add(
      'build-app',
      { buildId: build.id, appId, buildType },
      { attempts: 1, removeOnComplete: true, removeOnFail: false },
    );

    return build;
  }

  async findAll(appId: string, tenantId: string, role: string) {
    await this.ensureOwnership(appId, tenantId, role);
    return this.prisma.appBuild.findMany({
      where: { appId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async findOne(appId: string, buildId: string, tenantId: string, role: string) {
    await this.ensureOwnership(appId, tenantId, role);
    const build = await this.prisma.appBuild.findFirst({
      where: { id: buildId, appId },
    });
    if (!build) throw new NotFoundException('Build not found');
    return build;
  }

  async getLatest(appId: string, tenantId: string, role: string) {
    await this.ensureOwnership(appId, tenantId, role);
    const build = await this.prisma.appBuild.findFirst({
      where: { appId },
      orderBy: { createdAt: 'desc' },
    });
    return build ?? null;
  }
}
