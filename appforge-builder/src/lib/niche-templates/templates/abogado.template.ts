import type { NicheTemplate } from '../types';

export const abogadoTemplate: NicheTemplate = {
  id: 'abogado',
  name: 'Legalis',
  tagline: 'Defensa legal sólida y confiable',
  description:
    'Plantilla seria y corporativa para abogados, bufetes y asesores legales. Transmite confianza y profesionalismo con una paleta de colores cálida y tipografía clásica.',
  category: 'professional',
  preview_emoji: '⚖️',
  target_audience:
    'Abogados independientes, despachos legales, firmas de asesores jurídicos y notarías.',

  design_tokens: {
    colors: {
      primary: {
        main: '#7B3D1D',
        dark: '#5E2E16',
        light: '#9A502D',
      },
      secondary: {
        main: '#2C3E50',
        dark: '#1A252F',
        light: '#34495E',
      },
      accent: {
        main: '#FB9B6B',
        dark: '#E07E4C',
        light: '#FDC4A5',
      },
      surface: {
        background: '#FDFDFD',
        card: '#FFFFFF',
        variant: '#F8F5F2',
      },
      text: {
        primary: '#1F2937',
        secondary: '#4B5563',
        on_primary: '#FFFFFF',
      },
      feedback: {
        success: '#10B981',
        warning: '#FBBF24',
        error: '#EF4444',
      },
      navigation: {
        background: '#FFFFFF',
        active: '#7B3D1D',
        inactive: '#9CA3AF',
        indicator: '#7B3D1D',
      },
      extras: {
        divider: '#E5E7EB',
        overlay: 'rgba(31, 41, 55, 0.40)',
        shimmer_base: '#F3F4F6',
        shimmer_highlight: '#FFFFFF',
      },
    },

    typography: {
      families: {
        display: 'Nanum Myeongjo',
        heading: 'Hedvig Letters Serif',
        body: 'Nanum Myeongjo',
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
        xs: '2px',
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        full: '9999px',
      },
      components: {
        card: '8px',
        button: '4px',
        input: '4px',
        badge: '9999px',
        image: '8px',
      },
      shadow: {
        sm: '0 2px 4px rgba(123, 61, 29, 0.05)',
        md: '0 4px 8px rgba(123, 61, 29, 0.08)',
        lg: '0 8px 16px rgba(123, 61, 29, 0.12)',
      },
      shadow_color: 'rgba(123, 61, 29, 0.1)',
    },

    spacing: {
      screen_padding_h: '24px',
      screen_padding_v: '32px',
      card_padding: '24px',
      section_gap: '40px',
      item_gap: '16px',
      icon_size: {
        sm: '16px',
        md: '24px',
        lg: '32px',
      },
    },

    navigation: {
      style: 'bottom_tabs',
      tab_count: 3,
      show_labels: true,
      label_size: '0.75rem',
      icon_style: 'outline',
      active_indicator: 'underline',
    },

    imagery: {
      hero_aspect_ratio: '3:2',
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
      tab_label: 'Firma',
      tab_icon: 'briefcase',
      is_home: true,
      default_config: {
        coverImageUrl: '',
        profileImageUrl: '',
        name: 'Gómez & Asociados',
        subtitle: 'Defensa Penal y Civil',
        description:
          'Más de 20 años de experiencia litigando en tribunales. Su tranquilidad es nuestra meta prioritaria.',
        quickLinks: [
          { id: '1', type: 'phone', value: '+34 914 555 666' },
          { id: '2', type: 'email', value: 'contacto@gomez-law.com' },
          { id: '3', type: 'whatsapp', value: '+34614555666' },
        ],
        layout: 'overlap',
        coverHeight: 'medium',
      },
    },
    {
      module_id: 'custom_page',
      order: 1,
      tab_position: 1,
      tab_label: 'Áreas',
      tab_icon: 'scale',
      is_home: false,
      default_config: {
        htmlContent:
          '<h3>Derecho Penal</h3><p>Asistencia en detenciones, juicios rápidos y delitos económicos.</p><h3>Derecho Civil</h3><p>Divorcios, herencias, contratos y reclamaciones de cantidad.</p><h3>Derecho Laboral</h3><p>Despidos, incapacidades y mediación sindical.</p>',
        backgroundColor: '#ffffff',
        padding: 24,
        maxWidth: 'full',
      },
    },
    {
      module_id: 'contact',
      order: 2,
      tab_position: 2,
      tab_label: 'Consulta',
      tab_icon: 'mail',
      is_home: false,
      default_config: {
        formTitle: 'Solicite Asesoría',
        submitButtonText: 'Enviar Mensaje',
        successMessage: 'Le responderemos en menos de 24 horas.',
        fields: [
          { id: '1', type: 'text', label: 'Nombre Legal', required: true },
          { id: '2', type: 'tel', label: 'Teléfono', required: true },
          {
            id: '3',
            type: 'textarea',
            label: 'Descripción breve de su caso',
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
      name: 'Firma',
      module_id: 'hero_profile',
      layout_description: 'Perfil serio de la firma de abogados con tono corporativo.',
      key_ui_elements: ['Tipografía Serif', 'Colores cobrizos/terracota'],
    },
  ],

  onboarding_hint:
    'Añade tu número de colegiado y tus áreas de práctica principales. La transparencia atraerá a más clientes.',
  suggested_app_name: 'LegalApp',
  suggested_icon_concept:
    'Balanza de la justicia en tonos terracota sobre fondo blanco puro, estilo clásico e institucional.',
};
