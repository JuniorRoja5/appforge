// Tailwind classes for rendering user-generated rich-text (Quill/HTML) safely
// inside a phone-sized viewport.
//
// - `prose prose-sm` without `max-w-none` so the prose width constraint applies.
// - `break-words` makes long words wrap instead of overflowing horizontally.
// - `[&_img]:max-w-full [&_img]:h-auto` keeps embedded images inside the container.
// - `[&_iframe]:max-w-full` keeps YouTube/Vimeo embeds from overflowing.
// - `[&_table]:block [&_table]:overflow-x-auto` makes wide tables horizontally
//    scrollable inside their cell instead of pushing the layout right.
// - `[&_pre]:overflow-x-auto` does the same for code blocks.
export const responsiveHtmlClass =
  'prose prose-sm break-words ' +
  '[&_img]:max-w-full [&_img]:h-auto ' +
  '[&_iframe]:max-w-full ' +
  '[&_table]:block [&_table]:overflow-x-auto [&_table]:max-w-full ' +
  '[&_pre]:overflow-x-auto [&_pre]:max-w-full';
