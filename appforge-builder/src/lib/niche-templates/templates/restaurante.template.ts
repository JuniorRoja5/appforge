import type { NicheTemplate } from '../types';

export const restauranteTemplate: NicheTemplate = {
  id: 'restaurante',
  name: 'Bistro',
  tagline: 'El sabor de tu restaurante en las manos de tus clientes',
  description:
    'Plantilla elegante para restaurantes, bistrots y establecimientos gastronomicos. Menu digital con categorias, galeria de platos, sistema de eventos y cupones de descuento con un diseno calido y premium.',
  category: 'food',
  preview_emoji: '🍷',
  target_audience:
    'Restaurantes, bistrots, trattorias y establecimientos gastronomicos que buscan digitalizar su carta y conectar con sus comensales.',

  design_tokens: {
    colors: {
      primary: {
        main: '#ED2031',
        dark: '#C81B2A',
        light: '#F87171',
      },
      secondary: {
        main: '#1F2937',
        dark: '#111827',
        light: '#374151',
      },
      accent: {
        main: '#FBBF24',
        dark: '#F59E0B',
        light: '#FCD34D',
      },
      surface: {
        background: '#FCF9F2',
        card: '#FFFFFF',
        variant: '#F3F4F6',
      },
      text: {
        primary: '#1F2937',
        secondary: '#4B5563',
        on_primary: '#FFFFFF',
      },
      feedback: {
        success: '#10B981',
        warning: '#FBBF24',
        error: '#ED2031',
      },
      navigation: {
        background: '#FFFFFF',
        active: '#ED2031',
        inactive: '#9CA3AF',
        indicator: '#ED2031',
      },
      extras: {
        divider: '#E5E7EB',
        overlay: 'rgba(31, 41, 55, 0.60)',
        shimmer_base: '#F3F4F6',
        shimmer_highlight: '#FFFFFF',
      },
    },

    typography: {
      families: {
        display: 'Pacifico',
        heading: 'Pacifico',
        body: 'Rethink Sans',
        mono: 'IBM Plex Mono',
      },
      scale: {
        xs: '0.625rem',
        sm: '0.75rem',
        base: '0.875rem',
        md: '1rem',
        lg: '1.25rem',
        xl: '1.5rem',
        xxl: '2rem',
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
        normal: '1.6',
        relaxed: '1.8',
      },
      letter_spacing: {
        tight: '-0.01em',
        normal: '0em',
        wide: '0.05em',
        wider: '0.12em',
      },
    },

    shape: {
      radius: {
        none: '0px',
        xs: '6px',
        sm: '12px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        full: '9999px',
      },
      components: {
        card: '24px',
        button: '9999px',
        input: '12px',
        badge: '9999px',
        image: '24px',
      },
      shadow: {
        sm: '0 4px 6px -1px rgba(237, 32, 49, 0.1), 0 2px 4px -1px rgba(237, 32, 49, 0.06)',
        md: '0 10px 15px -3px rgba(237, 32, 49, 0.1), 0 4px 6px -2px rgba(237, 32, 49, 0.05)',
        lg: '0 20px 25px -5px rgba(237, 32, 49, 0.1), 0 10px 10px -5px rgba(237, 32, 49, 0.04)',
      },
      shadow_color: 'rgba(237, 32, 49, 0.15)',
    },

    spacing: {
      screen_padding_h: '20px',
      screen_padding_v: '24px',
      card_padding: '18px',
      section_gap: '32px',
      item_gap: '12px',
      icon_size: {
        sm: '18px',
        md: '22px',
        lg: '30px',
      },
    },

    navigation: {
      style: 'bottom_tabs',
      tab_count: 5,
      show_labels: true,
      label_size: '0.625rem',
      icon_style: 'outline',
      active_indicator: 'dot',
    },

    imagery: {
      hero_aspect_ratio: '4:3',
      card_image_style: 'cover',
      placeholder_style: 'blur',
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
        name: 'Restaurante Sabores',
        subtitle: 'Cocina tradicional con un toque moderno',
        description:
          'Disfruta de la mejor gastronomía local con ingredientes frescos y de temporada. Reserva tu mesa y vive una experiencia culinaria única.',
        quickLinks: [
          { id: '1', type: 'phone', value: '+34 912 345 678' },
          { id: '2', type: 'email', value: 'reservas@sabores.com' },
          { id: '3', type: 'instagram', value: 'restaurantesabores' },
          { id: '4', type: 'whatsapp', value: '+34612345678' },
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
      tab_icon: 'book-open',
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
      module_id: 'events',
      order: 3,
      tab_position: 3,
      tab_label: 'Eventos',
      tab_icon: 'calendar',
      is_home: false,
      default_config: {
        layout: 'cards',
        itemsToShow: 10,
        showImage: true,
        showLocation: true,
        showDescription: true,
      },
    },
    {
      module_id: 'testimonials',
      order: 4,
      tab_position: null,
      tab_label: 'Opiniones',
      tab_icon: 'message-circle',
      is_home: false,
      default_config: {
        title: 'Opiniones de nuestros comensales',
        testimonials: [
          {
            id: '1',
            text: 'La mejor paella que he probado fuera de Valencia. El ambiente es acogedor y el servicio impecable.',
            authorName: 'Laura Fernández',
            authorRole: 'Comensal habitual',
            authorImageUrl: '',
            rating: 5,
          },
          {
            id: '2',
            text: 'Menú del día excelente relación calidad-precio. Los postres caseros son increíbles.',
            authorName: 'Pedro Jiménez',
            authorRole: 'Food blogger',
            authorImageUrl: '',
            rating: 5,
          },
          {
            id: '3',
            text: 'Celebramos nuestro aniversario aquí y fue una velada perfecta. Volveremos seguro.',
            authorName: 'Marta y Juan',
            authorRole: 'Clientes',
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
      module_id: 'contact',
      order: 5,
      tab_position: 4,
      tab_label: 'Reservar',
      tab_icon: 'phone',
      is_home: false,
      default_config: {
        formTitle: 'Reservas y Contacto',
        submitButtonText: 'Enviar',
        successMessage: '¡Gracias! Te confirmaremos tu reserva pronto.',
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
            placeholder:
              'Número de comensales, fecha, hora, preferencias...',
            required: true,
          },
        ],
        enableHoneypot: true,
        enableCaptcha: false,
      },
    },
    {
      module_id: 'discount_coupon',
      order: 6,
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
  ],

  screens: [
    {
      name: 'Inicio',
      module_id: 'hero_profile',
      layout_description:
        'Pantalla de bienvenida con imagen de portada grande del restaurante, foto de perfil circular superpuesta, nombre del restaurante en Playfair Display bold, subtítulo y descripción. Quick links como iconos circulares para teléfono, email, Instagram y WhatsApp.',
      key_ui_elements: [
        'Imagen de portada grande con layout overlap',
        'Foto de perfil circular superpuesta sobre la portada',
        'Nombre en Playfair Display bold con subtítulo en Lora',
        'Descripción del restaurante en texto secundario',
        'Quick links como iconos circulares con etiquetas',
      ],
    },
    {
      name: 'Carta del Restaurante',
      module_id: 'menu_restaurant',
      layout_description:
        'Menú digital con secciones accordion colapsables por categoría. Cada ítem muestra nombre, descripción, precio alineado a la derecha, imagen del plato y badges de alérgenos. Precios en euros.',
      key_ui_elements: [
        'Accordion por categorías con icono de expansión',
        'Cada plato: nombre en Playfair bold, precio a la derecha en terracota',
        'Imágenes de platos con radius 12px',
        'Descripción en Lora regular gris',
        'Badges de alérgenos con iconos pequeños',
      ],
    },
    {
      name: 'Galería de Platos',
      module_id: 'photo_gallery',
      layout_description:
        'Galería de 2 columnas con gap de 4px mostrando fotos de platos y ambiente del restaurante. Títulos visibles bajo cada imagen. Tap abre lightbox con navegación.',
      key_ui_elements: [
        'Grid de 2 columnas con gap uniforme',
        'Imágenes con radius 12px y sombra suave',
        'Títulos debajo de cada imagen en Lora',
        'Lightbox fullscreen con swipe horizontal',
      ],
    },
    {
      name: 'Eventos Gastronómicos',
      module_id: 'events',
      layout_description:
        'Lista vertical de cards con imagen, título del evento, ubicación y descripción. Cards con sombra premium y radius 12px sobre fondo crema. Hasta 10 eventos visibles.',
      key_ui_elements: [
        'Card con imagen top ratio 16:9',
        'Título en Playfair Display bold',
        'Ubicación con icono de mapa en verde oliva',
        'Descripción del evento en Lora regular',
        'Botón "Reservar" outline terracota',
      ],
    },
    {
      name: 'Opiniones de Comensales',
      module_id: 'testimonials',
      layout_description:
        'Carrusel horizontal de testimonios con foto del autor, nombre, rol, texto de la opinión y estrellas de valoración. Fondo crema con cards blancas y sombra suave.',
      key_ui_elements: [
        'Título de sección en Playfair Display',
        'Cards en carrusel con swipe horizontal',
        'Foto circular del autor con nombre y rol',
        'Estrellas de valoración en dorado accent',
        'Texto de opinión en Lora italic',
      ],
    },
    {
      name: 'Reservas y Contacto',
      module_id: 'contact',
      layout_description:
        'Formulario de reserva con campos para nombre, teléfono, email y mensaje. Título descriptivo, botón de envío terracota y mensaje de confirmación tras envío exitoso. Protección honeypot activada.',
      key_ui_elements: [
        'Título "Reservas y Contacto" en Playfair bold',
        'Campos de input con borde inferior terracota sutil',
        'Campo de teléfono y textarea para detalles de reserva',
        'Botón CTA terracota sólido con texto "Enviar"',
        'Mensaje de éxito en card verde oliva claro',
      ],
    },
    {
      name: 'Ofertas y Cupones',
      module_id: 'discount_coupon',
      layout_description:
        'Cards de cupones mostrando título, condiciones, fecha de vencimiento y contador de uso. Fondo crema con acentos dorados y layout de tarjetas.',
      key_ui_elements: [
        'Card cupón con efecto borde dentado',
        'Fecha de expiración destacada en terracota light',
        'Condiciones de uso en texto secundario',
        'Contador de usos visible',
        'Botón "Canjear" accent dorado',
      ],
    },
  ],

  onboarding_hint:
    'Comienza subiendo tu carta completa con fotos de tus platos estrella. Agrega el mapa de tu restaurante y los horarios para que tus clientes puedan reservar facilmente.',
  suggested_app_name: 'Bistro',
  suggested_icon_concept:
    'Tenedor y cuchillo cruzados elegantes sobre fondo terracota con detalles dorados, estilo minimal y premium.',
};
