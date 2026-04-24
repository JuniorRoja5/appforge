import React from 'react';
import { Star } from 'lucide-react';
import { resolveAssetUrl } from '../../lib/resolve-asset-url';
import { registerRuntimeModule } from '../registry';

interface TestimonialRaw {
  authorName?: string;
  name?: string;
  text: string;
  rating: number;
  authorImageUrl?: string;
  avatarUrl?: string;
  authorRole?: string;
  role?: string;
}

interface Testimonial {
  name: string;
  text: string;
  rating: number;
  avatarUrl?: string;
  role?: string;
}

function normalizeTestimonial(raw: TestimonialRaw): Testimonial {
  return {
    name: raw.authorName ?? raw.name ?? '',
    text: raw.text ?? '',
    rating: raw.rating ?? 5,
    avatarUrl: raw.authorImageUrl ?? raw.avatarUrl,
    role: raw.authorRole ?? raw.role,
  };
}

const TestimonialsRuntime: React.FC<{ data: Record<string, unknown> }> = ({ data }) => {
  const title = (data.title as string) ?? 'Testimonios';
  // Builder saves as "testimonials", old runtime expected "items" — support both
  const rawItems = (data.testimonials as TestimonialRaw[]) ?? (data.items as TestimonialRaw[]) ?? [];
  const items = rawItems.map(normalizeTestimonial);

  return (
    <div>
      <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>{title}</h3>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div
            key={i}
            style={{ padding: 'var(--spacing-card, 16px)', borderRadius: 'var(--radius-card, 16px)', backgroundColor: 'var(--color-surface-card)', boxShadow: 'var(--shadow-sm)' }}
          >
            <div className="flex gap-1 mb-2">
              {Array.from({ length: 5 }, (_, j) => (
                <Star key={j} size={14} fill={j < item.rating ? 'var(--color-accent, #F59E0B)' : 'none'} style={{ color: 'var(--color-accent, #F59E0B)' }} />
              ))}
            </div>
            <p className="text-sm mb-3" style={{ color: 'var(--color-text-primary)', lineHeight: '1.5' }}>"{item.text}"</p>
            <div className="flex items-center gap-2">
              {item.avatarUrl ? (
                <img src={resolveAssetUrl(item.avatarUrl)} alt={item.name} className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-text-on-primary)' }}>
                  {item.name.charAt(0)}
                </div>
              )}
              <div>
                <span className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>{item.name}</span>
                {item.role && <span className="block text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>{item.role}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

registerRuntimeModule({ id: 'testimonials', Component: TestimonialsRuntime });
