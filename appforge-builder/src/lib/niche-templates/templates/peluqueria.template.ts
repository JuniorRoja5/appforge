import type { NicheTemplate } from '../types';

export const peluqueriaTemplate: NicheTemplate = {
  id: 'peluqueria',
  name: 'GlowUp',
  tagline: 'Tu estilo, tu actitud, tu app',
  description:
    'Plantilla pensada para peluquerías, barberías y salones de belleza. Presenta tus servicios con un catálogo visual, muestra tu trabajo con una galería de fotos, fideliza con cupones de descuento y facilita la reserva de citas.',
  category: 'beauty',
  preview_emoji: '💇‍♀️',
  target_audience:
    'Peluquerías, barberías, salones de belleza y estilistas independientes que quieren mostrar sus servicios y captar citas online.',

  design_tokens: {
    colors: {
      primary: {
        main: '#D4A0A0',
        dark: '#B07A7A',
        light: '#E8C4C4',
      },
      secondary: {
        main: '#F5E6D3',
        dark: '#E0C9B0',
        light: '#FBF3EA',
      },
      accent: {
        main: '#C9A96E',
        dark: '#A88B4F',
        light: '#DECA9E',
      },
      surface: {
        background: '#FFFAF5',
        card: '#FFFFFF',
        variant: '#FFF0E8',
      },
      text: {
        primary: '#3B2626',
        secondary: '#7A5C5C',
        on_primary: '#FFFFFF',
      },
      feedback: {
        success: '#6BAF7B',
        warning: '#E6B44C',
        error: '#D4605A',
      },
      navigation: {
        background: '#FFFFFF',
        active: '#D4A0A0',
        inactive: '#B8A0A0',
        indicator: '#C9A96E',
      },
      extras: {
        divider: 'rgba(212, 160, 160, 0.18)',
        overlay: 'rgba(59, 38, 38, 0.45)',
        shimmer_base: '#F5E6D3',
        shimmer_highlight: '#FFFAF5',
      },
    },

    typography: {
      families: {
        display: 'Poppins',
        heading: 'Poppins',
        body: 'DM Sans',
        mono: 'JetBrains Mono',
      },
      scale: {
        xs: '0.625rem',
        sm: '0.75rem',
        base: '0.875rem',
        md: '1rem',
        lg: '1.125rem',
        xl: '1.375rem',
        xxl: '1.75rem',
        xxxl: '2.25rem',
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
        normal: '1.5',
        relaxed: '1.75',
      },
      letter_spacing: {
        tight: '-0.01em',
        normal: '0',
        wide: '0.02em',
        wider: '0.06em',
      },
    },

    shape: {
      radius: {
        none: '0',
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        full: '9999px',
      },
      components: {
        card: '16px',
        button: '16px',
        input: '12px',
        badge: '9999px',
        image: '16px',
      },
      shadow: {
        sm: '0 1px 4px 0',
        md: '0 4px 12px 0',
        lg: '0 8px 28px 0',
      },
      shadow_color: 'rgba(212, 160, 160, 0.15)',
    },

    spacing: {
      screen_padding_h: '20px',
      screen_padding_v: '24px',
      card_padding: '18px',
      section_gap: '28px',
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
      icon_style: 'outline',
      active_indicator: 'pill',
    },

    imagery: {
      hero_aspect_ratio: '4:3',
      card_image_style: 'cover',
      placeholder_style: 'gradient',
      overlay_style: 'gradient_bottom',
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
        name: 'Salón Glamour',
        subtitle: 'Tu estilo, nuestra pasión',
        description:
          'Peluquería y estilismo con las últimas tendencias en cortes, coloración y tratamientos capilares. Estilistas profesionales con más de 10 años de experiencia.',
        quickLinks: [
          { id: '1', type: 'phone', value: '+34 912 777 888' },
          { id: '2', type: 'instagram', value: 'salonglamour' },
          { id: '3', type: 'whatsapp', value: '+34612777888' },
        ],
        layout: 'overlap',
        coverHeight: 'large',
      },
    },
    {
      module_id: 'catalog',
      order: 1,
      tab_position: 1,
      tab_label: 'Servicios',
      tab_icon: 'scissors',
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
        title: 'Reservar Cita',
        description: 'Elige fecha y hora para tu próxima visita.',
        timeSlots: [
          '09:00',
          '09:30',
          '10:00',
          '10:30',
          '11:00',
          '11:30',
          '12:00',
          '12:30',
          '13:00',
          '16:00',
          '16:30',
          '17:00',
          '17:30',
          '18:00',
          '18:30',
          '19:00',
          '19:30',
          '20:00',
        ],
        slotDuration: 30,
        fields: [
          { id: '1', type: 'text', label: 'Nombre', required: true },
          { id: '2', type: 'phone', label: 'Teléfono', required: true },
          {
            id: '3',
            type: 'textarea',
            label: 'Servicio deseado (corte, color, mechas...)',
            required: false,
          },
        ],
        submitButtonText: 'Reservar',
      },
    },
    {
      module_id: 'photo_gallery',
      order: 3,
      tab_position: 3,
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
        title: 'Opiniones de nuestras clientas',
        testimonials: [
          {
            id: '1',
            text: 'Siempre salgo encantada. Las mechas balayage que me hicieron son perfectas.',
            authorName: 'Patricia Romero',
            authorRole: 'Clienta habitual',
            authorImageUrl: '',
            rating: 5,
          },
          {
            id: '2',
            text: 'El mejor salón al que he ido. El equipo es super profesional y atento.',
            authorName: 'Cristina Díaz',
            authorRole: 'Clienta nueva',
            authorImageUrl: '',
            rating: 5,
          },
          {
            id: '3',
            text: 'Vinieron a peinarme a domicilio para mi boda. Resultado espectacular.',
            authorName: 'Laura Fernández',
            authorRole: 'Novia 2024',
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
      tab_position: null,
      tab_label: 'Ofertas',
      tab_icon: 'tag',
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
            type: 'textarea',
            label: 'Mensaje',
            placeholder: 'Tu consulta...',
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
      name: 'Inicio (Home)',
      module_id: 'hero_profile',
      layout_description:
        'Pantalla principal con imagen de portada grande (layout overlap), foto de perfil del salón superpuesta, nombre "Salón Glamour" en Poppins Bold, subtítulo y descripción del negocio. Quick links a teléfono, Instagram y WhatsApp con iconos redondeados en acento dorado.',
      key_ui_elements: [
        'Imagen de portada a ancho completo con overlay degradado',
        'Foto de perfil circular superpuesta sobre la portada',
        'Nombre y subtítulo del salón centrados',
        'Botones de acceso rápido (teléfono, Instagram, WhatsApp)',
      ],
    },
    {
      name: 'Servicios',
      module_id: 'catalog',
      layout_description:
        'Grid de 2 columnas con tarjetas redondeadas (16px). Cada tarjeta muestra imagen superior, nombre del servicio en Poppins SemiBold, precio en acento dorado y etiquetas de categoría. Sin carrito de compra.',
      key_ui_elements: [
        'Tarjetas de servicio con imagen, nombre y precio',
        'Etiquetas de categoría en chips de color',
        'Precios destacados en dorado',
        'Layout grid responsive a 2 columnas',
      ],
    },
    {
      name: 'Reservar Cita',
      module_id: 'booking',
      layout_description:
        'Pantalla de reserva con selector de fecha tipo calendario, franjas horarias en chips seleccionables (mañana y tarde), y formulario con campos de nombre, teléfono y servicio deseado. Botón "Reservar" prominente rosa nude.',
      key_ui_elements: [
        'Calendario para selección de fecha',
        'Chips de franjas horarias organizados por turno (mañana/tarde)',
        'Campos de formulario con floating labels',
        'Botón "Reservar" grande y redondeado',
      ],
    },
    {
      name: 'Galería',
      module_id: 'photo_gallery',
      layout_description:
        'Grid de 2 columnas con gap de 4px mostrando fotos de trabajos realizados (cortes, color, peinados). Bordes redondeados (16px), títulos visibles debajo de cada foto. Al tocar se abre lightbox fullscreen con gesto swipe.',
      key_ui_elements: [
        'Grid de fotos a 2 columnas con títulos',
        'Fotos con esquinas redondeadas y sombra suave',
        'Lightbox fullscreen con navegación swipe',
        'Títulos descriptivos bajo cada imagen',
      ],
    },
    {
      name: 'Opiniones',
      module_id: 'testimonials',
      layout_description:
        'Carrusel horizontal de tarjetas de testimonios con foto de autora, nombre, rol, texto de la reseña y estrellas de valoración. Fondo cálido con tarjetas blancas redondeadas y sombra rosa suave.',
      key_ui_elements: [
        'Carrusel de tarjetas de opinión deslizables',
        'Foto circular de la autora del testimonio',
        'Estrellas de valoración en dorado',
        'Texto de reseña en DM Sans con comillas decorativas',
      ],
    },
    {
      name: 'Ofertas',
      module_id: 'discount_coupon',
      layout_description:
        'Lista vertical de tarjetas de cupón con borde punteado dorado. Cada cupón muestra título, fecha de expiración, condiciones de uso y contador de usos. Diseño tipo ticket con corte decorativo lateral.',
      key_ui_elements: [
        'Tarjeta de cupón con borde dorado punteado',
        'Fecha de expiración destacada',
        'Condiciones de uso en texto secundario',
        'Contador de usos restantes',
      ],
    },
    {
      name: 'Contacto',
      module_id: 'contact',
      layout_description:
        'Formulario de contacto limpio con campos de nombre, teléfono y mensaje. Floating labels sobre fondo cálido. Botón "Enviar" rosa nude grande redondeado. Protección honeypot activada.',
      key_ui_elements: [
        'Campos de formulario con floating labels y placeholders',
        'Botón "Enviar" prominente rosa nude',
        'Mensaje de éxito tras envío',
        'Campo honeypot oculto para protección anti-spam',
      ],
    },
  ],

  onboarding_hint:
    'Empieza subiendo fotos de tus mejores trabajos a la Galería y rellena el catálogo con tus servicios y precios. ¡Tus clientes podrán reservar cita desde la app!',
  suggested_app_name: 'GlowUp Estilistas',
  suggested_icon_concept:
    'Silueta minimalista de tijeras abiertas en rosa nude sobre fondo champagne, con un destello dorado en la intersección de las hojas.',
};
