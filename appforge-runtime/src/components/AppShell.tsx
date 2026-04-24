import React, { useState, useMemo, useCallback } from 'react';
import type { CanvasElement, AppManifest } from '../lib/manifest';
import { trackEvent } from '../lib/analytics';
import { TabScreen } from './TabScreen';
import {
  Home, Newspaper, Calendar, ShoppingBag, UtensilsCrossed, Image, Mail,
  BookOpen, Gift, Star, Link, FileText, User, Video, MessageSquare, Clock,
  Menu, X,
} from 'lucide-react';

const ICON_MAP: Record<string, React.FC<{ size?: number; className?: string }>> = {
  home: Home, news: Newspaper, calendar: Calendar, shop: ShoppingBag,
  restaurant: UtensilsCrossed, gallery: Image, contact: Mail, catalog: BookOpen,
  coupon: Gift, loyalty: Star, links: Link, document: FileText, profile: User,
  video: Video, chat: MessageSquare, booking: Clock,
};

interface Props {
  manifest: AppManifest;
}

export const AppShell: React.FC<Props> = ({ manifest }) => {
  const { schema, apiUrl, appId, designTokens } = manifest;

  const navStyle = designTokens?.navigation?.style ?? 'bottom_tabs';
  const showLabels = designTokens?.navigation?.show_labels ?? true;
  const activeIndicator = designTokens?.navigation?.active_indicator ?? 'pill';

  // Group elements by tab
  const tabs = useMemo(() => {
    const tabMap = new Map<number, { label: string; icon: string; elements: CanvasElement[] }>();

    for (const el of schema) {
      const tabIdx = el.tabIndex ?? 0;
      if (!tabMap.has(tabIdx)) {
        tabMap.set(tabIdx, {
          label: el.tabLabel || `Tab ${tabIdx + 1}`,
          icon: el.tabIcon || 'home',
          elements: [],
        });
      }
      tabMap.get(tabIdx)!.elements.push(el);
    }

    return Array.from(tabMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([index, data]) => ({ index, ...data }));
  }, [schema]);

  const [activeTab, setActiveTabRaw] = useState(tabs[0]?.index ?? 0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const currentTab = tabs.find((t) => t.index === activeTab) ?? tabs[0];

  const setActiveTab = useCallback((index: number) => {
    setActiveTabRaw(index);
    const tab = tabs.find((t) => t.index === index);
    if (tab) trackEvent('screen_view', undefined, { tab: tab.label });
  }, [tabs]);

  const hasTabs = tabs.length > 1;

  if (tabs.length === 0) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: 'var(--color-text-secondary)' }}>
        <p className="text-center text-lg">Sin contenido configurado</p>
      </div>
    );
  }

  // ── Reusable Tab Bar (for top_tabs and bottom_tabs) ──
  const TabBar: React.FC<{ position: 'top' | 'bottom' }> = ({ position }) => {
    if (!hasTabs) return null;
    return (
      <nav
        className={`flex items-center shrink-0 ${position === 'top' ? 'border-b' : 'border-t'}`}
        style={{
          backgroundColor: 'var(--color-nav-bg, #fff)',
          borderColor: 'var(--color-divider, #E5E7EB)',
          ...(position === 'bottom' ? { paddingBottom: 'var(--safe-area-bottom, 0px)' } : {}),
        }}
      >
        {tabs.map((tab) => {
          const isActive = tab.index === activeTab;
          const IconComponent = ICON_MAP[tab.icon] ?? Home;
          const activeColor = 'var(--color-nav-active, #4F46E5)';
          const inactiveColor = 'var(--color-nav-inactive, #9CA3AF)';

          return (
            <button
              key={tab.index}
              onClick={() => setActiveTab(tab.index)}
              className="flex-1 flex flex-col items-center py-2 gap-0.5 transition-colors relative"
            >
              {/* Indicator: pill (top) */}
              {isActive && activeIndicator === 'pill' && (
                <div
                  className="absolute top-0 w-8 h-1 rounded-full"
                  style={{ backgroundColor: activeColor }}
                />
              )}
              {/* Indicator: dot (top) */}
              {isActive && activeIndicator === 'dot' && (
                <div
                  className="absolute top-0.5 w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: activeColor }}
                />
              )}

              <div
                className="p-1 rounded-full transition-colors"
                style={{
                  backgroundColor: isActive && activeIndicator === 'none' ? `${activeColor}20` : 'transparent',
                }}
              >
                <div style={{ color: isActive ? activeColor : inactiveColor }}>
                  <IconComponent size={22} />
                </div>
              </div>

              {showLabels && (
                <span
                  className="text-[10px] font-medium transition-colors"
                  style={{ color: isActive ? activeColor : inactiveColor }}
                >
                  {tab.label}
                </span>
              )}

              {/* Indicator: underline (bottom) */}
              {isActive && activeIndicator === 'underline' && (
                <div
                  className="absolute bottom-0 w-6 h-0.5 rounded-full"
                  style={{ backgroundColor: activeColor }}
                />
              )}
            </button>
          );
        })}
      </nav>
    );
  };

  // ── Drawer Overlay (for side_drawer) ──
  const DrawerOverlay: React.FC = () => {
    if (!drawerOpen || navStyle !== 'side_drawer') return null;
    return (
      <div className="fixed inset-0 z-50 flex" onClick={() => setDrawerOpen(false)}>
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/40" />
        {/* Panel */}
        <div
          className="relative w-[260px] h-full shadow-xl flex flex-col pt-14 pb-6 px-4 z-10"
          style={{ backgroundColor: 'var(--color-nav-bg, #fff)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setDrawerOpen(false)}
            className="absolute top-4 right-3 p-1 rounded-full"
            style={{ color: 'var(--color-nav-inactive, #9CA3AF)' }}
          >
            <X size={18} />
          </button>
          <div className="space-y-1 mt-2">
            {tabs.map((tab) => {
              const isActive = tab.index === activeTab;
              const IconComponent = ICON_MAP[tab.icon] ?? Home;
              return (
                <button
                  key={tab.index}
                  onClick={() => { setActiveTab(tab.index); setDrawerOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                    isActive ? 'font-semibold' : 'opacity-70'
                  }`}
                  style={{
                    color: isActive ? 'var(--color-nav-active, #4F46E5)' : 'var(--color-nav-inactive, #9CA3AF)',
                    backgroundColor: isActive ? 'var(--color-nav-active, #4F46E5)15' : 'transparent',
                  }}
                >
                  <IconComponent size={20} />
                  <span className="text-sm">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ── Header (shows hamburger for drawer, app name otherwise) ──
  const Header: React.FC = () => {
    const showHamburger = navStyle === 'side_drawer' && hasTabs;
    return (
      <div
        className="flex items-center shrink-0 px-4 py-3"
        style={{
          backgroundColor: 'var(--color-nav-bg, #fff)',
          borderBottom: '1px solid var(--color-divider, #E5E7EB)',
        }}
      >
        {showHamburger ? (
          <>
            <button onClick={() => setDrawerOpen(true)} style={{ color: 'var(--color-text-primary)' }}>
              <Menu size={22} />
            </button>
            <span
              className="flex-1 text-center font-semibold text-[17px] truncate"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {currentTab?.label ?? manifest.appName}
            </span>
            <div className="w-[22px]" /> {/* Spacer */}
          </>
        ) : (
          <span
            className="font-semibold text-[17px] truncate"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {manifest.appName || 'Mi App'}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Safe area top */}
      <div style={{ height: 'var(--safe-area-top, 0px)', backgroundColor: 'var(--color-nav-bg, #fff)' }} />

      {/* Header */}
      <Header />

      {/* Top tabs */}
      {navStyle === 'top_tabs' && <TabBar position="top" />}

      {/* Content area */}
      <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        {currentTab && (
          <TabScreen
            elements={currentTab.elements}
            apiUrl={apiUrl}
            appId={appId}
          />
        )}
      </div>

      {/* Bottom tabs */}
      {navStyle === 'bottom_tabs' && hasTabs && <TabBar position="bottom" />}

      {/* Drawer overlay */}
      <DrawerOverlay />
    </div>
  );
};
