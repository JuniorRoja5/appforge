import type { NicheTemplate } from '../types';

export const ecommerceTemplate: NicheTemplate = {
  id: 'ecommerce',
  name: 'ShopFront',
  tagline: 'Tu tienda siempre abierta, siempre en su bolsillo',
  description:
    'Plantilla minimalista y funcional para tiendas online, boutiques y marcas directas al consumidor. Catálogo de productos protagonista, galería visual, cupones y contacto.',
  category: 'retail',
  preview_emoji: '🛒',
  target_audience:
    'Tiendas online, boutiques, marcas DTC (direct-to-consumer), tiendas de ropa, accesorios, electrónica, artesanía',

  design_tokens: {
    colors: {
      primary: {
        main: '#111111',
        dark: '#000000',
        light: '#333333',
      },
      secondary: {
        main: '#FF5722',
        dark: '#D84315',
        light: '#FF8A65',
      },
      accent: {
        main: '#FF5722',
        dark: '#D84315',
        light: '#FF8A65',
      },
      surface: {
        background: '#FFFFFF',
        card: '#FFFFFF',
        variant: '#F5F5F5',
      },
      text: {
        primary: '#111111',
        secondary: '#6B6B6B',
        on_primary: '#FFFFFF',
      },
      feedback: {
        success: '#2E7D32',
        warning: '#F9A825',
        error: '#C62828',
      },
      navigation: {
        background: '#FFFFFF',
        active: '#111111',
        inactive: '#BDBDBD',
        indicator: '#FF5722',
      },
      extras: {
        divider: '#EEEEEE',
        overlay: 'rgba(0, 0, 0, 0.55)',
        shimmer_base: '#F0F0F0',
        shimmer_highlight: '#FAFAFA',
      },
    },

    typography: {
      families: {
        display: 'Inter',
        heading: 'Inter',
        body: 'Inter',
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
        xxxl: '2.5rem',
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
        relaxed: '1.65',
      },
      letter_spacing: {
        tight: '-0.02em',
        normal: '0em',
        wide: '0.02em',
        wider: '0.08em',
      },
    },

    shape: {
      radius: {
        none: '0px',
        xs: '2px',
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        full: '9999px',
      },
      components: {
        card: '8px',
        button: '8px',
        input: '6px',
        badge: '4px',
        image: '8px',
      },
      shadow: {
        sm: '0 1px 2px 0 var(--shadow-color)',
        md: '0 2px 6px -1px var(--shadow-color)',
        lg: '0 4px 12px -2px var(--shadow-color)',
      },
      shadow_color: 'rgba(0, 0, 0, 0.06)',
    },

    spacing: {
      screen_padding_h: '16px',
      screen_padding_v: '20px',
      card_padding: '16px',
      section_gap: '32px',
      item_gap: '12px',
      icon_size: {
        sm: '16px',
        md: '22px',
        lg: '28px',
      },
    },

    navigation: {
      style: 'bottom_tabs',
      tab_count: 4,
      show_labels: true,
      label_size: '0.625rem',
      icon_style: 'outline',
      active_indicator: 'none',
    },

    imagery: {
      hero_aspect_ratio: '1:1',
      card_image_style: 'cover',
      placeholder_style: 'solid',
      overlay_style: 'none',
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
        name: 'TrendShop',
        subtitle: 'Moda y tendencias online',
        description:
          'Tu tienda de moda online con las últimas tendencias. Envíos rápidos, devoluciones gratuitas y atención personalizada.',
        quickLinks: [
          { id: '1', type: 'phone', value: '+34 900 123 456' },
          { id: '2', type: 'instagram', value: 'trendshop_es' },
          { id: '3', type: 'whatsapp', value: '+34600123456' },
        ],
        layout: 'centered',
        coverHeight: 'large',
      },
    },
    {
      module_id: 'catalog',
      order: 1,
      tab_position: 1,
      tab_label: 'Tienda',
      tab_icon: 'shopping-bag',
      is_home: false,
      default_config: {
        layout: 'grid',
        columns: 2,
        showPrices: true,
        showComparePrice: true,
        showTags: true,
        enableCart: true,
        currency: '€',
      },
    },
    {
      module_id: 'photo_gallery',
      order: 2,
      tab_position: 2,
      tab_label: 'Lookbook',
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
      order: 3,
      tab_position: null,
      tab_label: 'Opiniones',
      tab_icon: 'star',
      is_home: false,
      default_config: {
        title: 'Opiniones de clientes',
        testimonials: [
          {
            id: '1',
            text: 'Pedido recibido en 24 horas y la calidad del producto es excelente. Repetiré seguro.',
            authorName: 'Andrea Ruiz',
            authorRole: 'Compradora verificada',
            authorImageUrl: '',
            rating: 5,
          },
          {
            id: '2',
            text: 'Devolución super fácil cuando la talla no me quedaba bien. Gran servicio al cliente.',
            authorName: 'Pablo Serrano',
            authorRole: 'Cliente habitual',
            authorImageUrl: '',
            rating: 4,
          },
          {
            id: '3',
            text: 'Los precios son muy competitivos y la ropa es de muy buena calidad.',
            authorName: 'Claudia Navarro',
            authorRole: 'Fashion blogger',
            authorImageUrl: '',
            rating: 5,
          },
        ],
        showRating: true,
        showImage: true,
        layout: 'cards',
      },
    },
    {
      module_id: 'discount_coupon',
      order: 4,
      tab_position: 3,
      tab_label: 'Ofertas',
      tab_icon: 'percent',
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
      tab_position: null,
      tab_label: 'Contacto',
      tab_icon: 'mail',
      is_home: false,
      default_config: {
        formTitle: 'Atención al Cliente',
        submitButtonText: 'Enviar',
        successMessage: '¡Gracias! Te responderemos en menos de 24 horas.',
        fields: [
          { id: '1', type: 'text', label: 'Nombre', placeholder: 'Tu nombre', required: true },
          {
            id: '2',
            type: 'email',
            label: 'Email',
            placeholder: 'tu@email.com',
            required: true,
          },
          {
            id: '3',
            type: 'text',
            label: 'Número de pedido',
            placeholder: '#12345 (opcional)',
            required: false,
          },
          {
            id: '4',
            type: 'textarea',
            label: 'Consulta',
            placeholder: 'Describe tu consulta...',
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
        'Portada hero a ancho completo con imagen de cover grande, logo centrado, nombre de la tienda, subtítulo y enlaces rápidos a teléfono, Instagram y WhatsApp',
      key_ui_elements: [
        'Cover image a ancho completo con altura large',
        'Imagen de perfil/logo centrada sobre el cover',
        'Nombre "TrendShop" en tipografía display bold',
        'Subtítulo "Moda y tendencias online" en texto secundario',
        'Descripción breve de la tienda',
        'Quick links: teléfono, Instagram, WhatsApp como iconos interactivos',
      ],
    },
    {
      name: 'Tienda',
      module_id: 'catalog',
      layout_description:
        'Grid de productos a 2 columnas con precios, precios comparativos tachados, etiquetas de categoría y botón de añadir al carrito',
      key_ui_elements: [
        'Grid de productos 2 columnas con imagen protagonista',
        'Precio actual en bold con precio comparativo tachado',
        'Tags de categoría en cada producto',
        'Botón de carrito en cada card de producto',
        'Moneda en euros (€)',
      ],
    },
    {
      name: 'Lookbook',
      module_id: 'photo_gallery',
      layout_description:
        'Galería fotográfica en grid de 2 columnas con títulos visibles y lightbox para ver en detalle',
      key_ui_elements: [
        'Grid 2 columnas con gap de 4px',
        'Títulos visibles debajo de cada imagen',
        'Lightbox a pantalla completa al tocar imagen',
      ],
    },
    {
      name: 'Opiniones de clientes',
      module_id: 'testimonials',
      layout_description:
        'Sección de testimonios en formato cards con valoraciones de estrellas, foto del autor y texto de la reseña',
      key_ui_elements: [
        'Cards de testimonio con texto de la reseña',
        'Nombre del autor y rol (Compradora verificada, Cliente habitual, etc.)',
        'Valoración con estrellas (4-5 estrellas)',
        'Imagen del autor junto al nombre',
        'Layout en cards apiladas verticalmente',
      ],
    },
    {
      name: 'Ofertas y Cupones',
      module_id: 'discount_coupon',
      layout_description:
        'Cards de cupón con fecha de expiración, condiciones de uso y contador de usos disponibles',
      key_ui_elements: [
        'Cards de cupón con código copiable en mono font',
        'Badge de fecha de expiración',
        'Condiciones de uso claramente visibles',
        'Contador de usos disponibles',
      ],
    },
    {
      name: 'Atención al Cliente',
      module_id: 'contact',
      layout_description:
        'Formulario de contacto con campos de nombre, email, número de pedido opcional y consulta, con protección honeypot',
      key_ui_elements: [
        'Título "Atención al Cliente" en heading',
        'Campo de nombre (obligatorio)',
        'Campo de email (obligatorio)',
        'Campo de número de pedido (opcional)',
        'Textarea de consulta (obligatorio)',
        'Botón "Enviar" con mensaje de confirmación',
      ],
    },
  ],

  onboarding_hint:
    'Empieza subiendo tus productos al catálogo con fotos de calidad sobre fondo blanco. Las fotos cuadradas (1:1) se verán mejor en el grid.',
  suggested_app_name: 'ShopFront Store',
  suggested_icon_concept:
    'Bolsa de compra minimalista en línea negra sobre fondo blanco con un pequeño acento naranja, estilo clean y moderno',
};
