import type { NicheTemplate } from '../types';

export const veterinarioTemplate: NicheTemplate = {
  id: 'veterinario',
  name: 'PetCare',
  tagline: 'El bienestar de sus mascotas en buenas manos',
  description:
    'Plantilla profesional para clínicas veterinarias y centros de cuidado animal. Catálogo de servicios, galería de pacientes, noticias y contacto directo con la clínica.',
  category: 'health',
  preview_emoji: '🐾',
  target_audience:
    'Clínicas veterinarias, hospitales animales, centros de cuidado y bienestar animal, peluquerías caninas',

  design_tokens: {
    colors: {
      primary: {
        main: '#2D8A4E',
        dark: '#1E6B38',
        light: '#5CB578',
      },
      secondary: {
        main: '#E8913A',
        dark: '#C47328',
        light: '#F2B06A',
      },
      accent: {
        main: '#E8913A',
        dark: '#C47328',
        light: '#F2B06A',
      },
      surface: {
        background: '#FFF9F0',
        card: '#FFFFFF',
        variant: '#FFF0DE',
      },
      text: {
        primary: '#2C1810',
        secondary: '#6B5B4F',
        on_primary: '#FFFFFF',
      },
      feedback: {
        success: '#34A853',
        warning: '#F9AB00',
        error: '#D93025',
      },
      navigation: {
        background: '#FFFFFF',
        active: '#2D8A4E',
        inactive: '#A89888',
        indicator: '#E8913A',
      },
      extras: {
        divider: '#E8DFD4',
        overlay: 'rgba(44, 24, 16, 0.45)',
        shimmer_base: '#F5EDE3',
        shimmer_highlight: '#FFF9F0',
      },
    },

    typography: {
      families: {
        display: 'Nunito',
        heading: 'Nunito',
        body: 'Nunito',
        mono: 'Fira Code',
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
        relaxed: '1.75',
      },
      letter_spacing: {
        tight: '-0.01em',
        normal: '0em',
        wide: '0.02em',
        wider: '0.04em',
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
        button: '16px',
        input: '12px',
        badge: '9999px',
        image: '16px',
      },
      shadow: {
        sm: '0 1px 3px 0 var(--shadow-color), 0 1px 2px -1px var(--shadow-color)',
        md: '0 4px 12px -2px var(--shadow-color), 0 2px 6px -2px var(--shadow-color)',
        lg: '0 10px 24px -4px var(--shadow-color), 0 4px 10px -4px var(--shadow-color)',
      },
      shadow_color: 'rgba(45, 138, 78, 0.08)',
    },

    spacing: {
      screen_padding_h: '20px',
      screen_padding_v: '24px',
      card_padding: '16px',
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
      icon_style: 'duotone',
      active_indicator: 'pill',
    },

    imagery: {
      hero_aspect_ratio: '4:3',
      card_image_style: 'cover',
      placeholder_style: 'gradient',
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
        name: 'Veterinaria PetCare',
        subtitle: 'Cuidamos a quien más quieres',
        description:
          'Clínica veterinaria con servicios de consulta general, vacunación, cirugía, peluquería canina y tienda de productos para mascotas.',
        quickLinks: [
          { id: '1', type: 'phone', value: '+34 915 444 333' },
          { id: '2', type: 'whatsapp', value: '+34615444333' },
          { id: '3', type: 'instagram', value: 'petcarevet' },
        ],
        layout: 'overlap',
        coverHeight: 'medium',
      },
    },
    {
      module_id: 'catalog',
      order: 1,
      tab_position: 1,
      tab_label: 'Servicios',
      tab_icon: 'stethoscope',
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
      module_id: 'photo_gallery',
      order: 2,
      tab_position: 2,
      tab_label: 'Galería',
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
      order: 3,
      tab_position: null,
      tab_label: 'Opiniones',
      tab_icon: 'star',
      is_home: false,
      default_config: {
        title: 'Lo que dicen nuestros clientes',
        testimonials: [
          {
            id: '1',
            text: 'Salvaron a mi perro cuando ningún otro veterinario supo qué tenía. Estaré eternamente agradecida.',
            authorName: 'Isabel García',
            authorRole: 'Dueña de Max',
            authorImageUrl: '',
            rating: 5,
          },
          {
            id: '2',
            text: 'Llevamos a nuestros dos gatos desde cachorros. Trato cariñoso y profesional.',
            authorName: 'David Herrera',
            authorRole: 'Cliente habitual',
            authorImageUrl: '',
            rating: 5,
          },
          {
            id: '3',
            text: 'La peluquería canina es genial. Mi golden siempre sale guapísimo.',
            authorName: 'Lucía Moreno',
            authorRole: 'Clienta de peluquería',
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
      order: 4,
      tab_position: 3,
      tab_label: 'Contacto',
      tab_icon: 'phone',
      is_home: false,
      default_config: {
        formTitle: 'Contacto y Urgencias',
        submitButtonText: 'Enviar',
        successMessage: '¡Recibido! Te contactaremos lo antes posible.',
        fields: [
          { id: '1', type: 'text', label: 'Tu nombre', placeholder: 'Tu nombre', required: true },
          {
            id: '2',
            type: 'text',
            label: 'Nombre de tu mascota',
            placeholder: 'Nombre de tu mascota',
            required: true,
          },
          {
            id: '3',
            type: 'tel',
            label: 'Teléfono',
            placeholder: '+34 600 000 000',
            required: true,
          },
          {
            id: '4',
            type: 'textarea',
            label: 'Motivo de consulta',
            placeholder: 'Describe el motivo de tu visita...',
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
  ],

  screens: [
    {
      name: 'Inicio (Home)',
      module_id: 'hero_profile',
      layout_description:
        'Portada con imagen de cover de la clínica, foto de perfil superpuesta, nombre y subtítulo de la veterinaria, botones de acceso rápido (llamar, WhatsApp, Instagram)',
      key_ui_elements: [
        'Cover image con layout overlap',
        'Foto de perfil circular superpuesta',
        'Nombre y eslogan de la clínica',
        'Quick links: teléfono, WhatsApp e Instagram',
      ],
    },
    {
      name: 'Servicios',
      module_id: 'catalog',
      layout_description:
        'Catálogo en grid de 2 columnas con tarjetas de servicio, precios visibles, etiquetas de categoría y opción de carrito',
      key_ui_elements: [
        'Grid 2 columnas con tarjetas redondeadas',
        'Precio y precio de comparación en cada tarjeta',
        'Etiquetas de categoría (tags) por servicio',
        'Botón de añadir al carrito en cada tarjeta',
      ],
    },
    {
      name: 'Galería',
      module_id: 'photo_gallery',
      layout_description:
        'Galería de fotos en grid de 2 columnas con títulos debajo de cada imagen y lightbox para ampliación',
      key_ui_elements: [
        'Grid de 2 columnas con gap uniforme',
        'Títulos descriptivos bajo cada imagen',
        'Lightbox al pulsar una foto para ver en grande',
        'Esquinas redondeadas en cada imagen',
      ],
    },
    {
      name: 'Opiniones',
      module_id: 'testimonials',
      layout_description:
        'Carrusel horizontal de testimonios con estrellas de valoración, foto de autor y texto de reseña',
      key_ui_elements: [
        'Título de sección "Lo que dicen nuestros clientes"',
        'Tarjetas de testimonio en carrusel deslizable',
        'Estrellas de rating (4-5 estrellas)',
        'Nombre del autor y rol (dueño de mascota)',
      ],
    },
    {
      name: 'Contacto y Urgencias',
      module_id: 'contact',
      layout_description:
        'Formulario de contacto con campos para nombre, mascota, teléfono y motivo de consulta, con protección honeypot',
      key_ui_elements: [
        'Título "Contacto y Urgencias"',
        'Campo especial "Nombre de tu mascota"',
        'Campo de teléfono para contacto directo',
        'Botón "Enviar" con mensaje de confirmación',
      ],
    },
    {
      name: 'Noticias y Consejos',
      module_id: 'news_feed',
      layout_description:
        'Feed de noticias en formato cards con imagen, fecha y extracto, mostrando 5 artículos',
      key_ui_elements: [
        'Tarjetas de artículo con imagen destacada',
        'Fecha de publicación visible',
        'Extracto del contenido en cada tarjeta',
        'Layout tipo cards vertical scrollable',
      ],
    },
  ],

  onboarding_hint:
    'Empieza personalizando tus servicios veterinarios en la sección "Servicios". Luego añade fotos de tu clínica y pacientes felices en la galería.',
  suggested_app_name: 'PetCare Veterinaria',
  suggested_icon_concept:
    'Huella de mascota estilizada dentro de un corazón verde, contorno redondeado y amigable',
};
