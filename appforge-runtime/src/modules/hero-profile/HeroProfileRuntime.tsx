import React from 'react';
import { BrowserShim as Browser } from '../../lib/platform';
import { Phone, Mail, Instagram, Facebook, MessageCircle, Linkedin, Globe } from 'lucide-react';
import { resolveAssetUrl } from '../../lib/resolve-asset-url';
import { registerRuntimeModule } from '../registry';

interface QuickLink {
  id: string;
  type: 'phone' | 'email' | 'instagram' | 'facebook' | 'whatsapp' | 'linkedin' | 'web';
  value: string;
}

const ICON_MAP: Record<string, React.FC<{ size?: number }>> = {
  phone: Phone, email: Mail, instagram: Instagram, facebook: Facebook,
  whatsapp: MessageCircle, linkedin: Linkedin, web: Globe,
};

const COLOR_MAP: Record<string, string> = {
  phone: '#22c55e', email: '#ef4444', instagram: '#e1306c',
  facebook: '#1877f2', whatsapp: '#25d366', linkedin: '#0a66c2', web: 'var(--color-primary)',
};

function getQuickLinkUrl(link: QuickLink): string {
  switch (link.type) {
    case 'phone': return `tel:${link.value}`;
    case 'email': return `mailto:${link.value}`;
    case 'whatsapp': return `https://wa.me/${link.value.replace(/\D/g, '')}`;
    case 'instagram': return `https://instagram.com/${link.value.replace('@', '')}`;
    case 'facebook': return link.value.startsWith('http') ? link.value : `https://facebook.com/${link.value}`;
    case 'linkedin': return link.value.startsWith('http') ? link.value : `https://linkedin.com/in/${link.value}`;
    case 'web': return link.value.startsWith('http') ? link.value : `https://${link.value}`;
    default: return link.value;
  }
}

const HeroProfileRuntime: React.FC<{ data: Record<string, unknown> }> = ({ data }) => {
  // Map builder field names to runtime fields
  const name = (data.name as string) ?? (data.businessName as string) ?? '';
  const tagline = (data.subtitle as string) ?? (data.tagline as string) ?? '';
  const description = (data.description as string) ?? '';
  const avatarUrl = (data.profileImageUrl as string) ?? (data.avatarUrl as string) ?? '';
  const coverUrl = (data.coverImageUrl as string) ?? (data.coverUrl as string) ?? '';
  const quickLinks = (data.quickLinks as QuickLink[]) ?? [];
  const layout = (data.layout as string) ?? 'centered';
  const coverHeight = (data.coverHeight as string) ?? 'medium';

  const coverHeightPx = coverHeight === 'small' ? 120 : coverHeight === 'large' ? 220 : 160;
  const isCentered = layout === 'centered' || layout === 'overlap';

  const openLink = async (url: string) => {
    try { await Browser.open({ url }); } catch { window.open(url, '_blank'); }
  };

  return (
    <div className="relative" style={{ borderRadius: 'var(--radius-card, 16px)', overflow: 'hidden' }}>
      {/* Cover */}
      <div
        style={{
          height: coverHeightPx,
          background: coverUrl ? `url(${resolveAssetUrl(coverUrl)}) center/cover` : 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
        }}
      />
      {/* Avatar + info */}
      <div className={`relative px-4 pb-4 ${isCentered ? 'text-center' : ''}`} style={{ marginTop: -40 }}>
        <div
          className={`w-20 h-20 rounded-full border-4 overflow-hidden ${isCentered ? 'mx-auto' : ''}`}
          style={{ borderColor: 'var(--color-surface-card, #fff)', backgroundColor: 'var(--color-surface-card, #fff)' }}
        >
          {avatarUrl ? (
            <img src={resolveAssetUrl(avatarUrl)} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl font-bold" style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-text-on-primary)' }}>
              {name.charAt(0)}
            </div>
          )}
        </div>
        <h2 className="text-xl font-bold mt-2" style={{ color: 'var(--color-text-primary)' }}>{name}</h2>
        {tagline && <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>{tagline}</p>}
        {description && <p className="text-sm mt-2" style={{ color: 'var(--color-text-primary)', lineHeight: '1.5' }}>{description}</p>}

        {/* Quick Links */}
        {quickLinks.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3" style={{ justifyContent: isCentered ? 'center' : 'flex-start' }}>
            {quickLinks.map((link) => {
              const Icon = ICON_MAP[link.type] ?? Globe;
              const color = COLOR_MAP[link.type] ?? 'var(--color-primary)';
              return (
                <button
                  key={link.id}
                  onClick={() => openLink(getQuickLinkUrl(link))}
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: color, color: '#fff' }}
                >
                  <Icon size={18} />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

registerRuntimeModule({ id: 'hero_profile', Component: HeroProfileRuntime });
