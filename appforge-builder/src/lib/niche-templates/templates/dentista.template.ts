import type { NicheTemplate } from '../types';

export const dentistaTemplate: NicheTemplate = {
  id: 'dentista',
  name: 'SmileCare',
  tagline: 'La sonrisa de tus pacientes empieza aqui',
  description:
    'Plantilla profesional y limpia para clinicas dentales y consultorios odontologicos. Transmite confianza y modernidad con un diseno institucional que prioriza la claridad y la facilidad de uso para los pacientes.',
  category: 'health',
  preview_emoji: '🦷',
  target_audience:
    'Clinicas dentales, consultorios odontologicos, ortodoncistas, clinicas de estetica dental y profesionales de la salud bucal.',

  design_tokens: {
    colors: {
      primary: {
        main: '#2563EB',
        dark: '#1D4ED8',
        light: '#60A5FA',
      },
      secondary: {
        main: '#0F766E',
        dark: '#0D5D57',
        light: '#2DD4BF',
      },
      accent: {
        main: '#7C3AED',
        dark: '#6D28D9',
        light: '#A78BFA',
      },
      surface: {
        background: '#F8FAFC',
        card: '#FFFFFF',
        variant: '#EFF6FF',
      },
      text: {
        primary: '#0F172A',
        secondary: '#64748B',
        on_primary: '#FFFFFF',
      },
      feedback: {
        success: '#16A34A',
        warning: '#F59E0B',
        error: '#DC2626',
      },
      navigation: {
        background: '#FFFFFF',
        active: '#2563EB',
        inactive: '#94A3B8',
        indicator: '#2563EB',
      },
      extras: {
        divider: '#E2E8F0',
        overlay: 'rgba(15, 23, 42, 0.50)',
        shimmer_base: '#EFF6FF',
        shimmer_highlight: '#FFFFFF',
      },
    },

    typography: {
      families: {
        display: 'Inter',
        heading: 'Inter',
        body: 'Inter',
        mono: 'Roboto Mono',
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
        normal: '1.6',
        relaxed: '1.8',
      },
      letter_spacing: {
        tight: '-0.01em',
        normal: '0em',
        wide: '0.02em',
        wider: '0.06em',
      },
    },

    shape: {
      radius: {
        none: '0px',
        xs: '4px',
        sm: '6px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        full: '9999px',
      },
      components: {
        card: '12px',
        button: '12px',
        input: '10px',
        badge: '9999px',
        image: '12px',
      },
      shadow: {
        sm: '0 1px 3px rgba(15, 23, 42, 0.04), 0 1px 2px rgba(15, 23, 42, 0.06)',
        md: '0 4px 12px rgba(15, 23, 42, 0.06), 0 2px 4px rgba(15, 23, 42, 0.04)',
        lg: '0 8px 24px rgba(15, 23, 42, 0.08), 0 4px 8px rgba(15, 23, 42, 0.04)',
      },
      shadow_color: 'rgba(15, 23, 42, 0.06)',
    },

    spacing: {
      screen_padding_h: '20px',
      screen_padding_v: '24px',
      card_padding: '20px',
      section_gap: '28px',
      item_gap: '14px',
      icon_size: {
        sm: '18px',
        md: '22px',
        lg: '28px',
      },
    },

    navigation: {
      style: 'bottom_tabs',
      tab_count: 3,
      show_labels: true,
      label_size: '0.625rem',
      icon_style: 'outline',
      active_indicator: 'pill',
    },

    imagery: {
      hero_aspect_ratio: '3:2',
      card_image_style: 'cover',
      placeholder_style: 'icon',
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
        name: 'Clínica Dental Sonrisa',
        subtitle: 'Tu sonrisa, nuestra prioridad',
        description:
          'Clínica dental especializada en implantología, ortodoncia y estética dental. Tecnología de última generación y equipo profesional.',
        quickLinks: [
          { id: '1', type: 'phone', value: '+34 914 333 222' },
          { id: '2', type: 'email', value: 'citas@clinicasonrisa.com' },
          { id: '3', type: 'whatsapp', value: '+34614333222' },
        ],
        layout: 'overlap',
        coverHeight: 'medium',
      },
    },
    {
      module_id: 'booking',
      order: 1,
      tab_position: 1,
      tab_label: 'Cita',
      tab_icon: 'calendar',
      is_home: false,
      default_config: {
        title: 'Pedir Cita',
        description: 'Reserva tu cita de forma rápida y sencilla.',
        timeSlots: [
          '09:00',
          '09:30',
          '10:00',
          '10:30',
          '11:00',
          '11:30',
          '12:00',
          '12:30',
          '16:00',
          '16:30',
          '17:00',
          '17:30',
          '18:00',
          '18:30',
          '19:00',
        ],
        slotDuration: 30,
        fields: [
          { id: '1', type: 'text', label: 'Nombre completo', required: true },
          { id: '2', type: 'phone', label: 'Teléfono', required: true },
          { id: '3', type: 'email', label: 'Email', required: true },
          {
            id: '4',
            type: 'textarea',
            label: 'Motivo de consulta',
            required: false,
          },
        ],
        submitButtonText: 'Solicitar Cita',
      },
    },
    {
      module_id: 'custom_page',
      order: 2,
      tab_position: null,
      tab_label: 'Servicios',
      tab_icon: 'heart',
      is_home: false,
      default_config: {
        htmlContent:
          '<h2>Nuestros Servicios</h2><ul><li><strong>Implantes dentales</strong> — Soluciones permanentes con materiales de primera calidad</li><li><strong>Ortodoncia invisible</strong> — Alineadores transparentes para adultos y adolescentes</li><li><strong>Blanqueamiento dental</strong> — Resultados visibles en una sola sesión</li><li><strong>Odontopediatría</strong> — Cuidado dental especializado para los más pequeños</li><li><strong>Endodoncia</strong> — Tratamiento de conductos con tecnología avanzada</li></ul>',
        backgroundColor: '#ffffff',
        padding: 16,
        maxWidth: 'full',
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
        title: 'Opiniones de nuestros pacientes',
        testimonials: [
          {
            id: '1',
            text: 'Tenía pánico al dentista y aquí me han tratado con una paciencia increíble. Mi sonrisa ha cambiado por completo.',
            authorName: 'Elena Martín',
            authorRole: 'Paciente de ortodoncia',
            authorImageUrl: '',
            rating: 5,
          },
          {
            id: '2',
            text: 'Profesionales de primera. El implante quedó perfecto y el proceso fue mucho más sencillo de lo que esperaba.',
            authorName: 'Roberto Sánchez',
            authorRole: 'Paciente de implantología',
            authorImageUrl: '',
            rating: 5,
          },
          {
            id: '3',
            text: 'Llevo a mis hijos desde pequeños. El trato con los niños es excepcional.',
            authorName: 'Carmen López',
            authorRole: 'Madre de pacientes',
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
      module_id: 'contact',
      order: 4,
      tab_position: 2,
      tab_label: 'Contacto',
      tab_icon: 'mail',
      is_home: false,
      default_config: {
        formTitle: 'Contacto',
        submitButtonText: 'Enviar consulta',
        successMessage: '¡Gracias! Te responderemos a la mayor brevedad.',
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
            label: 'Consulta',
            placeholder: 'Describe tu consulta...',
            required: false,
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
      tab_label: 'Noticias',
      tab_icon: 'book-open',
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
      name: 'Inicio — Perfil de la Clínica',
      module_id: 'hero_profile',
      layout_description:
        'Imagen de portada superior con layout overlap: foto de perfil circular superpuesta en la parte inferior de la portada. Nombre de la clínica en Inter bold, subtítulo en Inter regular gris, descripción breve y quick links (teléfono, email, WhatsApp) como iconos circulares interactivos.',
      key_ui_elements: [
        'Cover image con altura media y overlay gradiente sutil',
        'Foto de perfil circular superpuesta con borde blanco',
        'Nombre en Inter bold azul oscuro centrado',
        'Subtítulo en Inter regular gris',
        'Quick links como iconos circulares azul institucional',
      ],
    },
    {
      name: 'Pedir Cita',
      module_id: 'booking',
      layout_description:
        'Pantalla de reserva con título y descripción superior. Selector de fecha tipo calendario y grid de franjas horarias disponibles. Formulario con campos de nombre, teléfono, email y motivo de consulta. Botón de envío azul institucional.',
      key_ui_elements: [
        'Título "Pedir Cita" en Inter semibold',
        'Selector de fecha con estilo calendario limpio',
        'Grid de time slots como chips seleccionables azul claro',
        'Campos de formulario con borde gris claro y radius 10px',
        'Botón CTA azul sólido "Solicitar Cita"',
      ],
    },
    {
      name: 'Nuestros Servicios',
      module_id: 'custom_page',
      layout_description:
        'Página HTML con listado de servicios dentales. Título H2 seguido de lista con nombres en negrita y descripciones cortas separadas por guiones. Fondo blanco, padding 16px, ancho completo.',
      key_ui_elements: [
        'Título H2 en Inter bold azul oscuro',
        'Lista UL con items bien espaciados',
        'Nombres de servicio en strong/negrita',
        'Descripciones en Inter regular gris oscuro',
        'Fondo blanco limpio con padding uniforme',
      ],
    },
    {
      name: 'Opiniones de Pacientes',
      module_id: 'testimonials',
      layout_description:
        'Carrusel horizontal de testimonios con cards blancas y sombra suave. Cada card muestra rating de 5 estrellas, texto del testimonio en cursiva, nombre del autor y su rol. Navegación por dots o swipe.',
      key_ui_elements: [
        'Título sección "Opiniones de nuestros pacientes"',
        'Cards en carrusel con shadow-md y radius 12px',
        'Rating de estrellas amarillas (5/5)',
        'Texto del testimonio en Inter regular cursiva',
        'Nombre del autor en Inter semibold',
        'Rol del autor en Inter sm gris',
      ],
    },
    {
      name: 'Formulario de Contacto',
      module_id: 'contact',
      layout_description:
        'Formulario de contacto limpio con campos de nombre, teléfono, email y área de texto para consulta. Botón de envío azul. Mensaje de éxito tras enviar. Protección honeypot habilitada.',
      key_ui_elements: [
        'Título "Contacto" en Inter semibold',
        'Campos con placeholders descriptivos y borde gris claro',
        'Focus state con borde azul institucional',
        'Botón CTA azul sólido "Enviar consulta"',
        'Mensaje de éxito en card verde claro',
      ],
    },
    {
      name: 'Noticias y Blog',
      module_id: 'news_feed',
      layout_description:
        'Feed vertical de artículos como cards blancas con imagen superior, fecha y extracto. Muestra 5 artículos por carga. Layout tipo cards con sombra suave y bordes redondeados.',
      key_ui_elements: [
        'Cards blancas con shadow-sm y radius 12px',
        'Imagen top con radius superior',
        'Título en Inter semibold azul oscuro',
        'Fecha en Inter xs gris',
        'Extracto en Inter regular gris oscuro',
      ],
    },
  ],

  onboarding_hint:
    'Personaliza la lista de servicios con tus tratamientos y precios reales. Configura el telefono de emergencias y el mapa de tu clinica para que los pacientes te encuentren facilmente.',
  suggested_app_name: 'SmileCare',
  suggested_icon_concept:
    'Diente estilizado con una sonrisa sutil integrada, azul institucional sobre fondo blanco, lineas limpias y profesionales con un toque de celeste como brillo.',
};
