import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { KeystoreService } from './keystore.service';
import { StorageService } from '../storage/storage.service';
import { PlatformEmailService } from '../platform/platform-email.service';
import { decryptKeystore } from '../lib/crypto';
import { BuildType } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import { spawn } from 'child_process';

const RUNTIME_TEMPLATE_DIR = path.resolve(
  process.cwd(),
  '..',
  'appforge-runtime',
);

// Persistent cache directories — survive between builds
const NPM_CACHE_DIR = path.join(process.cwd(), 'tmp', '.npm-cache');
const GRADLE_HOME_DIR = path.join(process.cwd(), 'tmp', '.gradle-home');

const MAX_LOG_SIZE = 50_000; // 50KB
function truncateBuildLog(logs: string[]): string {
  const full = logs.join('\n');
  if (full.length <= MAX_LOG_SIZE) return full;
  return full.slice(-MAX_LOG_SIZE) + '\n[... truncated]';
}

interface BuildJobData {
  buildId: string;
  appId: string;
  buildType?: string;
}

const JOB_TYPE_MAP: Record<string, BuildType> = {
  debug: BuildType.DEBUG,
  release: BuildType.RELEASE,
  aab: BuildType.AAB,
  'ios-export': BuildType.IOS_EXPORT,
  pwa: BuildType.PWA,
  // Also accept enum values directly (from newer queue entries)
  DEBUG: BuildType.DEBUG,
  RELEASE: BuildType.RELEASE,
  AAB: BuildType.AAB,
  IOS_EXPORT: BuildType.IOS_EXPORT,
  PWA: BuildType.PWA,
};

@Processor('app-build', { concurrency: 1 })
export class BuildProcessor extends WorkerHost {
  private readonly logger = new Logger(BuildProcessor.name);

  constructor(
    private prisma: PrismaService,
    private keystoreService: KeystoreService,
    private storage: StorageService,
    private emailService: PlatformEmailService,
  ) {
    super();
  }

  async process(job: Job<BuildJobData>): Promise<void> {
    const { buildId, appId } = job.data;
    const rawType = job.data.buildType ?? 'debug';
    const buildType: BuildType = JOB_TYPE_MAP[rawType] ?? BuildType.DEBUG;
    const logs: string[] = [];
    const log = (msg: string) => {
      this.logger.log(msg);
      logs.push(`[${new Date().toISOString()}] ${msg}`);
    };

    let buildDir = '';

    try {
      // 1. PREPARING
      await this.updateStatus(buildId, 'PREPARING');
      log(`Build ${buildId} started for app ${appId} (type: ${buildType})`);

      const app = await this.prisma.app.findUnique({
        where: { id: appId },
        include: { smtpConfig: true },
      });
      if (!app) throw new Error('App not found');

      const appConfig = (app.appConfig as Record<string, unknown>) ?? {};
      const androidConfig = (appConfig.androidConfig as Record<string, unknown>) ?? {};
      const packageName = (androidConfig.packageName as string) ?? 'com.appforge.app';
      const versionName = (androidConfig.versionName as string) ?? '1.0.0';
      const versionCode = (androidConfig.versionCode as number) ?? 1;

      // SECURITY: Validate packageName before injecting into Capacitor config template.
      // This is a defense-in-depth check — the DTO also validates, but build jobs
      // may be queued with pre-existing data that wasn't validated at save time.
      if (!/^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*){1,}$/.test(packageName)) {
        throw new Error(`Invalid package name: ${packageName}`);
      }

      // 2. Create isolated build directory
      const tmpBase = path.join(process.cwd(), 'tmp', 'builds');
      buildDir = path.join(tmpBase, buildId);
      await fs.mkdir(buildDir, { recursive: true });

      // Copy runtime template
      log('Copying runtime template...');
      await this.copyDir(RUNTIME_TEMPLATE_DIR, buildDir, new Set([
        'node_modules', 'dist', 'android', 'ios', '.git',
      ]));
      log('Template copied');

      // 3. Generate app-manifest.json
      const apiUrl = process.env.PUBLIC_API_URL || 'http://localhost:3000';
      log(`Generating app-manifest.json with apiUrl=${apiUrl}...`);
      const manifest = {
        appId: app.id,
        appName: app.name,
        apiUrl,
        schema: app.schema,
        designTokens: app.designTokens,
        appConfig: {
          icon: appConfig.icon ?? null,
          splash: appConfig.splash ?? null,
          onboarding: appConfig.onboarding ?? null,
          terms: appConfig.terms ?? null,
          pushEnabled: Array.isArray(app.schema)
            ? (app.schema as any[]).some((el: any) => el.moduleId === 'push_notification')
            : false,
        },
      };
      await fs.writeFile(
        path.join(buildDir, 'public', 'app-manifest.json'),
        JSON.stringify(manifest, null, 2),
      );

      // 4. Determine if push plugin should be included
      const schema = Array.isArray(app.schema) ? (app.schema as any[]) : [];
      const hasPushModule = schema.some((el: any) => el.moduleId === 'push_notification');
      let includePushPlugin = false;
      if (hasPushModule) {
        const fcmConfig = await this.prisma.platformFcmConfig.findFirst();
        if (fcmConfig) {
          includePushPlugin = true;
        } else if (buildType !== BuildType.DEBUG) {
          throw new Error('Push notification module requires FCM configuration. Configure it in Admin > Settings.');
        } else {
          log('WARNING: Push module present but FCM not configured. Excluding @capacitor/push-notifications from debug build to prevent native crash.');
        }
      }

      // Remove push-notifications package if FCM not available (prevents native crash without google-services.json)
      if (hasPushModule && !includePushPlugin) {
        const pkgPath = path.join(buildDir, 'package.json');
        const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'));
        delete pkg.dependencies?.['@capacitor/push-notifications'];
        await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2));
        log('Removed @capacitor/push-notifications from package.json (no FCM config)');

