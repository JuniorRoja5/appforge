import type { NicheTemplate } from '../types';

export const cafeteriaTemplate: NicheTemplate = {
  id: 'cafeteria',
  name: 'BrewHouse',
  tagline: 'Cada taza cuenta una historia',
  description:
    'Plantilla premium para cafeterías de especialidad, bakeries y coffee shops. Carta de bebidas y comida, galería de ambiente, cupones de fidelidad y contacto.',
  category: 'food',
  preview_emoji: '☕',
  target_audience:
    'Cafeterías de especialidad, coffee shops, bakeries, teterías, brunch spots, establecimientos de café artesano',

  design_tokens: {
    colors: {
      primary: {
        main: '#5D3A1A',
        dark: '#3E2510',
        light: '#8B6342',
      },
      secondary: {
        main: '#C8A951',
        dark: '#A68B35',
        light: '#E0CB82',
      },
      accent: {
        main: '#C8A951',
        dark: '#A68B35',
        light: '#E0CB82',
      },
      surface: {
        background: '#FDF5E6',
        card: '#FFFFFF',
        variant: '#F5EBDA',
      },
      text: {
        primary: '#2C1A08',
        secondary: '#7A6652',
        on_primary: '#FDF5E6',
      },
      feedback: {
        success: '#5E8C61',
        warning: '#D4A03C',
        error: '#C0392B',
      },
      navigation: {
        background: '#5D3A1A',
        active: '#C8A951',
        inactive: '#A89080',
        indicator: '#C8A951',
      },
      extras: {
        divider: '#E6D9C6',
        overlay: 'rgba(44, 26, 8, 0.55)',
        shimmer_base: '#F0E4D1',
        shimmer_highlight: '#FDF5E6',
      },
    },

    typography: {
      families: {
        display: 'Lora',
        heading: 'Lora',
        body: 'Raleway',
        mono: 'Fira Code',
      },
      scale: {
        xs: '0.625rem',
        sm: '0.75rem',
        base: '0.875rem',
        md: '1rem',
        lg: '1.125rem',
        xl: '1.375rem',
        xxl: '1.75rem',
        xxxl: '2.375rem',
      },
      weight: {
        regular: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
        extrabold: '800',
      },
      line_height: {
        tight: '1.2',
        normal: '1.55',
        relaxed: '1.75',
      },
      letter_spacing: {
        tight: '-0.01em',
        normal: '0em',
        wide: '0.03em',
        wider: '0.06em',
      },
    },

    shape: {
      radius: {
        none: '0px',
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '14px',
        xl: '22px',
        full: '9999px',
      },
      components: {
        card: '14px',
        button: '14px',
        input: '10px',
        badge: '9999px',
        image: '14px',
      },
      shadow: {
        sm: '0 1px 4px 0 var(--shadow-color)',
        md: '0 4px 14px -3px var(--shadow-color), 0 2px 6px -2px var(--shadow-color)',
        lg: '0 8px 24px -4px var(--shadow-color), 0 4px 10px -4px var(--shadow-color)',
      },
      shadow_color: 'rgba(93, 58, 26, 0.10)',
    },

    spacing: {
      screen_padding_h: '20px',
      screen_padding_v: '24px',
      card_padding: '18px',
      section_gap: '30px',
      item_gap: '14px',
      icon_size: {
        sm: '18px',
        md: '24px',
        lg: '32px',
      },
    },

    navigation: {
      style: 'bottom_tabs',
      tab_count: 4,
      show_labels: true,
      label_size: '0.625rem',
      icon_style: 'filled',
      active_indicator: 'dot',
    },

    imagery: {
      hero_aspect_ratio: '3:2',
      card_image_style: 'cover',
      placeholder_style: 'gradient',
      overlay_style: 'gradient_dark',
      icon_theme: 'rounded',
    },
  },

  default_modules: [
    {
      module_id: 'hero_profile',
      order: 0,
      tab_position: 0,
      tab_label: 'Inicio',
      tab_icon: 'home',
      is_home: true,
      default_config: {
        coverImageUrl: '',
        profileImageUrl: '',
        name: 'Café Aroma',
        subtitle: 'Specialty Coffee & Bakery',
        description:
          'Cafetería de especialidad con granos seleccionados de origen, repostería artesanal y ambiente acogedor para trabajar o relajarte.',
        quickLinks: [
          { id: '1', type: 'phone', value: '+34 910 111 222' },
          { id: '2', type: 'instagram', value: 'cafearoma' },
          { id: '3', type: 'whatsapp', value: '+34610111222' },
        ],
        layout: 'overlap',
        coverHeight: 'large',
      },
    },
    {
      module_id: 'menu_restaurant',
      order: 1,
      tab_position: 1,
      tab_label: 'Carta',
      tab_icon: 'coffee',
      is_home: false,
      default_config: {
        layout: 'accordion',
        showImages: true,
        showPrices: true,
        showAllergens: true,
        showDescription: true,
        currency: '€',
      },
    },
    {
      module_id: 'photo_gallery',
      order: 2,
      tab_position: 2,
      tab_label: 'Galería',
      tab_icon: 'camera',
      is_home: false,
      default_config: {
        columns: 2,
        gap: 4,
        showTitles: true,
        enableLightbox: true,
      },
    },
    {
      module_id: 'testimonials',
      order: 3,
      tab_position: 3,
      tab_label: 'Opiniones',
      tab_icon: 'message-circle',
      is_home: false,
      default_config: {
        title: 'Lo que dicen nuestros clientes',
        testimonials: [
          {
            id: '1',
            text: 'El mejor café de la ciudad, sin duda. Los croissants recién hechos son una delicia.',
            authorName: 'Raúl Ortega',
            authorRole: 'Cliente diario',
            authorImageUrl: '',
            rating: 5,
          },
          {
            id: '2',
            text: 'Mi lugar favorito para trabajar con el portátil. WiFi rápido y ambiente perfecto.',
            authorName: 'Nuria Blanco',
            authorRole: 'Freelancer',
            authorImageUrl: '',
            rating: 5,
          },
          {
            id: '3',
            text: 'El brunch del domingo es espectacular. Reserva obligatoria porque se llena.',
            authorName: 'Marcos Delgado',
            authorRole: 'Foodie local',
            authorImageUrl: '',
            rating: 4,
          },
        ],
        showRating: true,
        showImage: true,
        layout: 'carousel',
      },
    },
    {
      module_id: 'discount_coupon',
      order: 4,
      tab_position: 4,
      tab_label: 'Ofertas',
      tab_icon: 'ticket',
      is_home: false,
      default_config: {
        layout: 'cards',
        showExpiry: true,
        showConditions: true,
        showUsageCount: true,
      },
    },
    {
      module_id: 'contact',
      order: 5,
      tab_position: 5,
      tab_label: 'Contacto',
      tab_icon: 'mail',
      is_home: false,
      default_config: {
        formTitle: 'Contacto',
        submitButtonText: 'Enviar',
        successMessage: '¡Gracias por tu mensaje!',
        fields: [
          { id: '1', type: 'text', label: 'Nombre', placeholder: 'Tu nombre', required: true },
          { id: '2', type: 'email', label: 'Email', placeholder: 'tu@email.com', required: true },
          {
            id: '3',
            type: 'textarea',
            label: 'Mensaje',
            placeholder: 'Tu mensaje...',
            required: true,
          },
        ],
        enableHoneypot: true,
        enableCaptcha: false,
      },
    },
  ],

  screens: [
    {
      name: 'Inicio (Home)',
      module_id: 'hero_profile',
      layout_description:
        'Perfil hero con imagen de portada grande, foto de perfil superpuesta, nombre del café, subtítulo y descripción. Quick links a teléfono, Instagram y WhatsApp.',
      key_ui_elements: [
        'Cover image a ancho completo con altura grande',
        'Foto de perfil circular superpuesta sobre el cover',
        'Nombre y subtítulo centrados en Lora serif',
        'Quick links con iconos de teléfono, Instagram y WhatsApp',
      ],
    },
    {
      name: 'Carta',
      module_id: 'menu_restaurant',
      layout_description:
        'Menú en secciones accordion colapsables con imágenes, precios, alérgenos y descripciones. Moneda en euros.',
      key_ui_elements: [
        'Secciones accordion con nombre de categoría en Lora serif',
        'Ítems con foto, nombre, descripción y precio en euros',
        'Indicadores de alérgenos junto a cada ítem',
        'Badge dorado para ítems destacados o nuevos',
      ],
    },
    {
      name: 'Galería',
      module_id: 'photo_gallery',
      layout_description:
        'Grid de fotos a 2 columnas con gap de 4, títulos visibles y lightbox para ampliar. Tonos cálidos y esquinas redondeadas.',
      key_ui_elements: [
        'Grid de 2 columnas con esquinas redondeadas (14px)',
        'Títulos visibles debajo de cada imagen',
        'Lightbox interactivo al pulsar una foto',
        'Sombras con tono marrón cálido',
      ],
    },
    {
      name: 'Opiniones',
      module_id: 'testimonials',
      layout_description:
        'Carrusel de testimonios con foto de autor, nombre, rol, texto y estrellas de valoración. Diseño cálido acorde a la estética cafetería.',
      key_ui_elements: [
        'Carrusel horizontal deslizable de cards de testimonio',
        'Foto circular del autor con nombre y rol',
        'Texto del testimonio en Raleway',
        'Estrellas de rating doradas (acento secundario)',
      ],
    },
    {
      name: 'Ofertas',
      module_id: 'discount_coupon',
      layout_description:
        'Cards de cupones con aspecto ticket, mostrando expiración, condiciones y contador de usos.',
      key_ui_elements: [
        'Cards tipo ticket con borde perforado lateral',
        'Título de la oferta en Lora bold',
        'Badge de expiración y condiciones visibles',
        'Contador de usos del cupón',
      ],
    },
    {
      name: 'Contacto',
      module_id: 'contact',
      layout_description:
        'Formulario de contacto con campos de nombre, email y mensaje. Protección honeypot activada, botón de envío y mensaje de éxito.',
      key_ui_elements: [
        'Título "Contacto" en Lora serif',
        'Campos de texto con placeholders descriptivos',
        'Botón "Enviar" en color primario',
        'Mensaje de éxito tras el envío',
      ],
    },
  ],

  onboarding_hint:
    'Comienza personalizando tu carta en la sección "Carta" con tus bebidas y platos reales. Sube fotos de tu local a la galería para crear ambiente.',
  suggested_app_name: 'BrewHouse Coffee',
  suggested_icon_concept:
    'Taza de café estilizada con vapor en forma de corazón, tonos mocha y dorado, estética artesanal y premium',
};
