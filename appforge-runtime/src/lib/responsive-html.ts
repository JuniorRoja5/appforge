// Tailwind classes for rendering user-generated rich-text (Quill/HTML) safely
// inside a phone-sized viewport.
//
// - `prose prose-sm` aplica la jerarquía visual de @tailwindcss/typography:
//   H1/H2/H3 más grandes, strong en negrita, listas indentadas, etc.
//   Sin el plugin el HTML de Quill quedaría con estilos por defecto del UA.
// - `max-w-none` sobreescribe el max-width: 65ch del plugin — en móvil
//   estrecho no aporta legibilidad y restringe innecesariamente. La
//   config del tailwind.config.js (Bug 6) también lo setea, esto es
//   belt-and-suspenders por si el orden de cascada falla.
// - `break-words` makes long words wrap instead of overflowing horizontally.
// - `[&_img]:max-w-full [&_img]:h-auto` keeps embedded images inside the container.
// - `[&_iframe]:max-w-full` keeps YouTube/Vimeo embeds from overflowing.
// - `[&_table]:block [&_table]:overflow-x-auto` makes wide tables horizontally
//    scrollable inside their cell instead of pushing the layout right.
// - `[&_pre]:overflow-x-auto` does the same for code blocks.
export const responsiveHtmlClass =
  'prose prose-sm max-w-none break-words ' +
  '[&_img]:max-w-full [&_img]:h-auto ' +
  '[&_iframe]:max-w-full ' +
  '[&_table]:block [&_table]:overflow-x-auto [&_table]:max-w-full ' +
  '[&_pre]:overflow-x-auto [&_pre]:max-w-full';
