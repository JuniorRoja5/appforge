import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { StorageService } from '../storage/storage.service.js';
import {
  encryptKeystore,
  decryptKeystore,
  generateRandomPassword,
} from '../lib/crypto.js';
import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';

@Injectable()
export class KeystoreService {
  private readonly logger = new Logger(KeystoreService.name);

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  /**
   * Ensure an app has a keystore. Generate one if it doesn't exist.
   */
  async ensureKeystore(appId: string) {
    const existing = await this.prisma.appKeystore.findUnique({
      where: { appId },
    });
    if (existing) return existing;

    // Get app info for the keystore DN
    const app = await this.prisma.app.findFirst({
      where: { id: appId, deletedAt: null },
      include: { tenant: true },
    });
    if (!app) throw new NotFoundException('App not found');

    const storePass = generateRandomPassword(32);
    const keyPass = generateRandomPassword(32);
    const keyAlias = 'appforge';
    const appName = app.name.replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 50) || 'App';
    const orgName = app.tenant.name.replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 50) || 'AppForge';

    // Create temp directory for keystore generation
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'keystore-'));
    const tmpKeystorePath = path.join(tmpDir, 'release-keystore.jks');

    try {
      // Find keytool
      const keytoolPath = process.env.JAVA_HOME
        ? path.join(process.env.JAVA_HOME, 'bin', 'keytool')
        : 'keytool';

      const cmd = [
        `"${keytoolPath}"`,
        '-genkeypair', '-v',
        '-keystore', `"${tmpKeystorePath}"`,
        '-keyalg', 'RSA',
        '-keysize', '2048',
        '-validity', '10000',
        '-alias', keyAlias,
        '-storepass', `"${storePass}"`,
        '-keypass', `"${keyPass}"`,
        '-dname', `"CN=${appName}, O=${orgName}, L=Unknown, ST=Unknown, C=US"`,
      ].join(' ');

      this.logger.log(`Generating keystore for app ${appId}...`);
      execSync(cmd, {
        timeout: 30000,
        stdio: 'pipe',
        shell: process.platform === 'win32' ? 'cmd.exe' : undefined,
      } as any);

      // Upload to storage
      const storageKey = `keystores/${appId}/release-keystore.jks`;
      await this.storage.upload(storageKey, tmpKeystorePath);

      // Save to DB with encrypted passwords
      const keystore = await this.prisma.appKeystore.create({
        data: {
          appId,
          keystorePath: storageKey,
          storePassword: encryptKeystore(storePass),
          keyAlias,
          keyPassword: encryptKeystore(keyPass),
        },
      });

      this.logger.log(`Keystore generated and stored for app ${appId}`);
      return keystore;
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  /**
   * Download keystore file to a local path (for build process).
   */
  async getKeystoreFile(appId: string, destPath: string): Promise<void> {
    const keystore = await this.prisma.appKeystore.findUnique({
      where: { appId },
    });
    if (!keystore) throw new NotFoundException('Keystore not found for this app');
    await this.storage.download(keystore.keystorePath, destPath);
  }

  /**
   * Get decrypted keystore passwords (for build signing).
   */
  async getDecryptedPasswords(appId: string): Promise<{
    storePassword: string;
    keyPassword: string;
    keyAlias: string;
  }> {
    const keystore = await this.prisma.appKeystore.findUnique({
      where: { appId },
    });
    if (!keystore) throw new NotFoundException('Keystore not found');
    return {
      storePassword: decryptKeystore(keystore.storePassword),
      keyPassword: decryptKeystore(keystore.keyPassword),
      keyAlias: keystore.keyAlias,
    };
  }

  /**
   * Get keystore stream for client download (with ownership check).
   */
  async getKeystoreStream(
    appId: string,
    tenantId: string,
    role: string,
  ): Promise<NodeJS.ReadableStream> {
    // Verify ownership
    const app = await this.prisma.app.findFirst({ where: { id: appId, deletedAt: null } });
    if (!app) throw new NotFoundException('App not found');
    if (role === 'CLIENT' && app.tenantId !== tenantId) {
      throw new ForbiddenException('No tienes acceso a esta app');
    }

    const keystore = await this.prisma.appKeystore.findUnique({
      where: { appId },
    });
    if (!keystore) throw new NotFoundException('Esta app no tiene un keystore generado');

    return this.storage.getStream(keystore.keystorePath);
  }

  /**
   * Check if app has a keystore.
   */
  async hasKeystore(appId: string): Promise<{ hasKeystore: boolean; createdAt?: Date }> {
    const keystore = await this.prisma.appKeystore.findUnique({
      where: { appId },
      select: { createdAt: true },
    });
    return {
      hasKeystore: !!keystore,
      createdAt: keystore?.createdAt,
    };
  }
}
