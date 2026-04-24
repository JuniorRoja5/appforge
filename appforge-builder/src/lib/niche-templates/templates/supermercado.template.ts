import type { NicheTemplate } from '../types';

export const supermercadoTemplate: NicheTemplate = {
  id: 'supermercado',
  name: 'FreshMart',
  tagline: 'Lo fresco de tu barrio, ahora digital',
  description:
    'Plantilla orientada a supermercados, tiendas de alimentación y mercados locales. Catálogo de productos por categorías, ofertas semanales con cupones, noticias y contacto directo. Diseño funcional y claro pensado para facilitar la compra.',
  category: 'retail',
  preview_emoji: '🛒',
  target_audience:
    'Supermercados de barrio, tiendas de alimentación, fruterías, mercados locales y cooperativas agrícolas que quieren digitalizar su oferta.',

  design_tokens: {
    colors: {
      primary: {
        main: '#1B813E',
        dark: '#0F5C2A',
        light: '#4CAF6E',
      },
      secondary: {
        main: '#FFFFFF',
        dark: '#F0F0F0',
        light: '#FFFFFF',
      },
      accent: {
        main: '#E53935',
        dark: '#C62828',
        light: '#EF5350',
      },
      surface: {
        background: '#F5F7F5',
        card: '#FFFFFF',
        variant: '#EDF5EE',
      },
      text: {
        primary: '#1A2E1A',
        secondary: '#5A6F5A',
        on_primary: '#FFFFFF',
      },
      feedback: {
        success: '#2E7D32',
        warning: '#F9A825',
        error: '#E53935',
      },
      navigation: {
        background: '#FFFFFF',
        active: '#1B813E',
        inactive: '#90A490',
        indicator: '#E53935',
      },
      extras: {
        divider: 'rgba(27, 129, 62, 0.12)',
        overlay: 'rgba(26, 46, 26, 0.50)',
        shimmer_base: '#EDF5EE',
        shimmer_highlight: '#F5F7F5',
      },
    },

    typography: {
      families: {
        display: 'Space Grotesk',
        heading: 'Space Grotesk',
        body: 'Space Grotesk',
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
        relaxed: '1.7',
      },
      letter_spacing: {
        tight: '-0.02em',
        normal: '0',
        wide: '0.01em',
        wider: '0.04em',
      },
    },

    shape: {
      radius: {
        none: '0',
        xs: '2px',
        sm: '4px',
        md: '8px',
        lg: '10px',
        xl: '14px',
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
        sm: '0 1px 2px 0',
        md: '0 2px 6px 0',
        lg: '0 4px 14px 0',
      },
      shadow_color: 'rgba(27, 129, 62, 0.08)',
    },

    spacing: {
      screen_padding_h: '16px',
      screen_padding_v: '16px',
      card_padding: '14px',
      section_gap: '20px',
      item_gap: '10px',
      icon_size: {
        sm: '18px',
        md: '22px',
        lg: '30px',
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
      hero_aspect_ratio: '16:9',
      card_image_style: 'cover',
      placeholder_style: 'solid',
      overlay_style: 'gradient_bottom',
      icon_theme: 'bold',
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
        name: 'SuperFresh Market',
        subtitle: 'Productos frescos cada día',
        description:
          'Tu supermercado de confianza con productos frescos, locales y de calidad. Ofertas semanales y servicio a domicilio.',
        quickLinks: [
          { id: '1', type: 'phone', value: '+34 918 666 555' },
          { id: '2', type: 'whatsapp', value: '+34618666555' },
          { id: '3', type: 'web', value: 'https://superfresh.es' },
        ],
        layout: 'centered',
        coverHeight: 'medium',
      },
    },
    {
      module_id: 'catalog',
      order: 1,
      tab_position: 1,
      tab_label: 'Productos',
      tab_icon: 'shopping-cart',
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
      module_id: 'discount_coupon',
      order: 2,
      tab_position: 2,
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
      module_id: 'testimonials',
      order: 3,
      tab_position: null,
      tab_label: '',
      tab_icon: '',
      is_home: false,
      default_config: {
        title: 'Lo que dicen nuestros vecinos',
        testimonials: [
          {
            id: '1',
            text: 'La fruta y verdura siempre está fresca. Se nota que cuidan la calidad.',
            authorName: 'Carmen Herrero',
            authorRole: 'Vecina del barrio',
            authorImageUrl: '',
            rating: 5,
          },
          {
            id: '2',
            text: 'El servicio a domicilio es rapidísimo y siempre llega todo en perfecto estado.',
            authorName: 'Manuel Torres',
            authorRole: 'Cliente online',
            authorImageUrl: '',
            rating: 4,
          },
          {
            id: '3',
            text: 'Las ofertas semanales son geniales. Ahorro bastante haciendo la compra aquí.',
            authorName: 'Rosa Méndez',
            authorRole: 'Clienta habitual',
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
      module_id: 'contact',
      order: 4,
      tab_position: 3,
      tab_label: 'Contacto',
      tab_icon: 'mail',
      is_home: false,
      default_config: {
        formTitle: 'Contacto',
        submitButtonText: 'Enviar',
        successMessage: '¡Gracias por tu mensaje!',
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
            type: 'email',
            label: 'Email',
            placeholder: 'tu@email.com',
            required: true,
          },
          {
            id: '3',
            type: 'textarea',
            label: 'Mensaje',
            placeholder: 'Tu consulta...',
            required: true,
          },
        ],
        enableHoneypot: true,
        enableCaptcha: false,
      },
    },
    {
      module_id: 'news_feed',
      order: 5,
      tab_position: null,
      tab_label: '',
      tab_icon: '',
      is_home: false,
      default_config: {
        layout: 'cards',
        itemsToShow: 5,
        showImage: true,
        showDate: true,
        showExcerpt: true,
      },
    },
  ],

  screens: [
    {
      name: 'Inicio (Home)',
      module_id: 'hero_profile',
      layout_description:
        'Portada con imagen de cover a ancho completo (16:9), imagen de perfil circular centrada superpuesta. Nombre del supermercado en Space Grotesk Bold, subtítulo debajo. Descripción en texto secundario. Tres botones de enlace rápido (teléfono, WhatsApp, web) en fila horizontal con iconos verdes.',
      key_ui_elements: [
        'Cover image a ancho completo con overlay degradado',
        'Avatar circular centrado con borde blanco',
        'Nombre grande en Space Grotesk Bold',
        'Subtítulo en texto secundario',
        'Descripción corta del negocio',
        'Botones de enlace rápido (llamar, WhatsApp, web)',
      ],
    },
    {
      name: 'Productos',
      module_id: 'catalog',
      layout_description:
        'Grid compacto de 2 columnas con tarjetas funcionales de esquinas pequeñas (8px). Cada tarjeta: foto del producto arriba, nombre en Space Grotesk SemiBold, precio en verde, precio comparado tachado, tags de categoría. Botón de carrito rojo acento.',
      key_ui_elements: [
        'Grid 2 columnas de tarjetas de producto',
        'Precio actual en verde primario',
        'Precio comparado tachado en gris',
        'Tags de categoría en badges verdes',
        'Botón de añadir al carrito rojo acento',
      ],
    },
    {
      name: 'Ofertas',
      module_id: 'discount_coupon',
      layout_description:
        'Lista vertical de cupones con diseño tipo tarjeta. Fondo blanco con borde izquierdo verde, información de expiración visible, condiciones en texto secundario y contador de usos.',
      key_ui_elements: [
        'Tarjeta tipo cupón con borde verde izquierdo',
        'Fecha de expiración en rojo acento',
        'Condiciones en texto secundario pequeño',
        'Contador de usos disponibles',
        'Botón "Usar cupón" con icono',
      ],
    },
    {
      name: 'Testimonios',
      module_id: 'testimonials',
      layout_description:
        'Título de sección grande centrado. Tarjetas de testimonios con foto de autor circular, nombre en bold, rol en texto secundario, texto del testimonio entre comillas y estrellas de valoración en amarillo/dorado.',
      key_ui_elements: [
        'Título "Lo que dicen nuestros vecinos"',
        'Tarjetas de testimonio con foto de autor',
        'Nombre y rol del autor',
        'Texto del testimonio',
        'Estrellas de valoración (1-5)',
      ],
    },
    {
      name: 'Contacto',
      module_id: 'contact',
      layout_description:
        'Formulario de contacto limpio con campos de nombre, email y mensaje. Botón de envío verde a ancho completo. Mensaje de éxito en verde tras envío.',
      key_ui_elements: [
        'Campo de nombre con placeholder',
        'Campo de email con validación',
        'Campo de mensaje textarea',
        'Botón "Enviar" verde a ancho completo',
        'Mensaje de confirmación tras envío',
      ],
    },
    {
      name: 'Noticias',
      module_id: 'news_feed',
      layout_description:
        'Feed vertical con tarjetas de noticias. Imagen a ancho completo arriba, título en Space Grotesk Bold, fecha en gris y extracto de 2 líneas. Diseño directo y legible, 5 elementos visibles.',
      key_ui_elements: [
        'Tarjetas de noticia con imagen hero',
        'Título grande y legible',
        'Fecha de publicación',
        'Extracto de 2 líneas máximo',
        'Indicador "Leer más" en verde',
      ],
    },
  ],

  onboarding_hint:
    'Sube las fotos de tus productos estrella al catálogo y crea tus primeras ofertas semanales. Tus vecinos del barrio te encontrarán fácilmente desde la app.',
  suggested_app_name: 'FreshMart Mi Tienda',
  suggested_icon_concept:
    'Hoja verde estilizada con forma de bolsa de compra sobre fondo blanco, trazo limpio y geométrico.',
};
