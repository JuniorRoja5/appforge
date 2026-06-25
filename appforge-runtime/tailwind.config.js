import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          dark: 'var(--color-primary-dark)',
          light: 'var(--color-primary-light)',
        },
        secondary: {
          DEFAULT: 'var(--color-secondary)',
          dark: 'var(--color-secondary-dark)',
          light: 'var(--color-secondary-light)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          dark: 'var(--color-accent-dark)',
          light: 'var(--color-accent-light)',
        },
      },
      // Bug 6 — sobreescribir defaults del plugin typography para que
      // las clases `prose` (usadas en responsiveHtmlClass) hereden las
      // design tokens del cliente en lugar de los valores hardcoded del
      // plugin (color #111827, Inter, etc.). Sin esta config, el H1/H2/
      // strong del HTML de Quill se renderean con estilos genéricos
      // y se pierde la jerarquía visual + el tema personalizado.
      //
      // maxWidth: 'none' — el plugin aplica max-width: 65ch por defecto,
      // que en móvil estrecho actúa como buffer innecesario. Hacemos
      // 'none' aquí + responsiveHtmlClass añade max-w-none también
      // (belt-and-suspenders).
      typography: {
        DEFAULT: {
          css: {
            fontFamily: 'var(--font-body, Inter, system-ui, sans-serif)',
            color: 'var(--color-text-primary, #111827)',
            maxWidth: 'none',
            h1: {
              fontFamily: 'var(--font-heading, Inter, system-ui, sans-serif)',
              color: 'var(--color-text-primary, #111827)',
            },
            h2: {
              fontFamily: 'var(--font-heading, Inter, system-ui, sans-serif)',
              color: 'var(--color-text-primary, #111827)',
            },
            h3: {
              fontFamily: 'var(--font-heading, Inter, system-ui, sans-serif)',
              color: 'var(--color-text-primary, #111827)',
            },
            h4: {
              fontFamily: 'var(--font-heading, Inter, system-ui, sans-serif)',
              color: 'var(--color-text-primary, #111827)',
            },
            strong: {
              color: 'var(--color-text-primary, #111827)',
            },
            a: {
              color: 'var(--color-primary, #4F46E5)',
            },
          },
        },
      },
    },
  },
  plugins: [typography],
};
