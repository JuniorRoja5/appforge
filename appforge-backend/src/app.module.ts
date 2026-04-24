import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { TenantsModule } from './tenants/tenants.module';
import { AppsModule } from './apps/apps.module';
import { UploadModule } from './upload/upload.module';
import { NewsModule } from './news/news.module';
import { ContactModule } from './contact/contact.module';
import { GalleryModule } from './gallery/gallery.module';
import { EventsModule } from './events/events.module';
import { MenuModule } from './menu/menu.module';
import { CouponsModule } from './coupons/coupons.module';
import { CatalogModule } from './catalog/catalog.module';
import { PlatformModule } from './platform/platform.module';
import { BookingModule } from './booking/booking.module';
import { BuildModule } from './build/build.module';
import { StorageModule } from './storage/storage.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { AdminModule } from './admin/admin.module';
import { StripeModule } from './stripe/stripe.module';
import { PushModule } from './push/push.module';
import { AppUsersModule } from './app-users/app-users.module';
import { SocialWallModule } from './social-wall/social-wall.module';
import { FanWallModule } from './fan-wall/fan-wall.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { LoyaltyModule } from './loyalty/loyalty.module';
import { OrdersModule } from './orders/orders.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule, 
    UsersModule, 
    PrismaModule, 
    TenantsModule, 
    AppsModule,
    UploadModule,
    NewsModule,
    ContactModule,
    GalleryModule,
    EventsModule,
    MenuModule,
    CouponsModule,
    CatalogModule,
    PlatformModule,
    BookingModule,
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
    }),
    BuildModule,
    StorageModule,
    SubscriptionModule,
    AdminModule,
    StripeModule,
    PushModule,
    AppUsersModule,
    SocialWallModule,
    FanWallModule,
    AnalyticsModule,
    LoyaltyModule,
    OrdersModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    ServeStaticModule.forRoot(
      {
        rootPath: join(process.cwd(), 'uploads'),
        serveRoot: '/uploads',
      },
      {
        rootPath: join(process.cwd(), 'public', 'pwa'),
        serveRoot: '/pwa',
        serveStaticOptions: {
          index: false,
          fallthrough: true,
        },
      },
    )
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
