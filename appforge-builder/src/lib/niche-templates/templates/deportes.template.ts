import type { NicheTemplate } from '../types';

export const deportesTemplate: NicheTemplate = {
  id: 'deportes',
  name: 'GameDay',
  tagline: 'Vive cada partido como si fueras del equipo',
  description:
    'Plantilla dinamica para clubs deportivos, equipos de futbol, ligas locales y asociaciones deportivas. Calendario de partidos, noticias del equipo, galeria y contacto con un diseno energetico y profesional.',
  category: 'sports',
  preview_emoji: '🏟️',
  target_audience:
    'Clubs deportivos, equipos de futbol, baloncesto, ligas amateurs, asociaciones deportivas y academias que quieren mantener informada a su aficion.',

  design_tokens: {
    colors: {
      primary: {
        main: '#1E3A5F',
        dark: '#132841',
        light: '#2E5A8F',
      },
      secondary: {
        main: '#FF6B2C',
        dark: '#D4531E',
        light: '#FF9A6C',
      },
      accent: {
        main: '#FFD700',
        dark: '#CCB000',
        light: '#FFE94D',
      },
      surface: {
        background: '#F4F6F9',
        card: '#FFFFFF',
        variant: '#EAF0F7',
      },
      text: {
        primary: '#121A24',
        secondary: '#5A6B7D',
        on_primary: '#FFFFFF',
      },
      feedback: {
        success: '#22C55E',
        warning: '#FFD700',
        error: '#EF4444',
      },
      navigation: {
        background: '#1E3A5F',
        active: '#FFFFFF',
        inactive: '#7B9CC0',
        indicator: '#FF6B2C',
      },
      extras: {
        divider: '#D9E2EC',
        overlay: 'rgba(18, 26, 36, 0.70)',
        shimmer_base: '#EAF0F7',
        shimmer_highlight: '#FFFFFF',
      },
    },

    typography: {
      families: {
        display: 'Montserrat',
        heading: 'Montserrat',
        body: 'Source Sans 3',
        mono: 'Source Code Pro',
      },
      scale: {
        xs: '0.625rem',
        sm: '0.75rem',
        base: '0.875rem',
        md: '1rem',
        lg: '1.25rem',
        xl: '1.5rem',
        xxl: '2rem',
        xxxl: '2.75rem',
      },
      weight: {
        regular: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
        extrabold: '800',
      },
      line_height: {
        tight: '1.15',
        normal: '1.5',
        relaxed: '1.7',
      },
      letter_spacing: {
        tight: '-0.01em',
        normal: '0em',
        wide: '0.03em',
        wider: '0.08em',
      },
    },

    shape: {
      radius: {
        none: '0px',
        xs: '4px',
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '20px',
        full: '9999px',
      },
      components: {
        card: '10px',
        button: '10px',
        input: '8px',
        badge: '6px',
        image: '10px',
      },
      shadow: {
        sm: '0 1px 4px rgba(30, 58, 95, 0.06)',
        md: '0 3px 12px rgba(30, 58, 95, 0.10)',
        lg: '0 6px 24px rgba(30, 58, 95, 0.14)',
      },
      shadow_color: 'rgba(30, 58, 95, 0.12)',
    },

    spacing: {
      screen_padding_h: '16px',
      screen_padding_v: '20px',
      card_padding: '16px',
      section_gap: '24px',
      item_gap: '12px',
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
      active_indicator: 'pill',
    },

    imagery: {
      hero_aspect_ratio: '16:9',
      card_image_style: 'cover',
      placeholder_style: 'gradient',
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
        name: 'Club Deportivo Titans',
        subtitle: 'Pasión por el deporte',
        description:
          'Club deportivo con secciones de fútbol, baloncesto y atletismo. Calendario de partidos, noticias del equipo y más.',
        quickLinks: [
          { id: '1', type: 'phone', value: '+34 916 555 444' },
          { id: '2', type: 'instagram', value: 'clubtitans' },
          { id: '3', type: 'web', value: 'https://clubtitans.es' },
        ],
        layout: 'overlap',
        coverHeight: 'large',
      },
    },
    {
      module_id: 'events',
      order: 1,
      tab_position: 1,
      tab_label: 'Partidos',
      tab_icon: 'trophy',
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
      module_id: 'video',
      order: 2,
      tab_position: 2,
      tab_label: 'Vídeos',
      tab_icon: 'play-circle',
      is_home: false,
      default_config: {
        title: 'Mejores Momentos',
        videos: [
          {
            id: '1',
            url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            title: 'Resumen temporada 2024',
          },
          {
            id: '2',
            url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            title: 'Highlights última jornada',
          },
        ],
        layout: 'grid',
        columns: 2,
      },
    },
    {
      module_id: 'news_feed',
      order: 3,
      tab_position: 3,
      tab_label: 'Noticias',
      tab_icon: 'newspaper',
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
      module_id: 'photo_gallery',
      order: 4,
      tab_position: null,
      tab_label: 'Fotos',
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
      module_id: 'contact',
      order: 5,
      tab_position: null,
      tab_label: 'Club',
      tab_icon: 'shield',
      is_home: false,
      default_config: {
        formTitle: 'Contacto del Club',
        submitButtonText: 'Enviar',
        successMessage: '¡Mensaje recibido! Te responderemos pronto.',
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
            placeholder: 'Consulta sobre inscripciones, horarios...',
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
      name: 'Inicio del Club',
      module_id: 'hero_profile',
      layout_description:
        'Portada hero con imagen de cover a ancho completo y foto de perfil del club superpuesta en layout overlap. Nombre del club en Montserrat extrabold blanco sobre gradiente oscuro. Subtítulo y descripción debajo. Quick links como iconos circulares (teléfono, Instagram, web) en fila centrada.',
      key_ui_elements: [
        'Cover image grande con gradiente inferior oscuro',
        'Foto de perfil circular superpuesta sobre el cover',
        'Nombre del club en Montserrat extrabold blanco',
        'Subtítulo en naranja energético',
        'Descripción en Source Sans regular',
        'Quick links como iconos circulares azul intenso',
      ],
    },
    {
      name: 'Calendario de Partidos',
      module_id: 'events',
      layout_description:
        'Lista de eventos en formato cards con imagen, ubicación y descripción. Hasta 10 eventos visibles. Cards con bordes redondeados y sombra sutil sobre fondo claro.',
      key_ui_elements: [
        'Cards de evento con imagen destacada',
        'Fecha y hora en Montserrat extrabold',
        'Ubicación con icono de pin y nombre del estadio',
        'Descripción en Source Sans regular 2 líneas',
        'Badge de estado en azul oscuro',
      ],
    },
    {
      name: 'Mejores Momentos',
      module_id: 'video',
      layout_description:
        'Sección de vídeos con título "Mejores Momentos" en Montserrat bold. Grid de 2 columnas con thumbnails de YouTube. Cada vídeo muestra título debajo del thumbnail.',
      key_ui_elements: [
        'Título de sección en Montserrat bold azul oscuro',
        'Grid 2 columnas de thumbnails de vídeo',
        'Icono de play superpuesto en cada thumbnail',
        'Título del vídeo en Source Sans medium',
        'Radius 10px en cada thumbnail',
      ],
    },
    {
      name: 'Noticias del Club',
      module_id: 'news_feed',
      layout_description:
        'Feed de noticias en formato cards con imagen, fecha y extracto. Hasta 5 noticias visibles. Primera noticia como card destacada más grande.',
      key_ui_elements: [
        'Cards de noticia con imagen a la izquierda',
        'Título en Montserrat bold azul oscuro',
        'Fecha como badge naranja',
        'Extracto en Source Sans regular 2 líneas',
        'Separador sutil entre cards',
      ],
    },
    {
      name: 'Galería Deportiva',
      module_id: 'photo_gallery',
      layout_description:
        'Grid de 2 columnas con gap de 4px entre imágenes. Títulos visibles debajo de cada foto. Lightbox habilitado para vista ampliada al tocar.',
      key_ui_elements: [
        'Grid 2 columnas de imágenes',
        'Títulos de foto en Source Sans medium',
        'Radius 10px en cada imagen',
        'Lightbox con navegación lateral',
        'Gap uniforme de 4px entre fotos',
      ],
    },
    {
      name: 'Contacto del Club',
      module_id: 'contact',
      layout_description:
        'Formulario de contacto con título "Contacto del Club". Tres campos: nombre, email y mensaje. Botón de envío naranja energético. Protección honeypot activada.',
      key_ui_elements: [
        'Título del formulario en Montserrat bold azul oscuro',
        'Campos de input con borde azul sutil y radius 8px',
        'Campo textarea para mensaje con placeholder descriptivo',
        'Botón "Enviar" naranja energético con texto blanco',
        'Mensaje de éxito en verde feedback',
      ],
    },
  ],

  onboarding_hint:
    'Sube el escudo de tu club como logo, configura los proximos partidos con fechas y ubicaciones, y empieza a publicar cronicas para mantener informada a tu aficion.',
  suggested_app_name: 'Mi Club',
  suggested_icon_concept:
    'Escudo deportivo estilizado con forma hexagonal, azul intenso con detalles en naranja energetico, estrellas o balones en la parte superior.',
};
