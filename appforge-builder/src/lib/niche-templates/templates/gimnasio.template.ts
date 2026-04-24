import type { NicheTemplate } from '../types';

export const gimnasioTemplate: NicheTemplate = {
  id: 'gimnasio',
  name: 'FitForge',
  tagline: 'Tu entrenamiento, tu comunidad, tu app',
  description:
    'Plantilla de alto impacto para gimnasios, boxes de CrossFit y centros fitness. Modo oscuro con acentos neon que transmiten energia y rendimiento. Horarios de clases, comunidad y promociones.',
  category: 'fitness',
  preview_emoji: '💪',
  target_audience:
    'Gimnasios, boxes de CrossFit, estudios de yoga, centros de entrenamiento funcional y trainers personales que buscan fidelizar a sus miembros.',

  design_tokens: {
    colors: {
      primary: {
        main: '#F8F8F8',
        dark: '#E0E0E0',
        light: '#FFFFFF',
      },
      secondary: {
        main: '#1A1A1A',
        dark: '#0A0A0A',
        light: '#2D2D2D',
      },
      accent: {
        main: '#FFFFFF',
        dark: '#E0E0E0',
        light: '#FFFFFF',
      },
      surface: {
        background: '#121212',
        card: '#1A1A1A',
        variant: '#242424',
      },
      text: {
        primary: '#F8F8F8',
        secondary: '#A3A3A3',
        on_primary: '#121212',
      },
      feedback: {
        success: '#F8F8F8',
        warning: '#FBBF24',
        error: '#EF4444',
      },
      navigation: {
        background: '#0D0D0D',
        active: '#FFFFFF',
        inactive: '#555555',
        indicator: '#FFFFFF',
      },
      extras: {
        divider: '#2D2D2D',
        overlay: 'rgba(18, 18, 18, 0.85)',
        shimmer_base: '#1A1A1A',
        shimmer_highlight: '#242424',
      },
    },

    typography: {
      families: {
        display: 'Saira Stencil One',
        heading: 'Saira Stencil One',
        body: 'Raleway',
        mono: 'Fira Code',
      },
      scale: {
        xs: '0.625rem',
        sm: '0.75rem',
        base: '0.875rem',
        md: '1rem',
        lg: '1.25rem',
        xl: '1.625rem',
        xxl: '2.25rem',
        xxxl: '3rem',
      },
      weight: {
        regular: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
        extrabold: '800',
      },
      line_height: {
        tight: '1.1',
        normal: '1.5',
        relaxed: '1.7',
      },
      letter_spacing: {
        tight: '-0.02em',
        normal: '0em',
        wide: '0.06em',
        wider: '0.14em',
      },
    },

    shape: {
      radius: {
        none: '0px',
        xs: '0px',
        sm: '0px',
        md: '0px',
        lg: '0px',
        xl: '0px',
        full: '9999px',
      },
      components: {
        card: '0px',
        button: '0px',
        input: '0px',
        badge: '0px',
        image: '0px',
      },
      shadow: {
        sm: 'none',
        md: 'none',
        lg: 'none',
      },
      shadow_color: 'transparent',
    },

    spacing: {
      screen_padding_h: '16px',
      screen_padding_v: '20px',
      card_padding: '16px',
      section_gap: '24px',
      item_gap: '10px',
      icon_size: {
        sm: '18px',
        md: '24px',
        lg: '32px',
      },
    },

    navigation: {
      style: 'bottom_tabs',
      tab_count: 5,
      show_labels: true,
      label_size: '0.5625rem',
      icon_style: 'outline',
      active_indicator: 'underline',
    },

    imagery: {
      hero_aspect_ratio: '16:9',
      card_image_style: 'cover',
      placeholder_style: 'solid',
      overlay_style: 'gradient_dark',
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
        name: 'PowerFit Gym',
        subtitle: 'Tu mejor versión empieza aquí',
        description:
          'Centro deportivo con las mejores instalaciones, clases dirigidas y entrenadores personales. Únete a nuestra comunidad fitness.',
        quickLinks: [
          { id: '1', type: 'phone', value: '+34 911 222 333' },
          { id: '2', type: 'instagram', value: 'powerfitgym' },
          { id: '3', type: 'whatsapp', value: '+34611222333' },
        ],
        layout: 'overlap',
        coverHeight: 'large',
      },
    },
    {
      module_id: 'events',
      order: 1,
      tab_position: 1,
      tab_label: 'Clases',
      tab_icon: 'zap',
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
      module_id: 'booking',
      order: 2,
      tab_position: 2,
      tab_label: 'Reservar',
      tab_icon: 'calendar',
      is_home: false,
      default_config: {
        title: 'Reservar Clase',
        description: 'Elige tu horario preferido para entrenar.',
        timeSlots: [
          '07:00',
          '08:00',
          '09:00',
          '10:00',
          '11:00',
          '17:00',
          '18:00',
          '19:00',
          '20:00',
          '21:00',
        ],
        slotDuration: 60,
        fields: [
          { id: '1', type: 'text', label: 'Nombre completo', required: true },
          { id: '2', type: 'phone', label: 'Teléfono', required: true },
          {
            id: '3',
            type: 'textarea',
            label: 'Clase preferida (CrossFit, Yoga, Spinning...)',
            required: false,
          },
        ],
        submitButtonText: 'Reservar Plaza',
      },
    },
    {
      module_id: 'photo_gallery',
      order: 3,
      tab_position: 3,
      tab_label: 'Gym',
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
        title: 'Transformaciones reales',
        testimonials: [
          {
            id: '1',
            text: 'En 3 meses he logrado resultados que no conseguí en años. Los entrenadores son lo mejor.',
            authorName: 'Diego Ruiz',
            authorRole: 'Miembro desde 2024',
            authorImageUrl: '',
            rating: 5,
          },
          {
            id: '2',
            text: 'Las clases de CrossFit son brutales pero adictivas. El ambiente del gym es increíble.',
            authorName: 'Sofía Vega',
            authorRole: 'Atleta amateur',
            authorImageUrl: '',
            rating: 5,
          },
          {
            id: '3',
            text: 'Vine por las instalaciones y me quedé por la comunidad. 100% recomendado.',
            authorName: 'Andrés Molina',
            authorRole: 'Miembro Premium',
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
      module_id: 'news_feed',
      order: 5,
      tab_position: null,
      tab_label: 'Feed',
      tab_icon: 'rss',
      is_home: false,
      default_config: {
        layout: 'cards',
        itemsToShow: 5,
        showImage: true,
        showDate: true,
        showExcerpt: true,
      },
    },
    {
      module_id: 'contact',
      order: 6,
      tab_position: 4,
      tab_label: 'Info',
      tab_icon: 'info',
      is_home: false,
      default_config: {
        formTitle: 'Información y Matrícula',
        submitButtonText: 'Solicitar Info',
        successMessage:
          '¡Recibido! Te contactaremos para darte toda la información.',
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
            required: true,
          },
          {
            id: '4',
            type: 'textarea',
            label: 'Mensaje',
            placeholder: '¿Qué actividades te interesan?',
            required: false,
          },
        ],
        enableHoneypot: true,
        enableCaptcha: false,
      },
    },
    {
      module_id: 'discount_coupon',
      order: 7,
      tab_position: null,
      tab_label: 'Promos',
      tab_icon: 'percent',
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
        'Portada hero con imagen de cover a pantalla completa y foto de perfil superpuesta (layout overlap). Nombre del gym en Oswald extrabold, subtítulo en Inter regular. Quick links como iconos circulares (teléfono, Instagram, WhatsApp) sobre fondo oscuro.',
      key_ui_elements: [
        'Cover image fullwidth con altura large',
        'Foto de perfil circular superpuesta al cover',
        'Nombre en Oswald extrabold neon lime',
        'Subtítulo en Inter regular blanco',
        'Descripción en Inter regular gris',
        'Quick links como iconos circulares con borde neon',
      ],
    },
    {
      name: 'Clases y Eventos',
      module_id: 'events',
      layout_description:
        'Grid de cards con imagen, ubicación y descripción de cada clase o evento. Layout tipo cards con imágenes cover y texto sobre fondo card oscuro.',
      key_ui_elements: [
        'Cards con imagen cover arriba',
        'Título de evento en Oswald bold blanco',
        'Ubicación con icono pin en Inter regular gris',
        'Descripción truncada en Inter regular',
        'Indicador de fecha/hora destacado en neon lime',
      ],
    },
    {
      name: 'Reservar Clase',
      module_id: 'booking',
      layout_description:
        'Pantalla de reserva con título y descripción, grilla de slots horarios seleccionables y formulario con campos de nombre, teléfono y clase preferida. Botón CTA prominente.',
      key_ui_elements: [
        'Título en Oswald bold blanco',
        'Descripción en Inter regular gris',
        'Grilla de horarios como chips seleccionables neon lime',
        'Campos de formulario con borde inferior gris, focus neon',
        'Botón Reservar Plaza en neon lime con texto negro bold',
      ],
    },
    {
      name: 'Galería del Gym',
      module_id: 'photo_gallery',
      layout_description:
        'Grid 2 columnas con gap de 4px. Imágenes con títulos visibles y lightbox habilitado. Fondo negro puro, imágenes con radius 6px.',
      key_ui_elements: [
        'Grid 2 columnas con gap 4px',
        'Imágenes con radius 6px y títulos debajo',
        'Lightbox fullscreen con fondo negro puro',
        'Indicador de posición con barra neon',
      ],
    },
    {
      name: 'Testimonios',
      module_id: 'testimonials',
      layout_description:
        'Carrusel horizontal de testimonios con foto de autor, nombre, rol y texto de reseña. Estrellas de rating en neon lime. Fondo card oscuro.',
      key_ui_elements: [
        'Título de sección en Oswald bold blanco',
        'Cards de testimonio en carrusel horizontal',
        'Foto de autor circular con borde neon',
        'Nombre en Inter semibold blanco',
        'Rol en Inter regular gris',
        'Estrellas de rating en neon lime',
        'Texto de reseña en Inter regular blanco',
      ],
    },
    {
      name: 'Feed de Noticias',
      module_id: 'news_feed',
      layout_description:
        'Feed vertical de cards con imagen, fecha y extracto. Cards con fondo card oscuro, sin sombras. Títulos cortos y extractos de 2 líneas.',
      key_ui_elements: [
        'Cards con imagen cover arriba',
        'Título en Oswald semibold blanco',
        'Fecha en Inter xs gris',
        'Extracto en Inter regular 2 líneas',
        'Separador subtle entre cards',
      ],
    },
    {
      name: 'Información y Contacto',
      module_id: 'contact',
      layout_description:
        'Formulario minimalista dark con campos de texto, teléfono, email y mensaje. CTA verde neon prominente. Honeypot habilitado para anti-spam.',
      key_ui_elements: [
        'Input con borde inferior 1px gris, focus neon lime',
        'Labels en Inter medium uppercase letter-spacing wide',
        'Placeholders en gris claro',
        'Botón CTA neon lime con texto negro bold',
        'Mensaje de éxito en feedback success color',
      ],
    },
    {
      name: 'Promociones',
      module_id: 'discount_coupon',
      layout_description:
        'Cards de promoción con fondo variant oscuro, borde lateral neon lime de 3px. Muestra expiración, condiciones y contador de uso. Layout vertical con spacing tight.',
      key_ui_elements: [
        'Card con left-border 3px neon lime',
        'Título en Oswald bold blanco',
        'Badge de expiración con icono reloj',
        'Condiciones en Inter regular gris claro',
        'Contador de uso en Inter semibold',
      ],
    },
  ],

  onboarding_hint:
    'Configura primero tu horario de clases semanal con instructores y capacidad. Luego agrega fotos de tus instalaciones para atraer nuevos miembros.',
  suggested_app_name: 'FitForge',
  suggested_icon_concept:
    'Pesa rusa (kettlebell) geometrica estilizada en neon lime sobre fondo negro puro, lineas angulares y minimalistas.',
};
