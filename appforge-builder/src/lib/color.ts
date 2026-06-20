/**
 * Utilidades de color para el branding white-label del reseller.
 *
 * Tres exports:
 *   - hexToHsl: hex → componentes HSL en formato shadcn ("H S% L%" sin wrapper).
 *   - contrastRatio: WCAG ratio entre dos hex.
 *   - relativeLuminance: helper interno usado por contrastRatio.
 */

function parseHex(hex: string): [number, number, number] {
  const clean = hex.startsWith('#') ? hex.slice(1) : hex;
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return [r, g, b];
}

/**
 * Convierte hex (#RRGGBB) a componentes HSL en formato shadcn:
 *   "H S% L%"  (sin wrapper hsl(), sin comas)
 *
 * Crítico: tailwind.config envuelve la CSS variable con `hsl(var(--primary))`
 * en el momento de uso. Si esta función devolviera "hsl(243 75% 59%)",
 * Tailwind generaría "hsl(hsl(243 75% 59%))" y el chrome se rompería en
 * silencio (color negro o transparente, sin error de consola).
 *
 * Referencia del formato: index.css:17 → `--primary: 243 75% 59%`.
 */
export function hexToHsl(hex: string): string {
  const [r, g, b] = parseHex(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }

    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/**
 * Luminancia relativa por W3C WCAG 2.0 (basado en ITU-R BT.709).
 * Devuelve un número en [0, 1] donde 0 es negro y 1 es blanco.
 * Helper interno usado por contrastRatio.
 */
function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex);

  const f = (c: number): number =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/**
 * Ratio de contraste WCAG entre dos colores hex. Devuelve en [1, 21],
 * donde 1 = sin contraste (mismo color) y 21 = blanco contra negro.
 *
 * Umbral del aviso de luminancia en BrandingPage: 3:1, NO 4.5.
 *
 * Anclaje al color real (¡importante!): el default del chrome es
 * `--primary: 243 75% 59%` en index.css:17, que convertido a hex es
 * `#5048E5` (rgb(80, 72, 229)). Su contraste contra blanco es 6.18:1.
 * El comentario `≈ #6366F1` del index.css es literal: aproximación,
 * NO conversión exacta. #6366F1 mide 4.47:1 contra blanco — es un
 * color distinto del default real. Si mides el default y ves 6.18,
 * NO "corrijas" este umbral a 4.5 pensando que el comment está roto.
 *
 * Por qué 3:1 y no 4.5: un umbral 4.5 marcaría como ilegibles colores
 * que se leen perfectamente en chrome con texto blanco — esmeralda
 * #059669 (3.77), indigos saturados ~#6366F1 (4.47). Falsos positivos
 * molestos. El 3:1 deja pasar esos y solo avisa los genuinamente
 * ilegibles: amarillo (~1.07), menta (~1.23), naranja claro (~2.15),
 * celeste pastel (~2.14).
 *
 * Subir a AA estricto exigiría primero migrar los 48 sitios
 * `bg-primary text-white` hardcoded del chrome a tokens — TECH_DEBT #87.
 */
export function contrastRatio(hexA: string, hexB: string): number {
  const la = relativeLuminance(hexA);
  const lb = relativeLuminance(hexB);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}
