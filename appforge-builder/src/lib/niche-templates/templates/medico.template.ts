import type { NicheTemplate } from '../types';

export const medicoTemplate: NicheTemplate = {
  id: 'medico',
  name: 'MedCenter',
  tagline: 'Tu salud, nuestra prioridad digital',
  description:
    'Plantilla profesional para consultorios médicos, clínicas y centros de salud. Información clara sobre especialidades, contacto directo, artículos de salud y documentos para pacientes.',
  category: 'health',
  preview_emoji: '🏥',
  target_audience:
    'Consultorios médicos, clínicas privadas, centros de salud, consultas de especialistas, policlínicos',

  design_tokens: {
    colors: {
      primary: {
        main: '#0D7377',
        dark: '#095557',
        light: '#3A9EA1',
      },
      secondary: {
        main: '#4FC3F7',
        dark: '#0395D6',
        light: '#B3E5FC',
      },
      accent: {
        main: '#0D7377',
        dark: '#095557',
        light: '#3A9EA1',
      },
      surface: {
        background: '#F0F4F8',
        card: '#FFFFFF',
        variant: '#E8EEF4',
      },
      text: {
        primary: '#1A2B3C',
        secondary: '#5A6E7F',
        on_primary: '#FFFFFF',
      },
      feedback: {
        success: '#00C853',
        warning: '#FFB300',
        error: '#E53935',
      },
      navigation: {
        background: '#FFFFFF',
        active: '#0D7377',
        inactive: '#90A4AE',
        indicator: '#0D7377',
      },
      extras: {
        divider: '#DAE3EC',
        overlay: 'rgba(26, 43, 60, 0.50)',
        shimmer_base: '#E8EEF4',
        shimmer_highlight: '#F0F4F8',
      },
    },

    typography: {
      families: {
        display: 'DM Sans',
        heading: 'DM Sans',
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
        tight: '1.25',
        normal: '1.5',
        relaxed: '1.7',
      },
      letter_spacing: {
        tight: '-0.01em',
        normal: '0em',
        wide: '0.015em',
        wider: '0.03em',
      },
    },

    shape: {
      radius: {
        none: '0px',
        xs: '3px',
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
        badge: '9999px',
        image: '10px',
      },
      shadow: {
        sm: '0 1px 2px 0 var(--shadow-color)',
        md: '0 2px 8px -1px var(--shadow-color), 0 1px 4px -1px var(--shadow-color)',
        lg: '0 6px 16px -3px var(--shadow-color), 0 3px 8px -3px var(--shadow-color)',
      },
      shadow_color: 'rgba(13, 115, 119, 0.06)',
    },

    spacing: {
      screen_padding_h: '20px',
      screen_padding_v: '24px',
      card_padding: '18px',
      section_gap: '28px',
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
      icon_style: 'outline',
      active_indicator: 'underline',
    },

    imagery: {
      hero_aspect_ratio: '16:9',
      card_image_style: 'cover',
      placeholder_style: 'solid',
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
        name: 'Dr. Alejandro Rivera',
        subtitle: 'Medicina General y Preventiva',
        description:
          'Consulta médica profesional con enfoque preventivo y personalizado. Más de 15 años de experiencia cuidando de tu salud y la de tu familia.',
        quickLinks: [
          { id: '1', type: 'phone', value: '+34 913 888 777' },
          { id: '2', type: 'email', value: 'consulta@drrivera.com' },
          { id: '3', type: 'whatsapp', value: '+34613888777' },
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
        title: 'Pedir Cita Médica',
        description: 'Selecciona el horario que mejor se adapte a ti.',
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
      tab_position: 2,
      tab_label: 'Especialidades',
      tab_icon: 'stethoscope',
      is_home: false,
      default_config: {
        htmlContent:
          '<h2>Especialidades</h2><ul><li><strong>Medicina general</strong> — Diagnóstico y tratamiento integral</li><li><strong>Medicina preventiva</strong> — Chequeos periódicos y vacunación</li><li><strong>Cardiología básica</strong> — Electrocardiograma y control de tensión</li><li><strong>Dermatología</strong> — Revisión de lunares y problemas cutáneos</li><li><strong>Analíticas</strong> — Análisis de sangre y seguimiento</li></ul><p>Consulta presencial y telemedicina disponibles.</p>',
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
      tab_icon: 'message-circle',
      is_home: false,
      default_config: {
        title: 'Opiniones de pacientes',
        testimonials: [
          {
            id: '1',
            text: 'El Dr. Rivera es muy cercano y explica todo con claridad. Me siento en muy buenas manos.',
            authorName: 'Teresa Navarro',
            authorRole: 'Paciente habitual',
            authorImageUrl: '',
            rating: 5,
          },
          {
            id: '2',
            text: 'Por fin un médico que escucha. Las consultas no se sienten apresuradas.',
            authorName: 'Francisco Gil',
            authorRole: 'Paciente nuevo',
            authorImageUrl: '',
            rating: 5,
          },
          {
            id: '3',
            text: 'Llevo toda mi familia con él. Confianza total después de tantos años.',
            authorName: 'María José Ruiz',
            authorRole: 'Paciente desde 2015',
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
      tab_position: 3,
      tab_label: 'Contacto',
      tab_icon: 'mail',
      is_home: false,
      default_config: {
        formTitle: 'Contacto',
        submitButtonText: 'Enviar consulta',
        successMessage: '¡Gracias! Responderemos a la mayor brevedad.',
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
      tab_label: 'Salud',
      tab_icon: 'heart-pulse',
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
      module_id: 'pdf_reader',
      order: 6,
      tab_position: null,
      tab_label: 'Docs',
      tab_icon: 'file-text',
      is_home: false,
      default_config: {
        pdfUrl: '',
        title: 'Información para pacientes',
        showTitle: true,
        fileName: '',
      },
    },
  ],

  screens: [
    {
      name: 'Inicio (Perfil)',
      module_id: 'hero_profile',
      layout_description:
        'Perfil profesional del doctor con foto de portada, imagen de perfil superpuesta, nombre, especialidad, descripción y enlaces rápidos de contacto',
      key_ui_elements: [
        'Imagen de portada con layout overlap',
        'Foto de perfil circular superpuesta',
        'Nombre y especialidad con tipografía profesional',
        'Botones rápidos de teléfono, email y WhatsApp',
      ],
    },
    {
      name: 'Pedir Cita',
      module_id: 'booking',
      layout_description:
        'Sistema de reserva de citas con selector de fecha, franja horaria y formulario de datos del paciente',
      key_ui_elements: [
        'Calendario para selección de fecha',
        'Grid de franjas horarias disponibles (mañana y tarde)',
        'Formulario con nombre, teléfono, email y motivo de consulta',
        'Botón de envío "Solicitar Cita"',
      ],
    },
    {
      name: 'Especialidades',
      module_id: 'custom_page',
      layout_description:
        'Página HTML con listado de especialidades médicas ofrecidas, descripción breve de cada una',
      key_ui_elements: [
        'Título "Especialidades"',
        'Lista con nombre en negrita y descripción por especialidad',
        'Nota sobre consulta presencial y telemedicina',
      ],
    },
    {
      name: 'Opiniones de pacientes',
      module_id: 'testimonials',
      layout_description:
        'Carrusel de testimonios de pacientes con valoración de estrellas, nombre y rol del autor',
      key_ui_elements: [
        'Cards de testimonio en formato carrusel',
        'Valoración de 5 estrellas por testimonio',
        'Nombre del paciente y relación con la consulta',
        'Foto de autor opcional',
      ],
    },
    {
      name: 'Contacto',
      module_id: 'contact',
      layout_description:
        'Formulario de contacto con campos de nombre, teléfono, email y mensaje, protección anti-spam con honeypot',
      key_ui_elements: [
        'Campos de formulario con placeholders descriptivos',
        'Botón "Enviar consulta"',
        'Mensaje de confirmación tras envío exitoso',
        'Protección honeypot contra spam',
      ],
    },
    {
      name: 'Artículos de Salud',
      module_id: 'news_feed',
      layout_description:
        'Feed de artículos en tarjetas con imagen, fecha y extracto, mostrando 5 elementos',
      key_ui_elements: [
        'Tarjetas de artículo con imagen destacada',
        'Fecha de publicación visible',
        'Extracto del contenido',
        'Layout tipo cards',
      ],
    },
    {
      name: 'Información para pacientes',
      module_id: 'pdf_reader',
      layout_description:
        'Visor de documentos PDF con título visible para material informativo destinado a pacientes',
      key_ui_elements: [
        'Título "Información para pacientes"',
        'Visor de PDF integrado',
        'Soporte para carga de archivo PDF',
      ],
    },
  ],

  onboarding_hint:
    'Comienza editando la página de inicio con la información de tu centro médico y especialidades. Luego configura el formulario de citas con tus datos de contacto reales.',
  suggested_app_name: 'MedCenter Salud',
  suggested_icon_concept:
    'Cruz médica estilizada con esquinas redondeadas en teal sobre fondo blanco, transmite profesionalidad y confianza',
};