        // Replace push.ts with a stub so Vite doesn't fail on the missing dynamic import
        const pushStubContent = [
          'export async function initPush(): Promise<void> {',
          "  console.warn('[Push] FCM not configured — push notifications disabled');",
          '}',
          '',
        ].join('\n');
        await fs.writeFile(path.join(buildDir, 'src', 'lib', 'push.ts'), pushStubContent, 'utf-8');
        log('Replaced push.ts with stub (no FCM config)');
      }

      // 5. Generate capacitor.config.ts dynamically
      log('Generating Capacitor config...');
      const capConfigPath = path.join(buildDir, 'capacitor.config.ts');
      const isHttps = apiUrl.startsWith('https://');
      const pushPluginBlock = includePushPlugin
        ? `\n    PushNotifications: {\n      presentationOptions: ['badge', 'sound', 'alert'],\n    },`
        : '';
      const capConfigContent = `import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: '${packageName}',
  appName: '${app.name.replace(/'/g, "\\'")}',
  webDir: 'dist',
  server: {
    androidScheme: '${isHttps ? 'https' : 'http'}',${!isHttps ? '\n    cleartext: true,' : ''}
  },${!isHttps ? `\n  android: {\n    allowMixedContent: true,\n  },` : ''}
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
    },${pushPluginBlock}
  },
};

export default config;
`;
      await fs.writeFile(capConfigPath, capConfigContent);
      log(`Capacitor config: androidScheme=${isHttps ? 'https' : 'http'}, cleartext=${!isHttps}, push=${includePushPlugin}`);

      // 6. BUILDING
      await this.updateStatus(buildId, 'BUILDING');

      // --- PWA build branch (completely separate pipeline) ---
      if (buildType === BuildType.PWA) {
        await this.buildPwa(buildId, appId, app, appConfig, buildDir, logs, log);
        return;
      }

      // npm install — use persistent cache so subsequent builds skip network downloads
      await fs.mkdir(NPM_CACHE_DIR, { recursive: true });
      log('Installing dependencies (npm ci with persistent cache)...');
      await this.exec('npm ci --prefer-offline --no-audit --no-fund', buildDir, 600000, {
        NPM_CONFIG_CACHE: NPM_CACHE_DIR,
      });
      log('Dependencies installed');

      // Vite build
      log('Building web assets (vite build)...');
      await this.exec('npx vite build', buildDir);
      log('Web build complete');

      // --- iOS Export branch ---
      if (buildType === BuildType.IOS_EXPORT) {
        await this.buildIosExport(buildId, appId, app, appConfig, versionName, buildDir, logs, log);
        return;
      }

      // --- Android build branch (debug / release / aab) ---
      await this.buildAndroid(buildId, appId, app, appConfig, androidConfig, buildType, packageName, versionName, versionCode, buildDir, logs, log, includePushPlugin);

    } catch (error: any) {
      this.logger.error(`Build ${buildId} failed: ${error.message}`, error.stack);
      logs.push(`[ERROR] ${error.message}`);

      await this.prisma.appBuild.update({
        where: { id: buildId },
        data: {
          status: 'FAILED',
          errorMessage: error.message?.slice(0, 2000),
          logOutput: truncateBuildLog(logs),
          completedAt: new Date(),
        },
      }).catch(() => {});

      await this.prisma.app.update({
        where: { id: appId },
        data: { status: 'DRAFT' },
      }).catch(() => {});

      // Notify owner of failure
      const failedApp = await this.prisma.app.findUnique({ where: { id: appId } }).catch(() => null);
      if (failedApp) {
        await this.notifyBuildResult(failedApp.tenantId, failedApp.name, buildType, false, error.message).catch(() => {});
      }

      throw error;
    } finally {
      if (buildDir) {
        await fs.rm(buildDir, { recursive: true, force: true }).catch(() => {});
      }
    }
  }

  // =============================================
  // Android build (debug / release / aab)
  // =============================================
  private async buildAndroid(
    buildId: string, appId: string, app: any, appConfig: Record<string, unknown>,
    androidConfig: Record<string, unknown>, buildType: BuildType,
    packageName: string, versionName: string, versionCode: number,
    buildDir: string, logs: string[], log: (msg: string) => void,
    includePushPlugin: boolean,
  ) {
    const schema = Array.isArray(app.schema) ? (app.schema as any[]) : [];
    const hasPushModule = schema.some((el: any) => el.moduleId === 'push_notification');
    let fcmInjected = false;

    // Add Android platform
    log('Adding Capacitor Android platform...');
    await this.exec('npx cap add android', buildDir);
    log('Android platform added');

    // Create local.properties with SDK path
    const androidDir = path.join(buildDir, 'android');
    const sdkDir = this.findAndroidSdk();
    if (sdkDir) {
      await fs.writeFile(
        path.join(androidDir, 'local.properties'),
        `sdk.dir=${sdkDir.replace(/\\/g, '/')}\n`,
      );
      log(`Android SDK set: ${sdkDir}`);
    } else {
      throw new Error('Android SDK not found. Set ANDROID_HOME or install Android Studio.');
    }

    // Inject app icon into Android resources
    const iconConfig = appConfig.icon as Record<string, unknown> | undefined;
    const iconUrl = iconConfig?.url as string | undefined;
    if (iconUrl) {
      await this.injectAndroidIcon(buildDir, iconUrl, log);
    } else {
      log('No custom icon configured — using default Capacitor icon');
    }

    // Inject google-services.json if push plugin is included (FCM check already done in process())
    if (includePushPlugin) {
      log('Injecting FCM google-services.json...');
      const fcmConfig = await this.prisma.platformFcmConfig.findFirst();
      if (fcmConfig) {
        const { decrypt } = await import('../lib/crypto.js');
        const googleServicesContent = decrypt(fcmConfig.googleServicesJson);
        await fs.writeFile(
          path.join(buildDir, 'android', 'app', 'google-services.json'),
          googleServicesContent,
        );
        fcmInjected = true;
        log('google-services.json injected');
      }
    }

    // Sync
    log('Syncing Capacitor...');
    await this.exec('npx cap sync android', buildDir);
    log('Capacitor sync complete');

    // Inject Firebase Gradle plugin only if google-services.json was actually injected
    if (fcmInjected) {
      await this.injectFirebaseConfig(buildDir);
      log('Firebase Gradle plugin injected');
    }

    // Inject permissions
    const androidPermissions = (appConfig.androidPermissions as Record<string, boolean>) ?? {};
    if (hasPushModule) {
      androidPermissions['POST_NOTIFICATIONS'] = true;
    }
    // Auto-enable CAMERA + storage for modules with image upload
    const uploadModules = ['fan_wall', 'social_wall', 'user_profile'];
    const hasUploadModule = schema.some((el: any) => uploadModules.includes(el.moduleId));
    if (hasUploadModule) {
      androidPermissions['CAMERA'] = true;
      androidPermissions['READ_MEDIA_IMAGES'] = true;
    }
    await this.injectAndroidPermissions(buildDir, androidPermissions);
    log('Android permissions injected');

    // Inject version
    await this.injectVersionInfo(buildDir, versionCode, versionName);
    log(`Version set: ${versionName} (${versionCode})`);

    // --- Signing for release/aab ---
    if (buildType === BuildType.RELEASE || buildType === BuildType.AAB) {
      await this.updateStatus(buildId, 'SIGNING');
      log('Setting up release signing...');

      const keystore = await this.keystoreService.ensureKeystore(appId);
      const keystoreDest = path.join(androidDir, 'app', 'release-keystore.jks');
      await this.keystoreService.getKeystoreFile(appId, keystoreDest);

      const passwords = await this.keystoreService.getDecryptedPasswords(appId);
      await this.injectSigningConfig(buildDir, passwords.storePassword, passwords.keyPassword, passwords.keyAlias);
      log('Signing config injected');
    }

    // Gradle build
    let gradleTask: string;
    if (buildType === BuildType.AAB) {
      gradleTask = 'bundleRelease';
    } else if (buildType === BuildType.RELEASE) {
      gradleTask = 'assembleRelease';
    } else {
      gradleTask = 'assembleDebug';
    }

    const gradleCmd = process.platform === 'win32'
      ? `.\\gradlew.bat ${gradleTask}`
      : `./gradlew ${gradleTask}`;

    log(`Building with Gradle (${gradleTask})...`);
    await fs.mkdir(GRADLE_HOME_DIR, { recursive: true });
    await this.exec(gradleCmd, androidDir, 1500000, {
      GRADLE_USER_HOME: GRADLE_HOME_DIR.replace(/\\/g, '/'),
    }); // 25 min — first build downloads Gradle + deps
    log('Gradle build complete');

    // Locate artifact
    let artifactRelPath: string;
    let artifactExt: string;
    if (buildType === BuildType.AAB) {
      artifactRelPath = path.join('android', 'app', 'build', 'outputs', 'bundle', 'release', 'app-release.aab');
      artifactExt = '.aab';
    } else if (buildType === BuildType.RELEASE) {
      artifactRelPath = path.join('android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
      artifactExt = '.apk';
    } else {
      artifactRelPath = path.join('android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
      artifactExt = '.apk';
    }

    const artifactPath = path.join(buildDir, artifactRelPath);
    const exists = await fs.stat(artifactPath).catch(() => null);
    if (!exists) throw new Error(`Artifact not found after build: ${artifactRelPath}`);

    const artifactSize = exists.size;
    const artifactName = `${app.slug}-v${versionName}-${buildType}${artifactExt}`;
    const storageKey = `builds/${appId}/${artifactName}`;

    // Upload via StorageService
    await this.storage.upload(storageKey, artifactPath);
    log(`Artifact saved: ${artifactName} (${(artifactSize / 1024 / 1024).toFixed(2)} MB)`);

    // Upload succeeded → safe to increment versionCode
    // NOTE: versionCode MUST only increment AFTER a confirmed artifact upload.
    // If upload had failed, the exception would skip this block entirely,
    // preventing versionCode gaps that cause Play Store rejections.
    const appUpdateData: Record<string, unknown> = {
      status: 'PUBLISHED',
      needsRebuild: false,
      lastBuiltSchema: app.schema as any,
      lastBuiltAt: new Date(),
    };

    if (buildType === BuildType.RELEASE || buildType === BuildType.AAB) {
      const currentAppConfig = (app.appConfig as Record<string, unknown>) ?? {};
      const currentAndroidConfig = (currentAppConfig.androidConfig as Record<string, unknown>) ?? {};
      const currentVersionCode = (currentAndroidConfig.versionCode as number) ?? 1;

      appUpdateData.appConfig = {
        ...currentAppConfig,
        androidConfig: {
          ...currentAndroidConfig,
          versionCode: currentVersionCode + 1,
        },
      };
      log(`versionCode auto-incremented: ${currentVersionCode} → ${currentVersionCode + 1}`);
    }

    await this.prisma.app.update({
      where: { id: appId },
      data: appUpdateData as any,
    });

    // COMPLETED — update build record AFTER versionCode is persisted
    await this.prisma.appBuild.update({
      where: { id: buildId },
      data: {
        status: 'COMPLETED',
        artifactUrl: storageKey,
        artifactSize,
        logOutput: truncateBuildLog(logs),
        completedAt: new Date(),
      },
    });

    log('Build completed successfully!');

    // Notify owner via email
    await this.notifyBuildResult(app.tenantId, app.name, buildType, true);
  }

  // =============================================
  // iOS Xcode Export
  // =============================================
  private async buildIosExport(
    buildId: string, appId: string, app: any, appConfig: Record<string, unknown>,
    versionName: string, buildDir: string, logs: string[], log: (msg: string) => void,
  ) {
    log('Adding Capacitor iOS platform...');
    await this.exec('npx cap add ios', buildDir);
    log('iOS platform added');

    log('Syncing Capacitor iOS...');
    await this.exec('npx cap sync ios', buildDir);
    log('iOS sync complete');

    // Inject iOS permissions
    const iosPermissions = (appConfig.iosPermissions as Record<string, string>) ?? {};
    await this.injectIosPermissions(buildDir, iosPermissions, app.name);
    log('iOS permissions injected');

    // ZIP the ios/ directory
    const zipName = `${app.slug}-v${versionName}-xcode.zip`;
    const zipPath = path.join(buildDir, zipName);

    log('Creating Xcode project ZIP...');
    const archiver = require('archiver');
    await new Promise<void>((resolve, reject) => {
      const output = fsSync.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });
      output.on('close', resolve);
      archive.on('error', reject);
      archive.pipe(output);
      archive.directory(path.join(buildDir, 'ios'), 'ios');
      archive.finalize();
    });

    const artifactSize = (await fs.stat(zipPath)).size;
    const storageKey = `builds/${appId}/${zipName}`;
    await this.storage.upload(storageKey, zipPath);
    log(`Xcode project saved: ${zipName} (${(artifactSize / 1024 / 1024).toFixed(2)} MB)`);

    await this.prisma.appBuild.update({
      where: { id: buildId },
      data: {
        status: 'COMPLETED',
        artifactUrl: storageKey,
        artifactSize,
        logOutput: truncateBuildLog(logs),
        completedAt: new Date(),
      },
    });

    await this.prisma.app.update({
      where: { id: appId },
      data: { status: 'DRAFT' },
    });

    log('iOS export completed successfully!');

    // Notify owner via email
    await this.notifyBuildResult(app.tenantId, app.name, 'ios-export', true);
  }

  // =============================================
  // Helper methods
  // =============================================

  private async updateStatus(buildId: string, status: string) {
    await this.prisma.appBuild.update({
      where: { id: buildId },
      data: { status: status as any, startedAt: status === 'PREPARING' ? new Date() : undefined },
    });
  }

  private exec(cmd: string, cwd: string, timeout = 300000, extraEnv?: Record<string, string>): Promise<string> {
    return new Promise((resolve, reject) => {
      const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/sh';
      const shellArgs = process.platform === 'win32' ? ['/c', cmd] : ['-c', cmd];

      const child = spawn(shell, shellArgs, {
        cwd,
        env: { ...process.env, CI: 'true', ...extraEnv },
        stdio: 'pipe',
      });

      let stdout = '';
      let stderr = '';
      child.stdout?.on('data', (data) => { stdout += data.toString(); });
      child.stderr?.on('data', (data) => { stderr += data.toString(); });

      const timer = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`Command timed out after ${timeout}ms: ${cmd}`));
      }, timeout);

      child.on('close', (code) => {
        clearTimeout(timer);
        if (code !== 0) {
          reject(new Error(`Command failed (exit ${code}): ${cmd}\n${stderr.slice(-2000)}`));
        } else {
          resolve(stdout);
        }
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  private async copyDir(src: string, dest: string, exclude: Set<string>) {
    const entries = await fs.readdir(src, { withFileTypes: true });
    await fs.mkdir(dest, { recursive: true });

    const BATCH = 50;
    const filtered = entries.filter((e) => !exclude.has(e.name));
    for (let i = 0; i < filtered.length; i += BATCH) {
      await Promise.all(filtered.slice(i, i + BATCH).map(async (entry) => {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
          await this.copyDir(srcPath, destPath, exclude);
        } else {
          await fs.copyFile(srcPath, destPath);
        }
      }));
    }
  }

  private findAndroidSdk(): string | null {
    const envSdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
    if (envSdk) return envSdk;

    const candidates = process.platform === 'win32'
      ? [
          path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk'),
          path.join(process.env.USERPROFILE || '', 'AppData', 'Local', 'Android', 'Sdk'),
        ]
      : [
          path.join(process.env.HOME || '', 'Android', 'Sdk'),
          path.join(process.env.HOME || '', 'Library', 'Android', 'sdk'),
        ];

    for (const candidate of candidates) {
      try {
        const stat = fsSync.statSync(candidate);
        if (stat.isDirectory()) return candidate;
      } catch {
        // Not found
      }
    }
    return null;
  }

  private async injectAndroidPermissions(buildDir: string, permissions: Record<string, boolean>) {
    const manifestPath = path.join(buildDir, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
    try {
      let content = await fs.readFile(manifestPath, 'utf-8');
      const permLines = Object.entries(permissions)
        .filter(([, enabled]) => enabled)
        .map(([perm]) => `    <uses-permission android:name="android.permission.${perm}" />`)
        .join('\n');
      content = content.replace('<application', `${permLines}\n\n    <application`);
      await fs.writeFile(manifestPath, content);
    } catch {
      this.logger.warn('Could not inject Android permissions');
    }
  }

  private async injectVersionInfo(buildDir: string, versionCode: number, versionName: string) {
    const gradlePath = path.join(buildDir, 'android', 'app', 'build.gradle');
    try {
      let gradle = await fs.readFile(gradlePath, 'utf-8');
      gradle = gradle.replace(/versionCode \d+/, `versionCode ${versionCode}`);
      gradle = gradle.replace(/versionName "[^"]*"/, `versionName "${versionName}"`);
      await fs.writeFile(gradlePath, gradle);
    } catch {
      this.logger.warn('Could not inject version info');
    }
  }

  private async injectSigningConfig(
    buildDir: string, storePass: string, keyPass: string, keyAlias: string,
  ) {
    const gradlePath = path.join(buildDir, 'android', 'app', 'build.gradle');
    let gradle = await fs.readFile(gradlePath, 'utf-8');

    // Insert signingConfigs block inside android {}
    const signingBlock = `
    signingConfigs {
        release {
            storeFile file('release-keystore.jks')
            storePassword '${storePass.replace(/'/g, "\\'")}'
            keyAlias '${keyAlias}'
            keyPassword '${keyPass.replace(/'/g, "\\'")}'
        }
    }
`;
    gradle = gradle.replace(
      /android\s*\{/,
      `android {\n${signingBlock}`,
    );

    // Update release buildType to use signing config
    gradle = gradle.replace(
      /buildTypes\s*\{[\s\S]*?release\s*\{/,
      (match) => match.replace(
        /release\s*\{/,
        'release {\n            signingConfig signingConfigs.release',
      ),
    );

    await fs.writeFile(gradlePath, gradle);
  }

  private async injectFirebaseConfig(buildDir: string) {
    try {
      // 1. Project-level build.gradle — add google-services classpath
      const projectGradlePath = path.join(buildDir, 'android', 'build.gradle');
      let projectGradle = await fs.readFile(projectGradlePath, 'utf-8');
      if (!projectGradle.includes('com.google.gms:google-services')) {
        projectGradle = projectGradle.replace(
          /dependencies\s*\{/,
          `dependencies {\n        classpath 'com.google.gms:google-services:4.4.2'`,
        );
        await fs.writeFile(projectGradlePath, projectGradle);
      }

      // 2. App-level build.gradle — apply google-services plugin
      const appGradlePath = path.join(buildDir, 'android', 'app', 'build.gradle');
      let appGradle = await fs.readFile(appGradlePath, 'utf-8');
      if (!appGradle.includes("com.google.gms.google-services")) {
        appGradle += "\napply plugin: 'com.google.gms.google-services'\n";
        await fs.writeFile(appGradlePath, appGradle);
      }
    } catch (err) {
      this.logger.warn(`Could not inject Firebase config: ${(err as Error).message}`);
    }
  }

  private async injectIosPermissions(
    buildDir: string,
    permissions: Record<string, string>,
    appName: string,
  ) {
    const plistPath = path.join(buildDir, 'ios', 'App', 'App', 'Info.plist');
    try {
      let content = await fs.readFile(plistPath, 'utf-8');
      const entries = Object.entries(permissions)
        .filter(([, desc]) => desc && desc.trim())
        .map(([key, desc]) => {
          const expanded = desc.replace(/#APP_NAME/g, appName);
          return `\t<key>${key}</key>\n\t<string>${expanded}</string>`;
        })
        .join('\n');

      if (entries) {
        content = content.replace('</dict>', `${entries}\n</dict>`);
        await fs.writeFile(plistPath, content);
      }
    } catch {
      this.logger.warn('Could not inject iOS permissions');
    }
  }

  private async injectAndroidIcon(
    buildDir: string,
    iconUrl: string,
    log: (msg: string) => void,
  ) {
    try {
      log('Injecting custom app icon...');

      // Resolve relative or localhost URLs to a fetchable absolute URL
      let resolvedIconUrl = iconUrl;
      if (iconUrl.startsWith('/')) {
        const publicUrl = process.env.PUBLIC_API_URL || 'http://localhost:3000';
        resolvedIconUrl = `${publicUrl}${iconUrl}`;
      } else if (/localhost|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+/.test(iconUrl)) {
        // Resolve localhost or local network IPs to PUBLIC_API_URL
        try {
          const parsed = new URL(iconUrl);
          const publicUrl = process.env.PUBLIC_API_URL || 'http://localhost:3000';
          resolvedIconUrl = `${publicUrl}${parsed.pathname}`;
        } catch {
          // keep original
        }
      }
      log(`Downloading icon from: ${resolvedIconUrl}`);

      // Download the icon image
      const response = await fetch(resolvedIconUrl);
      if (!response.ok) {
        log(`Warning: Could not download icon from ${iconUrl} (${response.status})`);
        return;
      }
      const buffer = Buffer.from(await response.arrayBuffer());

      // Android mipmap density sizes (square icons)
      const densities: Array<{ folder: string; size: number }> = [
        { folder: 'mipmap-mdpi', size: 48 },
        { folder: 'mipmap-hdpi', size: 72 },
        { folder: 'mipmap-xhdpi', size: 96 },
        { folder: 'mipmap-xxhdpi', size: 144 },
        { folder: 'mipmap-xxxhdpi', size: 192 },
      ];

      const resDir = path.join(buildDir, 'android', 'app', 'src', 'main', 'res');

      // Try to use sharp for resizing, fall back to copying the raw icon
      let sharp: any;
      try {
        sharp = require('sharp');
      } catch {
        // sharp not available — copy the original icon to all densities as-is
        log('sharp not available — using original icon without resizing');
        for (const { folder } of densities) {
          const dir = path.join(resDir, folder);
          await fs.mkdir(dir, { recursive: true });
          await fs.writeFile(path.join(dir, 'ic_launcher.png'), buffer);
          await fs.writeFile(path.join(dir, 'ic_launcher_round.png'), buffer);
        }
        // Also remove the adaptive icon XML if it exists (it references foreground/background layers we don't have)
        await this.removeAdaptiveIconXml(resDir);
        log('App icon injected (all densities, no resize)');
        return;
      }

      // Resize for each density
      for (const { folder, size } of densities) {
        const dir = path.join(resDir, folder);
        await fs.mkdir(dir, { recursive: true });
        const resized = await sharp(buffer).resize(size, size).png().toBuffer();
        await fs.writeFile(path.join(dir, 'ic_launcher.png'), resized);
        await fs.writeFile(path.join(dir, 'ic_launcher_round.png'), resized);
      }

      await this.removeAdaptiveIconXml(resDir);
      log('App icon injected (resized for all densities)');
    } catch (err) {
      log(`Warning: Icon injection failed: ${(err as Error).message}`);
    }
  }

  private async removeAdaptiveIconXml(resDir: string) {
    // Remove adaptive icon XML files that reference foreground/background layers
    // so Android falls back to our simple ic_launcher.png
    const xmlFiles = [
      path.join(resDir, 'mipmap-anydpi-v26', 'ic_launcher.xml'),
      path.join(resDir, 'mipmap-anydpi-v26', 'ic_launcher_round.xml'),
    ];
    for (const f of xmlFiles) {
      await fs.rm(f, { force: true }).catch(() => {});
    }
  }

  private async notifyBuildResult(
    tenantId: string,
    appName: string,
    buildType: string,
    success: boolean,
    errorMessage?: string,
  ) {
    try {
      // Find the tenant owner (first CLIENT user of the tenant)
      const user = await this.prisma.user.findFirst({
        where: { tenantId, role: 'CLIENT' },
        select: { email: true, firstName: true },
      });
      if (!user) return;

      await this.emailService.sendBuildCompletedEmail(
        user.email,
        user.firstName || '',
        appName,
        buildType,
        success,
        errorMessage,
      );
    } catch (err) {
      this.logger.warn(`Could not send build notification email: ${(err as Error).message}`);
    }
  }

  // ─── PWA Build ───────────────────────────────────────

  private async buildPwa(
    buildId: string,
    appId: string,
    app: any,
    appConfig: any,
    buildDir: string,
    logs: string[],
    log: (msg: string) => void,
  ) {
    const slug = app.slug;
    const designTokens = (app.designTokens as Record<string, any>) ?? {};
    const primaryColor = designTokens?.colors?.primary?.main || '#4F46E5';
    const appName = app.name;

    // 1. npm ci (with persistent cache)
    await fs.mkdir(NPM_CACHE_DIR, { recursive: true });
    log('Installing dependencies (npm ci with persistent cache)...');
    await this.exec('npm ci --prefer-offline --no-audit --no-fund', buildDir, 600000, {
      NPM_CONFIG_CACHE: NPM_CACHE_DIR,
    });
    log('Dependencies installed');

    // 2. Vite build with PWA platform and base path
    log('Building PWA web assets...');
    await this.exec(`npx vite build --base=/pwa/${slug}/`, buildDir, 600000, {
      VITE_PLATFORM: 'pwa',
    });
    log('PWA web assets built');

    const distDir = path.join(buildDir, 'dist');

    // 3. Generate app-manifest.json (runtime needs this for schema + tokens + apiUrl)
    log('Generating app-manifest.json...');
    const apiUrl = process.env.PUBLIC_API_URL || 'http://localhost:3000';
    const appManifest = {
      appId: app.id,
      appName: app.name,
      apiUrl,
      schema: app.schema ?? [],
      designTokens: app.designTokens ?? {},
      appConfig: app.appConfig ?? {},
    };
    await fs.writeFile(path.join(distDir, 'app-manifest.json'), JSON.stringify(appManifest));
    log('app-manifest.json generated');

    // 4. Generate PWA icons
    await this.generatePwaIcons(appConfig, distDir, log);

    // 5. Generate web app manifest
    log('Generating manifest.webmanifest...');
    const webManifest = {
      name: appName,
      short_name: appName.length > 12 ? appName.slice(0, 12) : appName,
      start_url: `/pwa/${slug}/`,
      scope: `/pwa/${slug}/`,
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: primaryColor,
      icons: [
        { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    };
    await fs.writeFile(path.join(distDir, 'manifest.webmanifest'), JSON.stringify(webManifest, null, 2));

    // 6. Generate service worker (cache version = timestamp for invalidation on redeploy)
    log('Generating service worker...');
    const swContent = this.generateServiceWorker(slug, Date.now());
    await fs.writeFile(path.join(distDir, 'sw.js'), swContent);

    // 7. Inject manifest + SW registration into index.html
    const indexPath = path.join(distDir, 'index.html');
    let html = await fs.readFile(indexPath, 'utf-8');
    const pwaHead = `<link rel="manifest" href="/pwa/${slug}/manifest.webmanifest">\n    <meta name="theme-color" content="${primaryColor}">`;
    const swScript = `<script>if('serviceWorker' in navigator){navigator.serviceWorker.register('/pwa/${slug}/sw.js',{scope:'/pwa/${slug}/'})}</script>`;
    html = html.replace('</head>', `    ${pwaHead}\n  </head>`);
    html = html.replace('</body>', `  ${swScript}\n  </body>`);
    await fs.writeFile(indexPath, html);

    // 8. Deploy: copy dist/ to public/pwa/{slug}/
    log('Deploying PWA files...');
    const pwaDir = path.join(process.cwd(), 'public', 'pwa', slug);
    await fs.rm(pwaDir, { recursive: true, force: true });
    await this.copyDir(distDir, pwaDir, new Set());
    log(`PWA deployed to /pwa/${slug}/`);

    // 9. Update database
    const pwaUrl = `${apiUrl}/pwa/${slug}/`;
    await this.prisma.app.update({
      where: { id: appId },
      data: { pwaEnabled: true, pwaUrl, pwaLastDeployedAt: new Date() },
    });

    // 10. Mark build as completed
    await this.prisma.appBuild.update({
      where: { id: buildId },
      data: {
        status: 'COMPLETED',
        logOutput: truncateBuildLog(logs),
        artifactUrl: pwaUrl,
      },
    });
    log('PWA build completed: ' + pwaUrl);
  }

  private async generatePwaIcons(appConfig: any, distDir: string, log: (msg: string) => void) {
    const iconsDir = path.join(distDir, 'icons');
    await fs.mkdir(iconsDir, { recursive: true });
    const iconUrl = appConfig?.icon?.url;

    if (iconUrl) {
      let resolvedUrl = iconUrl;
      if (iconUrl.startsWith('/')) {
        resolvedUrl = `${process.env.PUBLIC_API_URL || 'http://localhost:3000'}${iconUrl}`;
      } else if (/localhost|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+/.test(iconUrl)) {
        try { resolvedUrl = `${process.env.PUBLIC_API_URL || 'http://localhost:3000'}${new URL(iconUrl).pathname}`; } catch {}
      }

      try {
        const response = await fetch(resolvedUrl);
        if (response.ok) {
          const buffer = Buffer.from(await response.arrayBuffer());
          try {
            const sharp = (await import('sharp')).default;
            await sharp(buffer).resize(192, 192).png().toFile(path.join(iconsDir, 'icon-192.png'));
            await sharp(buffer).resize(512, 512).png().toFile(path.join(iconsDir, 'icon-512.png'));
            log('PWA icons generated from app icon');
            return;
          } catch {
            await fs.writeFile(path.join(iconsDir, 'icon-192.png'), buffer);
            await fs.writeFile(path.join(iconsDir, 'icon-512.png'), buffer);
            log('PWA icons copied (sharp unavailable)');
            return;
          }
        }
      } catch (err) {
        log(`Warning: Could not download icon for PWA: ${err}`);
      }
    }

    // Fallback: placeholder SVG
    log('Using placeholder PWA icons');
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" fill="#4F46E5" rx="64"/><text x="256" y="300" text-anchor="middle" fill="white" font-size="240" font-family="Arial,sans-serif" font-weight="bold">A</text></svg>',
    );
    try {
      const sharp = (await import('sharp')).default;
      await sharp(svg).resize(192, 192).png().toFile(path.join(iconsDir, 'icon-192.png'));
      await sharp(svg).resize(512, 512).png().toFile(path.join(iconsDir, 'icon-512.png'));
    } catch {
      await fs.writeFile(path.join(iconsDir, 'icon-192.svg'), svg);
      await fs.writeFile(path.join(iconsDir, 'icon-512.svg'), svg);
    }
  }

  private generateServiceWorker(slug: string, cacheVersion: number): string {
    return `const CACHE_NAME = 'pwa-${slug}-${cacheVersion}';
const SCOPE = '/pwa/${slug}/';

self.addEventListener('install', () => { self.skipWaiting(); });

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.pathname.startsWith('/apps/') || url.pathname.startsWith('/auth/') || url.pathname.startsWith('/upload/')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
  if (url.pathname.startsWith(SCOPE)) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        const fetched = fetch(e.request).then(resp => {
          if (resp.ok) { const clone = resp.clone(); caches.open(CACHE_NAME).then(c => c.put(e.request, clone)); }
          return resp;
        }).catch(() => cached);
        return cached || fetched;
      })
    );
  }
});
`;
  }
}
