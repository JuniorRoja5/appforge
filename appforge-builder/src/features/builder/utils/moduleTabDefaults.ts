/**
 * Phase 2.4b — defaults for navigation tab metadata when adding a
 * module to a brand-new section. Used by both:
 *   - BuilderLayout's addModuleFromPalette helper (drag-from-palette
 *     + the "+" button path, unified).
 *
 * Before 2.4b there were two duplicate copies of these maps —
 * one in BuilderLayout (drag flow) and one in LeftSidebar (button
 * "+" flow added in 2.1c). The flows themselves were duplicates of
 * each other; 2.4b consolidates both into BuilderLayout and moves
 * the maps here so only the consolidated path imports them.
 *
 * The fallback when a module is NOT in the maps: `moduleDef.name`
 * for the label, `'circle'` for the icon — handled at the call
 * site, not here.
 *
 * Icon keys must match the registered names in `LucideIconByName.tsx`
 * (the ICON_MAP). Adding a new module that needs a Spanish-friendly
 * tab name or a specific icon requires extending these two maps;
 * adding without extending falls back to `name + 'circle'`, which
 * works but loses the bespoke labeling.
 */

export const MODULE_TAB_LABELS: Record<string, string> = {
  news_feed: 'Noticias',
  photo_gallery: 'Galería',
  events: 'Eventos',
  contact: 'Contacto',
  menu_restaurant: 'Carta',
  discount_coupon: 'Cupones',
  catalog: 'Catálogo',
  booking: 'Reservas',
  social_wall: 'Social',
  fan_wall: 'Fan Wall',
  push_notification: 'Avisos',
  user_profile: 'Perfil',
  links: 'Enlaces',
  pdf_reader: 'PDF',
  video: 'Videos',
  loyalty_card: 'Fidelidad',
  testimonials: 'Testimonios',
  hero_profile: 'Hero',
  custom_page: 'Página',
  text_module: 'Texto',
  image_module: 'Imagen',
  button_module: 'Botón',
};

export const MODULE_TAB_ICONS: Record<string, string> = {
  news_feed: 'book-open',
  photo_gallery: 'camera',
  events: 'calendar',
  contact: 'phone',
  menu_restaurant: 'utensils',
  discount_coupon: 'tag',
  catalog: 'shopping-bag',
  booking: 'clock',
  social_wall: 'message-circle',
  fan_wall: 'heart',
  push_notification: 'bell',
  user_profile: 'user',
  links: 'link',
  pdf_reader: 'file-text',
  video: 'camera',
  loyalty_card: 'star',
  testimonials: 'message-circle',
  hero_profile: 'user',
  custom_page: 'file-text',
  text_module: 'file-text',
  image_module: 'image',
  button_module: 'circle',
};
