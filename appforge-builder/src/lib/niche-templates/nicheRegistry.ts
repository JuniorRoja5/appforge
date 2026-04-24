import type { NicheTemplate, TemplateCategory } from './types';
import { linkInBioTemplate } from './templates/link-in-bio.template';
import { restauranteTemplate } from './templates/restaurante.template';
import { gimnasioTemplate } from './templates/gimnasio.template';
import { deportesTemplate } from './templates/deportes.template';
import { dentistaTemplate } from './templates/dentista.template';
import { veterinarioTemplate } from './templates/veterinario.template';
import { medicoTemplate } from './templates/medico.template';
import { cafeteriaTemplate } from './templates/cafeteria.template';
import { ecommerceTemplate } from './templates/ecommerce.template';
import { peluqueriaTemplate } from './templates/peluqueria.template';
import { supermercadoTemplate } from './templates/supermercado.template';
import { esteticaSpaTemplate } from './templates/estetica-spa.template';
import { academiaTemplate } from './templates/academia.template';
import { fotografoTemplate } from './templates/fotografo.template';
import { abogadoTemplate } from './templates/abogado.template';

export const nicheTemplates: NicheTemplate[] = [
  linkInBioTemplate,
  restauranteTemplate,
  gimnasioTemplate,
  deportesTemplate,
  dentistaTemplate,
  veterinarioTemplate,
  medicoTemplate,
  cafeteriaTemplate,
  ecommerceTemplate,
  peluqueriaTemplate,
  supermercadoTemplate,
  esteticaSpaTemplate,
  academiaTemplate,
  fotografoTemplate,
  abogadoTemplate,
];

export const templateCategories: Array<{ id: string; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'food', label: 'Comida' },
  { id: 'health', label: 'Salud' },
  { id: 'beauty', label: 'Belleza' },
  { id: 'fitness', label: 'Fitness' },
  { id: 'sports', label: 'Deportes' },
  { id: 'retail', label: 'Comercio' },
  { id: 'education', label: 'Educación' },
  { id: 'lifestyle', label: 'Lifestyle' },
  { id: 'professional', label: 'Profesionales' },
];

/** Modules not yet implemented — shown as "coming soon" in UI */
export const COMING_SOON_MODULES = [
  'loyalty_card',
  'social_wall',
  'fan_wall',
] as const;

export function getTemplate(id: string): NicheTemplate | undefined {
  return nicheTemplates.find((t) => t.id === id);
}

export function getTemplatesByCategory(category: TemplateCategory): NicheTemplate[] {
  return nicheTemplates.filter((t) => t.category === category);
}

export function searchTemplates(query: string): NicheTemplate[] {
  const q = query.toLowerCase().trim();
  if (!q) return nicheTemplates;
  return nicheTemplates.filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.tagline.toLowerCase().includes(q) ||
      t.target_audience.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q),
  );
}
