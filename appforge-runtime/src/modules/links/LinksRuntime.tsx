import React from 'react';
import { BrowserShim as Browser } from '../../lib/platform';
import { ExternalLink, Globe, Instagram, Facebook, MessageCircle, Youtube, Twitter } from 'lucide-react';
import { registerRuntimeModule } from '../registry';

interface LinkItem {
  id?: string;
  label: string;
  url: string;
  icon?: string;
}

const ICON_MAP: Record<string, React.FC<{ size?: number }>> = {
  globe: Globe, instagram: Instagram, facebook: Facebook,
  whatsapp: MessageCircle, youtube: Youtube, twitter: Twitter,
};

const LinksRuntime: React.FC<{ data: Record<string, unknown> }> = ({ data }) => {
  const title = (data.title as string) ?? '';
  const links = (data.links as LinkItem[]) ?? [];
  const style = (data.style as string) ?? 'buttons';

  const openLink = async (url: string) => {
    try {
      await Browser.open({ url });
    } catch {
      window.open(url, '_blank');
    }
  };

  if (links.length === 0) return null;

  return (
    <div>
      {title && (
        <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>{title}</h3>
      )}

      {style === 'cards' ? (
        /* Cards grid layout */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {links.map((link, i) => {
            const Icon = (link.icon && ICON_MAP[link.icon]) || ExternalLink;
            return (
              <button
                key={link.id ?? i}
                onClick={() => openLink(link.url)}
                className="flex flex-col items-center gap-2 p-4 transition-colors"
                style={{
                  backgroundColor: 'var(--color-surface-card, #fff)',
                  borderRadius: 'var(--radius-card, 16px)',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-text-on-primary, #fff)' }}
                >
                  <Icon size={18} />
                </div>
                <span className="text-xs font-medium text-center" style={{ color: 'var(--color-text-primary)' }}>
                  {link.label}
                </span>
              </button>
            );
          })}
        </div>
      ) : style === 'list' ? (
        /* Compact list layout */
        <div className="space-y-1">
          {links.map((link, i) => {
            const Icon = (link.icon && ICON_MAP[link.icon]) || ExternalLink;
            return (
              <button
                key={link.id ?? i}
                onClick={() => openLink(link.url)}
                className="w-full flex items-center gap-3 px-3 py-2.5 transition-colors"
                style={{ borderBottom: '1px solid var(--color-divider, #e5e7eb)' }}
              >
                <Icon size={16} style={{ color: 'var(--color-primary)' }} />
                <span className="flex-1 text-left text-sm" style={{ color: 'var(--color-text-primary)' }}>
                  {link.label}
                </span>
                <ExternalLink size={14} style={{ color: 'var(--color-text-secondary)' }} />
              </button>
            );
          })}
        </div>
      ) : (
        /* Buttons layout (default, Linktree-style) */
        <div className="space-y-2">
          {links.map((link, i) => (
            <button
              key={link.id ?? i}
              onClick={() => openLink(link.url)}
              className="w-full flex items-center gap-3 p-4 transition-colors"
              style={{
                backgroundColor: 'var(--color-surface-card, #fff)',
                borderRadius: 'var(--radius-card, 16px)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <span className="flex-1 text-left text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {link.label}
              </span>
              <ExternalLink size={16} style={{ color: 'var(--color-text-secondary)' }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

registerRuntimeModule({ id: 'links', Component: LinksRuntime });
