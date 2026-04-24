import type { ModuleDefinition } from './base/module.interface';
import { TextModule } from './custom_page/text.module';
import { ImageModule } from './custom_page/image.module';
import { ButtonModule } from './custom_page/button.module';
import { NewsFeedModule } from './news_feed/news-feed.module';
import { ContactModule } from './contact/contact.module';
import { PhotoGalleryModule } from './photo_gallery/photo-gallery.module';
import { CustomPageModule } from './custom_page/custom-page.module';
import { LinksModule } from './links/links.module';
import { PdfReaderModule } from './pdf_reader/pdf-reader.module';
import { EventsModule } from './events/events.module';
import { MenuRestaurantModule } from './menu_restaurant/menu-restaurant.module';
import { DiscountCouponModule } from './discount_coupon/discount-coupon.module';
import { CatalogModule } from './catalog/catalog.module';
import { HeroProfileModule } from './hero_profile/hero-profile.module';
import { BookingModule } from './booking/booking.module';
import { VideoModule } from './video/video.module';
import { TestimonialsModule } from './testimonials/testimonials.module';
import { LoyaltyCardModule } from './loyalty_card/loyalty-card.module';
import { PushNotificationModule } from './push_notification/push-notification.module';
import { UserProfileModule } from './user_profile/user-profile.module';
import { SocialWallModule } from './social_wall/social-wall.module';
import { FanWallModule } from './fan_wall/fan-wall.module';

// We will add imported modules here
export const moduleRegistry: Record<string, ModuleDefinition<any>> = {};

export const registerModule = (moduleDef: ModuleDefinition<any>) => {
  moduleRegistry[moduleDef.id] = moduleDef;
};

// Register statically for MVP
[TextModule, ImageModule, ButtonModule, NewsFeedModule, ContactModule, PhotoGalleryModule, CustomPageModule, LinksModule, PdfReaderModule, EventsModule, MenuRestaurantModule, DiscountCouponModule, CatalogModule, HeroProfileModule, BookingModule, VideoModule, TestimonialsModule, LoyaltyCardModule, PushNotificationModule, UserProfileModule, SocialWallModule, FanWallModule].forEach(registerModule);

export const getRegistry = () => Object.values(moduleRegistry);
export const getModule = (id: string) => moduleRegistry[id];
