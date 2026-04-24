import type { NicheTemplate } from '../types';

export const linkInBioTemplate: NicheTemplate = {
  id: 'link_in_bio',
  name: 'LinkUp',
  tagline: 'Tu universo digital en un solo enlace',
  description:
    'Plantilla vibrante para creadores de contenido, influencers y marcas personales. Reune todos tus enlaces, contenido visual y novedades en una sola app con estilo bold y moderno.',
  category: 'lifestyle',
  preview_emoji: '🔗',
  target_audience:
    'Influencers, creadores de contenido, artistas digitales, freelancers y marcas personales que necesitan centralizar su presencia online.',

  design_tokens: {
    colors: {
      primary: {
        main: '#7C3AED',
        dark: '#5B21B6',
        light: '#A78BFA',
      },
      secondary: {
        main: '#EC4899',
        dark: '#BE185D',
        light: '#F9A8D4',
      },
      accent: {
        main: '#FACC15',
        dark: '#CA8A04',
        light: '#FEF08A',
      },
      surface: {
        background: '#0F0B1E',
        card: '#1A1333',
        variant: '#251D3D',
      },
      text: {
        primary: '#F5F3FF',
        secondary: '#A5A0C0',
        on_primary: '#FFFFFF',
      },
      feedback: {
        success: '#34D399',
        warning: '#FBBF24',
        error: '#F87171',
      },
      navigation: {
        background: '#130E24',
        active: '#FACC15',
        inactive: '#6B6490',
        indicator: '#7C3AED',
      },
      extras: {
        divider: '#2D2550',
        overlay: 'rgba(15, 11, 30, 0.80)',
        shimmer_base: '#1A1333',
        shimmer_highlight: '#251D3D',
      },
    },

    typography: {
      families: {
        display: 'Syne',
        heading: 'Syne',
        body: 'Space Grotesk',
        mono: 'JetBrains Mono',
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
        relaxed: '1.75',
      },
      letter_spacing: {
        tight: '-0.02em',
        normal: '0em',
        wide: '0.04em',
        wider: '0.08em',
      },
    },

    shape: {
      radius: {
        none: '0px',
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '20px',
        xl: '28px',
        full: '9999px',
      },
      components: {
        card: '20px',
        button: '9999px',
        input: '12px',
        badge: '9999px',
        image: '16px',
      },
      shadow: {
        sm: 'none',
        md: 'none',
        lg: 'none',
      },
      shadow_color: 'transparent',
    },

    spacing: {
      screen_padding_h: '20px',
      screen_padding_v: '24px',
      card_padding: '20px',
      section_gap: '28px',
      item_gap: '14px',
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
      hero_aspect_ratio: '1:1',
      card_image_style: 'cover',
      placeholder_style: 'gradient',
      overlay_style: 'gradient_dark',
      icon_theme: 'bold',
    },
  },

  default_modules: [
    {
      module_id: 'hero_profile',
      order: 0,
      tab_position: 0,
      tab_label: 'Perfil',
      tab_icon: 'user',
      is_home: true,
      default_config: {
        coverImageUrl: '',
        profileImageUrl: '',
        name: 'Tu Nombre Creativo',
        subtitle: 'Creador de contenido | Lifestyle & Tech',
        description:
          'Bienvenido a mi universo digital. Aqui encontraras todo mi contenido, enlaces y formas de contactarme. ¡Conectemos!',
        quickLinks: [
          {
            id: 'ql-1',
            type: 'instagram' as const,
            value: 'https://instagram.com/tu_usuario',
          },
          {
            id: 'ql-2',
            type: 'whatsapp' as const,
            value: '+34600000000',
          },
          {
            id: 'ql-3',
            type: 'email' as const,
            value: 'hola@tucorreo.com',
          },
          {
            id: 'ql-4',
            type: 'linkedin' as const,
            value: 'https://linkedin.com/in/tu_usuario',
          },
        ],
        layout: 'centered' as const,
        coverHeight: 'medium' as const,
      },
    },
    {
      module_id: 'links',
      order: 1,
      tab_position: 1,
      tab_label: 'Links',
      tab_icon: 'link',
      is_home: false,
      default_config: {
        title: 'Mis Enlaces',
        links: [
          {
            id: 'lnk-1',
            label: 'Instagram',
            url: 'https://instagram.com/tu_usuario',
            icon: 'instagram' as const,
          },
          {
            id: 'lnk-2',
            label: 'TikTok',
            url: 'https://tiktok.com/@tu_usuario',
            icon: 'tiktok' as const,
          },
          {
            id: 'lnk-3',
            label: 'YouTube',
            url: 'https://youtube.com/@tu_canal',
            icon: 'youtube' as const,
          },
          {
            id: 'lnk-4',
            label: 'Mi Portfolio',
            url: 'https://tuportfolio.com',
            icon: 'globe' as const,
          },
          {
            id: 'lnk-5',
            label: 'Tienda Merch',
            url: 'https://tu-merch.store',
            icon: 'custom' as const,
          },
          {
            id: 'lnk-6',
            label: 'WhatsApp',
            url: 'https://wa.me/34600000000',
            icon: 'whatsapp' as const,
          },
        ],
        style: 'buttons' as const,
      },
    },
    {
      module_id: 'photo_gallery',
      order: 2,
      tab_position: 2,
      tab_label: 'Galeria',
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
      module_id: 'contact',
      order: 3,
      tab_position: 3,
      tab_label: 'Contacto',
      tab_icon: 'mail',
      is_home: false,
      default_config: {
        formTitle: 'Hablemos',
        submitButtonText: 'Enviar mensaje',
        successMessage:
          '¡Gracias por tu mensaje! Te respondere lo antes posible.',
        fields: [
          {
            id: 'field-name',
            type: 'text' as const,
            label: 'Nombre',
            placeholder: 'Tu nombre',
            required: true,
          },
          {
            id: 'field-email',
            type: 'email' as const,
            label: 'Correo electronico',
            placeholder: 'tu@correo.com',
            required: true,
          },
          {
            id: 'field-phone',
            type: 'tel' as const,
            label: 'Telefono',
            placeholder: '+34 600 000 000',
            required: false,
          },
          {
            id: 'field-message',
            type: 'textarea' as const,
            label: 'Mensaje',
            placeholder: 'Cuentame sobre tu proyecto o colaboracion...',
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
      name: 'Perfil Principal',
      module_id: 'hero_profile',
      layout_description:
        'Imagen de portada a ancho completo con altura media, superpuesta por un avatar circular centrado. Debajo, nombre en tipografia Syne bold XXL, subtitulo en Space Grotesk secundario y descripcion breve. Fila de iconos quick-link circulares con fondo violeta translucido.',
      key_ui_elements: [
        'Cover image con overlay gradiente oscuro inferior',
        'Avatar circular con borde gradiente violeta-rosa superpuesto al cover',
        'Nombre en Syne extrabold blanco centrado',
        'Subtitulo en Space Grotesk color secundario',
        'Quick-links como iconos circulares con fondo surface card',
      ],
    },
    {
      name: 'Mis Enlaces',
      module_id: 'links',
      layout_description:
        'Titulo de seccion centrado seguido de botones pill full-width apilados verticalmente. Cada boton muestra el icono de la plataforma a la izquierda y una flecha a la derecha. Fondo oscuro con sutil gradiente radial violeta.',
      key_ui_elements: [
        'Titulo de seccion en Syne bold blanco',
        'Botones pill full-width con icono y label',
        'Cada boton con fondo surface card y borde sutil violeta',
        'Hover/press state con acento amarillo neon',
        'Iconos de plataforma con colores originales o monocromo',
      ],
    },
    {
      name: 'Galeria Visual',
      module_id: 'photo_gallery',
      layout_description:
        'Grid de 2 columnas con imagenes cuadradas y bordes redondeados de 16px. Sin titulos visibles, tap para lightbox fullscreen con fondo overlay oscuro.',
      key_ui_elements: [
        'Grid 2 columnas con gap de 8px',
        'Imagenes con radius 16px',
        'Lightbox fullscreen con gesto de swipe',
        'Indicador de posicion con dots',
      ],
    },
    {
      name: 'Contacto',
      module_id: 'contact',
      layout_description:
        'Titulo "Hablemos" centrado seguido de formulario minimalista con campos de input sobre fondo oscuro. Inputs con borde sutil violeta y focus state con glow. Boton submit amarillo neon full-width.',
      key_ui_elements: [
        'Titulo en Syne bold blanco centrado',
        'Campos de input con borde 1px violeta oscuro y radius 12px',
        'Focus state con glow violeta suave',
        'Boton CTA amarillo neon con texto oscuro y radius full',
        'Textarea expandido para el campo de mensaje',
      ],
    },
  ],

  onboarding_hint:
    'Empieza personalizando tu avatar y bio, luego agrega tus enlaces mas importantes. La galeria es ideal para mostrar tu contenido destacado.',
  suggested_app_name: 'Mi LinkUp',
  suggested_icon_concept:
    'Cadena de enlace estilizada formando la letra L sobre fondo gradiente violeta a rosa, con destellos de amarillo neon.',
};
