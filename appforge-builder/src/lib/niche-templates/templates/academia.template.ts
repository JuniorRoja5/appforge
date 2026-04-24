import type { NicheTemplate } from '../types';

export const academiaTemplate: NicheTemplate = {
  id: 'academia',
  name: 'EduPro',
  tagline: 'Aprende sin límites, crece sin parar',
  description:
    'Plantilla diseñada para academias, centros de formación, escuelas de idiomas y autoescuelas. Agenda de eventos y clases, noticias del centro, materiales descargables en PDF y contacto directo. Diseño profesional, limpio y accesible.',
  category: 'education',
  preview_emoji: '🎓',
  target_audience:
    'Academias de idiomas, centros de formación profesional, autoescuelas, escuelas de música, centros de estudios y cualquier institución educativa que quiera mantener informados a sus alumnos.',

  design_tokens: {
    colors: {
      primary: {
        main: '#1A365D',
        dark: '#0F2340',
        light: '#2C5282',
      },
      secondary: {
        main: '#F6C619',
        dark: '#D4A90F',
        light: '#FAD95A',
      },
      accent: {
        main: '#3182CE',
        dark: '#2563A8',
        light: '#63A4E0',
      },
      surface: {
        background: '#F7F8FC',
        card: '#FFFFFF',
        variant: '#EEF0F8',
      },
      text: {
        primary: '#1A202C',
        secondary: '#5A6178',
        on_primary: '#FFFFFF',
      },
      feedback: {
        success: '#38A169',
        warning: '#DD6B20',
        error: '#E53E3E',
      },
      navigation: {
        background: '#1A365D',
        active: '#F6C619',
        inactive: '#8899B8',
        indicator: '#F6C619',
      },
      extras: {
        divider: 'rgba(26, 54, 93, 0.10)',
        overlay: 'rgba(26, 32, 44, 0.55)',
        shimmer_base: '#EEF0F8',
        shimmer_highlight: '#F7F8FC',
      },
    },

    typography: {
      families: {
        display: 'Plus Jakarta Sans',
        heading: 'Plus Jakarta Sans',
        body: 'Plus Jakarta Sans',
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
        tight: '1.25',
        normal: '1.5',
        relaxed: '1.7',
      },
      letter_spacing: {
        tight: '-0.02em',
        normal: '0',
        wide: '0.01em',
        wider: '0.05em',
      },
    },

    shape: {
      radius: {
        none: '0',
        xs: '4px',
        sm: '6px',
        md: '10px',
        lg: '12px',
        xl: '18px',
        full: '9999px',
      },
      components: {
        card: '12px',
        button: '10px',
        input: '8px',
        badge: '6px',
        image: '12px',
      },
      shadow: {
        sm: '0 1px 3px 0',
        md: '0 3px 10px 0',
        lg: '0 6px 22px 0',
      },
      shadow_color: 'rgba(26, 54, 93, 0.10)',
    },

    spacing: {
      screen_padding_h: '18px',
      screen_padding_v: '20px',
      card_padding: '16px',
      section_gap: '24px',
      item_gap: '12px',
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
      active_indicator: 'underline',
    },

    imagery: {
      hero_aspect_ratio: '16:9',
      card_image_style: 'cover',
      placeholder_style: 'icon',
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
        name: 'Academia Saber+',
        subtitle: 'Aprende con los mejores',
        description:
          'Centro de formación con cursos presenciales y online. Profesores expertos, material actualizado y metodología práctica.',
        quickLinks: [
          { id: '1', type: 'phone', value: '+34 917 999 888' },
          { id: '2', type: 'email', value: 'info@academiaaber.com' },
          { id: '3', type: 'instagram', value: 'academiasabermas' },
        ],
        layout: 'overlap',
        coverHeight: 'medium',
      },
    },
    {
      module_id: 'events',
      order: 1,
      tab_position: 1,
      tab_label: 'Agenda',
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
      module_id: 'video',
      order: 2,
      tab_position: null,
      tab_label: 'Vídeos',
      tab_icon: 'play-circle',
      is_home: false,
      default_config: {
        title: 'Clases y Tutoriales',
        videos: [
          {
            id: '1',
            url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            title: 'Introducción a nuestros cursos',
          },
          {
            id: '2',
            url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            title: 'Metodología de enseñanza',
          },
        ],
        layout: 'grid',
        columns: 2,
      },
    },
    {
      module_id: 'news_feed',
      order: 3,
      tab_position: 2,
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
      module_id: 'testimonials',
      order: 4,
      tab_position: null,
      tab_label: 'Opiniones',
      tab_icon: 'message-circle',
      is_home: false,
      default_config: {
        title: 'Lo que dicen nuestros alumnos',
        testimonials: [
          {
            id: '1',
            text: 'Aprobé las oposiciones gracias a esta academia. Los profesores son los mejores.',
            authorName: 'Daniel Pérez',
            authorRole: 'Alumno de oposiciones',
            authorImageUrl: '',
            rating: 5,
          },
          {
            id: '2',
            text: 'El curso de inglés B2 me ayudó a conseguir mi certificado oficial. Muy recomendable.',
            authorName: 'Sara Jiménez',
            authorRole: 'Alumna de idiomas',
            authorImageUrl: '',
            rating: 5,
          },
          {
            id: '3',
            text: 'Flexibilidad horaria y grupos reducidos. Ideal para compaginar con el trabajo.',
            authorName: 'Miguel Ángel Torres',
            authorRole: 'Alumno nocturno',
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
      module_id: 'pdf_reader',
      order: 5,
      tab_position: 3,
      tab_label: 'Materiales',
      tab_icon: 'file-text',
      is_home: false,
      default_config: {
        pdfUrl: '',
        title: 'Catálogo de Cursos',
        showTitle: true,
        fileName: '',
      },
    },
    {
      module_id: 'contact',
      order: 6,
      tab_position: null,
      tab_label: 'Contacto',
      tab_icon: 'phone',
      is_home: false,
      default_config: {
        formTitle: 'Información y Matrícula',
        submitButtonText: 'Solicitar información',
        successMessage: '¡Gracias! Te enviaremos toda la información.',
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
            label: 'Curso de interés',
            placeholder: '¿Qué curso te interesa?',
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
        'Perfil hero con imagen de portada en formato overlap. Nombre de la academia prominente en Plus Jakarta Sans Bold, subtítulo debajo, descripción del centro y enlaces rápidos (teléfono, email, Instagram) como botones de acción circular en fila.',
      key_ui_elements: [
        'Imagen de portada con altura media y overlay degradado',
        'Imagen de perfil circular superpuesta al borde de la portada',
        'Nombre y subtítulo centrados debajo del perfil',
        'Descripción del centro en texto secundario',
        'Botones de acción rápida: llamar, email, Instagram',
      ],
    },
    {
      name: 'Agenda de Eventos',
      module_id: 'events',
      layout_description:
        'Feed de tarjetas de eventos con imagen, ubicación y descripción. Cada tarjeta tiene radius 12px, sombra sutil y borde izquierdo azul profundo. Diseño tipo cards con información clara de fecha y lugar.',
      key_ui_elements: [
        'Tarjetas de evento con imagen destacada',
        'Ubicación con icono de pin en texto secundario',
        'Descripción del evento visible en la tarjeta',
        'Fecha y hora destacadas con icono de reloj',
        'Scroll vertical con hasta 10 eventos visibles',
      ],
    },
    {
      name: 'Clases y Tutoriales',
      module_id: 'video',
      layout_description:
        'Galería de vídeos en cuadrícula de 2 columnas. Cada vídeo muestra thumbnail con botón de play superpuesto y título debajo. Cabecera con título de sección en Plus Jakarta Sans Bold.',
      key_ui_elements: [
        'Grid de 2 columnas con thumbnails de vídeo',
        'Icono de play centrado sobre cada thumbnail',
        'Título del vídeo debajo de cada thumbnail',
        'Título de sección "Clases y Tutoriales" en cabecera',
      ],
    },
    {
      name: 'Noticias del Centro',
      module_id: 'news_feed',
      layout_description:
        'Feed limpio con tarjetas de noticia. Imagen hero 16:9 con overlay degradado oscuro y título en blanco superpuesto. Debajo, fecha y extracto en 2 líneas. Tarjetas con radius 12px y sombras sutiles.',
      key_ui_elements: [
        'Imagen hero con overlay degradado oscuro',
        'Título en blanco sobre la imagen',
        'Fecha de publicación con icono calendario',
        'Extracto de 2 líneas en texto secundario',
        'Botón "Leer más" en azul accent',
      ],
    },
    {
      name: 'Opiniones de Alumnos',
      module_id: 'testimonials',
      layout_description:
        'Carrusel horizontal de testimonios. Cada tarjeta muestra texto del testimonio entre comillas, nombre del alumno, rol y puntuación con estrellas amarillas. Fondo blanco con sombra sutil y bordes redondeados.',
      key_ui_elements: [
        'Carrusel horizontal con snap de tarjetas',
        'Texto del testimonio en Plus Jakarta Sans Medium',
        'Estrellas de puntuación en amarillo académico',
        'Nombre y rol del alumno en texto secundario',
        'Indicadores de paginación debajo del carrusel',
      ],
    },
    {
      name: 'Catálogo de Cursos',
      module_id: 'pdf_reader',
      layout_description:
        'Visor de PDF con título "Catálogo de Cursos" en cabecera. Área principal para renderizar el documento PDF. Diseño limpio centrado en la lectura del contenido.',
      key_ui_elements: [
        'Título "Catálogo de Cursos" en Plus Jakarta Sans SemiBold',
        'Visor de PDF a ancho completo',
        'Controles de navegación de páginas',
        'Indicador de carga mientras se descarga el PDF',
      ],
    },
    {
      name: 'Información y Matrícula',
      module_id: 'contact',
      layout_description:
        'Formulario profesional con campos sobre fondo blanco. Labels en azul profundo, inputs con borde gris y focus azul. Botón azul profundo grande. Campos de nombre, teléfono, email y curso de interés.',
      key_ui_elements: [
        'Título "Información y Matrícula" en cabecera',
        'Campos de formulario con labels en azul profundo',
        'Input focus state con borde azul accent',
        'Campo textarea para curso de interés',
        'Botón "Solicitar información" azul profundo',
        'Mensaje de éxito tras envío exitoso',
      ],
    },
  ],

  onboarding_hint:
    'Configura la agenda con tus próximas clases y exámenes. Sube materiales útiles para tus alumnos a la sección de documentos. ¡Tus estudiantes tendrán toda la información de la academia en su bolsillo!',
  suggested_app_name: 'EduPro Academia',
  suggested_icon_concept:
    'Birrete de graduación estilizado en azul profundo con borla amarilla académica, sobre fondo claro. Formas geométricas limpias, aspecto profesional y moderno.',
};
