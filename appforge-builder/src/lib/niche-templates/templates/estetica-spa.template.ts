import type { NicheTemplate } from '../types';

export const esteticaSpaTemplate: NicheTemplate = {
  id: 'estetica_spa',
  name: 'Serenity',
  tagline: 'Tu momento de paz y belleza interior',
  description:
    'Plantilla premium para centros de estética, spas y wellness. Estética crema-lavanda con tipografía elegante que transmite calma y lujo. Incluye catálogo de tratamientos, galería de instalaciones, cupones de experiencias y reserva de citas.',
  category: 'beauty',
  preview_emoji: '🧖‍♀️',
  target_audience:
    'Spas, centros de estética, salones de wellness, terapeutas holísticos y centros de masajes que buscan transmitir una imagen premium y serena.',

  design_tokens: {
    colors: {
      primary: {
        main: '#A78BBA',
        dark: '#7E6191',
        light: '#C5B0D5',
      },
      secondary: {
        main: '#F5EDE3',
        dark: '#E4D5C5',
        light: '#FBF7F2',
      },
      accent: {
        main: '#C9917A',
        dark: '#A87060',
        light: '#DDBAA8',
      },
      surface: {
        background: '#FBF7F2',
        card: '#FFFFFF',
        variant: '#F5EDE3',
      },
      text: {
        primary: '#2D2233',
        secondary: '#6E5F7A',
        on_primary: '#FFFFFF',
      },
      feedback: {
        success: '#7BAF8E',
        warning: '#D4A96A',
        error: '#C97272',
      },
      navigation: {
        background: '#FFFFFF',
        active: '#A78BBA',
        inactive: '#C0B0CC',
        indicator: '#C9917A',
      },
      extras: {
        divider: 'rgba(167, 139, 186, 0.14)',
        overlay: 'rgba(45, 34, 51, 0.40)',
        shimmer_base: '#F5EDE3',
        shimmer_highlight: '#FFFFFF',
      },
    },

    typography: {
      families: {
        display: 'Cormorant Garamond',
        heading: 'Cormorant Garamond',
        body: 'Lato',
        mono: 'JetBrains Mono',
      },
      scale: {
        xs: '0.625rem',
        sm: '0.75rem',
        base: '0.875rem',
        md: '1rem',
        lg: '1.175rem',
        xl: '1.5rem',
        xxl: '2rem',
        xxxl: '2.625rem',
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
        relaxed: '1.8',
      },
      letter_spacing: {
        tight: '-0.01em',
        normal: '0',
        wide: '0.03em',
        wider: '0.08em',
      },
    },

    shape: {
      radius: {
        none: '0',
        xs: '6px',
        sm: '10px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        full: '9999px',
      },
      components: {
        card: '24px',
        button: '24px',
        input: '16px',
        badge: '9999px',
        image: '24px',
      },
      shadow: {
        sm: '0 2px 8px 0',
        md: '0 6px 20px 0',
        lg: '0 12px 40px 0',
      },
      shadow_color: 'rgba(167, 139, 186, 0.12)',
    },

    spacing: {
      screen_padding_h: '24px',
      screen_padding_v: '28px',
      card_padding: '22px',
      section_gap: '32px',
      item_gap: '16px',
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
      icon_style: 'outline',
      active_indicator: 'pill',
    },

    imagery: {
      hero_aspect_ratio: '3:2',
      card_image_style: 'cover',
      placeholder_style: 'gradient',
      overlay_style: 'gradient_bottom',
      icon_theme: 'minimal',
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
        name: 'Zen Estética & Spa',
        subtitle: 'Tu momento de paz y belleza',
        description:
          'Centro de estética y spa con tratamientos faciales, corporales y de relajación. Déjate mimar por nuestro equipo de profesionales.',
        quickLinks: [
          { id: '1', type: 'phone', value: '+34 913 555 444' },
          { id: '2', type: 'instagram', value: 'zenesteticaspa' },
          { id: '3', type: 'whatsapp', value: '+34613555444' },
        ],
        layout: 'overlap',
        coverHeight: 'large',
      },
    },
    {
      module_id: 'catalog',
      order: 1,
      tab_position: 1,
      tab_label: 'Tratamientos',
      tab_icon: 'sparkles',
      is_home: false,
      default_config: {
        layout: 'grid',
        columns: 2,
        showPrices: true,
        showComparePrice: false,
        showTags: true,
        enableCart: false,
        currency: '€',
      },
    },
    {
      module_id: 'booking',
      order: 2,
      tab_position: 2,
      tab_label: 'Reservar',
      tab_icon: 'calendar',
      is_home: false,
      default_config: {
        title: 'Reservar Tratamiento',
        description: 'Elige fecha y hora para tu sesión de bienestar.',
        timeSlots: [
          '09:00',
          '10:00',
          '11:00',
          '12:00',
          '13:00',
          '16:00',
          '17:00',
          '18:00',
          '19:00',
        ],
        slotDuration: 60,
        fields: [
          { id: '1', type: 'text', label: 'Nombre completo', required: true },
          { id: '2', type: 'phone', label: 'Teléfono', required: true },
          {
            id: '3',
            type: 'textarea',
            label: 'Tratamiento deseado',
            required: false,
          },
        ],
        submitButtonText: 'Reservar Sesión',
      },
    },
    {
      module_id: 'photo_gallery',
      order: 3,
      tab_position: null,
      tab_label: 'Galería',
      tab_icon: 'image',
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
      order: 4,
      tab_position: null,
      tab_label: 'Opiniones',
      tab_icon: 'star',
      is_home: false,
      default_config: {
        title: 'Experiencias de nuestras clientas',
        testimonials: [
          {
            id: '1',
            text: 'El masaje relajante fue una experiencia increíble. Salí como nueva. Volveré cada mes.',
            authorName: 'Alicia Campos',
            authorRole: 'Clienta de spa',
            authorImageUrl: '',
            rating: 5,
          },
          {
            id: '2',
            text: 'El tratamiento facial anti-edad ha sido lo mejor que he hecho por mi piel. Resultados visibles.',
            authorName: 'Beatriz Soto',
            authorRole: 'Clienta de estética',
            authorImageUrl: '',
            rating: 5,
          },
          {
            id: '3',
            text: 'Regalé un bono de masajes a mi madre y quedó encantada. El lugar es precioso y muy relajante.',
            authorName: 'Jorge Castillo',
            authorRole: 'Regalo especial',
            authorImageUrl: '',
            rating: 5,
          },
        ],
        showRating: true,
        showImage: true,
        layout: 'carousel',
      },
    },
    {
      module_id: 'discount_coupon',
      order: 5,
      tab_position: 3,
      tab_label: 'Ofertas',
      tab_icon: 'gift',
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
      order: 6,
      tab_position: null,
      tab_label: 'Contacto',
      tab_icon: 'mail',
      is_home: false,
      default_config: {
        formTitle: 'Contacto',
        submitButtonText: 'Enviar',
        successMessage: '¡Gracias! Te contactaremos pronto.',
        fields: [
          {
            id: '1',
            type: 'text',
            label: 'Nombre',
            placeholder: 'Tu nombre',
            required: true,
          },
          {
            id: '2',
            type: 'tel',
            label: 'Teléfono',
            placeholder: '+34 600 000 000',
            required: true,
          },
          {
            id: '3',
            type: 'email',
            label: 'Email',
            placeholder: 'tu@email.com',
            required: false,
          },
          {
            id: '4',
            type: 'textarea',
            label: 'Mensaje',
            placeholder: 'Cuéntanos qué tratamiento te interesa...',
            required: false,
          },
        ],
        enableHoneypot: true,
        enableCaptcha: false,
      },
    },
  ],

  screens: [
    {
      name: 'Inicio — Perfil del Spa',
      module_id: 'hero_profile',
      layout_description:
        'Imagen de portada a pantalla completa (altura large) con layout overlap: foto de perfil circular superpuesta sobre la portada. Nombre del centro en Cormorant Garamond Bold, subtítulo en Lato Regular lavanda, descripción breve y quick links (teléfono, Instagram, WhatsApp) como iconos circulares oro rosa sobre fondo crema.',
      key_ui_elements: [
        'Cover image grande con overlay gradiente lavanda sutil',
        'Foto de perfil circular superpuesta con borde blanco y sombra suave',
        'Nombre en Cormorant Garamond Bold lavanda oscuro centrado',
        'Subtítulo en Lato Regular gris lavanda',
        'Quick links como iconos circulares oro rosa interactivos',
      ],
    },
    {
      name: 'Catálogo de Tratamientos',
      module_id: 'catalog',
      layout_description:
        'Grid a 2 columnas de tarjetas cuadradas (24px radius) con imagen superior, nombre del tratamiento, precio y tags de categoría. Fondo crema suave con sombras etéreas lavanda. Precios visibles en oro rosa.',
      key_ui_elements: [
        'Grid 2 columnas de tarjetas con imagen cover',
        'Nombre del tratamiento en Cormorant Garamond SemiBold',
        'Precio en oro rosa prominente',
        'Tags de categoría como badges lavanda',
        'Fondo crema con sombras suaves lavanda',
      ],
    },
    {
      name: 'Reservar Tratamiento',
      module_id: 'booking',
      layout_description:
        'Pantalla de reserva con título y descripción superior en Cormorant Garamond. Selector de fecha tipo calendario y grid de franjas horarias (slots de 60 min). Formulario con campos de nombre, teléfono y tratamiento deseado. Botón lavanda "Reservar Sesión".',
      key_ui_elements: [
        'Título "Reservar Tratamiento" en Cormorant Garamond SemiBold',
        'Selector de fecha con estilo calendario elegante crema',
        'Grid de time slots como chips seleccionables lavanda claro',
        'Campos de formulario con borde suave y radius 16px',
        'Botón CTA lavanda sólido "Reservar Sesión" con texto blanco',
      ],
    },
    {
      name: 'Galería del Espacio',
      module_id: 'photo_gallery',
      layout_description:
        'Grid a 2 columnas con gap de 4px entre fotos del spa e instalaciones. Bordes ultra redondeados (24px), títulos visibles debajo de cada foto. Lightbox habilitado con overlay lavanda. Transmite calma y lujo.',
      key_ui_elements: [
        'Grid 2 columnas con gap uniforme de 4px',
        'Fotos con bordes extra redondeados (24px)',
        'Títulos descriptivos bajo cada imagen en Lato Regular',
        'Lightbox con fondo overlay lavanda suave',
        'Sombras etéreas largas sobre cada imagen',
      ],
    },
    {
      name: 'Experiencias de Clientas',
      module_id: 'testimonials',
      layout_description:
        'Carrusel horizontal de testimonios con cards blancas y sombra lavanda. Cada card muestra rating de 5 estrellas, texto del testimonio en cursiva, nombre de la autora y su rol. Título de sección en Cormorant Garamond italic.',
      key_ui_elements: [
        'Título "Experiencias de nuestras clientas" en Cormorant Garamond italic',
        'Cards en carrusel con shadow-md lavanda y radius 24px',
        'Rating de estrellas doradas (5/5)',
        'Texto del testimonio en Lato Regular cursiva',
        'Nombre de la autora en Lato SemiBold',
        'Rol en Lato sm lavanda claro',
      ],
    },
    {
      name: 'Ofertas y Cupones',
      module_id: 'discount_coupon',
      layout_description:
        'Tarjetas premium en layout cards con fondo degradado lavanda-crema sutil. Muestra fecha de expiración, condiciones y contador de uso. Tipografía del título en Cormorant Garamond Bold. Sensación de tarjeta regalo exclusiva.',
      key_ui_elements: [
        'Tarjetas con degradado lavanda-a-crema y radius 24px',
        'Borde fino oro rosa sutil',
        'Fecha de expiración en badge lavanda',
        'Condiciones en texto pequeño gris lavanda',
        'Contador de usos con icono minimalista',
      ],
    },
    {
      name: 'Formulario de Contacto',
      module_id: 'contact',
      layout_description:
        'Formulario flotante sobre fondo crema con campos amplios y redondeados (16px). Campos de nombre, teléfono, email y mensaje. Botón lavanda "Enviar" con texto blanco. Protección honeypot habilitada.',
      key_ui_elements: [
        'Título "Contacto" en Cormorant Garamond SemiBold',
        'Campos con placeholders descriptivos y borde lavanda clara',
        'Focus state con borde lavanda sólido',
        'Botón CTA lavanda "Enviar" con texto blanco',
        'Mensaje de éxito en card verde suave',
      ],
    },
  ],

  onboarding_hint:
    'Añade fotos de tus instalaciones a la Galería para transmitir la atmósfera de tu spa. Detalla tus tratamientos con descripciones que inviten a la relajación. ¡Haz que reservar sea irresistible!',
  suggested_app_name: 'Serenity Spa',
  suggested_icon_concept:
    'Flor de loto estilizada en lavanda con un pétalo en oro rosa, sobre fondo crema. Trazo fino y minimalista que evoca calma y elegancia.',
};
