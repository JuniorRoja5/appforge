import type { NicheTemplate } from '../types';

export const fotografoTemplate: NicheTemplate = {
  id: 'fotografo',
  name: 'Capture',
  tagline: 'Tu portafolio fotográfico profesional',
  description:
    'Plantilla diseñada específicamente para fotógrafos, videógrafos y artistas visuales. Destaca tu trabajo con galerías de alta resolución y un diseño cautivador.',
  category: 'lifestyle',
  preview_emoji: '📸',
  target_audience:
    'Fotógrafos de bodas, moda, producto, paisajes, videógrafos y creadores de contenido visual.',

  design_tokens: {
    colors: {
      primary: {
        main: '#ff7e5f',
        dark: '#e06b4d',
        light: '#feb47b',
      },
      secondary: {
        main: '#2a2a2a',
        dark: '#1f1f1f',
        light: '#3f3f3f',
      },
      accent: {
        main: '#feb47b',
        dark: '#e09860',
        light: '#ffd29e',
      },
      surface: {
        background: '#1a1a1a',
        card: '#242424',
        variant: '#2d2d2d',
      },
      text: {
        primary: '#ffffff',
        secondary: '#a1a1a1',
        on_primary: '#ffffff',
      },
      feedback: {
        success: '#ff7e5f',
        warning: '#feb47b',
        error: '#ef4444',
      },
      navigation: {
        background: '#1a1a1a',
        active: '#ff7e5f',
        inactive: '#737373',
        indicator: '#ff7e5f',
      },
      extras: {
        divider: '#2d2d2d',
        overlay: 'rgba(26, 26, 26, 0.8)',
        shimmer_base: '#242424',
        shimmer_highlight: '#2d2d2d',
      },
    },

    typography: {
      families: {
        display: 'League Spartan',
        heading: 'League Spartan',
        body: 'Rethink Sans',
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
        tight: '1.2',
        normal: '1.5',
        relaxed: '1.7',
      },
      letter_spacing: {
        tight: '-0.02em',
        normal: '0em',
        wide: '0.04em',
        wider: '0.1em',
      },
    },

    shape: {
      radius: {
        none: '0px',
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        full: '9999px',
      },
      components: {
        card: '16px',
        button: '8px',
        input: '8px',
        badge: '9999px',
        image: '12px',
      },
      shadow: {
        sm: '0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
        md: '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
        lg: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
      },
      shadow_color: 'rgba(0, 0, 0, 0.5)',
    },

    spacing: {
      screen_padding_h: '16px',
      screen_padding_v: '24px',
      card_padding: '16px',
      section_gap: '32px',
      item_gap: '12px',
      icon_size: {
        sm: '20px',
        md: '24px',
        lg: '32px',
      },
    },

    navigation: {
      style: 'bottom_tabs',
      tab_count: 4,
      show_labels: false,
      label_size: '0.625rem',
      icon_style: 'filled',
      active_indicator: 'dot',
    },

    imagery: {
      hero_aspect_ratio: '1:1',
      card_image_style: 'cover',
      placeholder_style: 'blur',
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
        name: 'Marta Visuals',
        subtitle: 'Capturando la esencia de cada momento',
        description: 'Fotografía documental de bodas y retratos con un estilo cinemático y natural.',
        quickLinks: [
          { id: '1', type: 'instagram', value: 'martavisuals' },
          { id: '2', type: 'email', value: 'hola@martavisuals.com' },
        ],
        layout: 'overlap',
        coverHeight: 'large',
      },
    },
    {
      module_id: 'photo_gallery',
      order: 1,
      tab_position: 1,
      tab_label: 'Portfolio',
      tab_icon: 'image',
      is_home: false,
      default_config: {
        columns: 2,
        gap: 8,
        showTitles: false,
        enableLightbox: true,
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
        title: 'Reserva tu Sesión',
        description: 'Sesiones de retrato, parejas o eventos. Elige tu fecha ideal.',
        timeSlots: ['10:00', '16:00', '18:00'],
        slotDuration: 120,
        fields: [
          { id: '1', type: 'text', label: 'Nombre Completo', required: true },
          { id: '2', type: 'email', label: 'Email', required: true },
          { id: '3', type: 'textarea', label: 'Cuéntame tu idea', required: true },
        ],
        submitButtonText: 'Solicitar Información',
      },
    },
    {
      module_id: 'contact',
      order: 3,
      tab_position: 3,
      tab_label: 'Contacto',
      tab_icon: 'mail',
      is_home: false,
      default_config: {
        formTitle: 'Trabajemos juntos',
        submitButtonText: 'Enviar mensaje',
        successMessage: 'Mensaje enviado, te responderé en breve.',
        fields: [
          { id: '1', type: 'text', label: 'Nombre', required: true },
          { id: '2', type: 'email', label: 'Email', required: true },
        ],
        enableHoneypot: true,
        enableCaptcha: false,
      },
    },
  ],

  screens: [
    {
      name: 'Inicio',
      module_id: 'hero_profile',
      layout_description: 'Perfil visualmente rico centrado en la fotografía hero.',
      key_ui_elements: ['Cover image grande', 'Perfil en League Spartan'],
    },
  ],

  onboarding_hint: 'Sube tus mejores fotografías al portafolio para impresionar a tus clientes.',
  suggested_app_name: 'M. Visuals',
  suggested_icon_concept: 'Lente de cámara vibrante con gradiente naranja-salmón minimalista.',
};
