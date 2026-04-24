import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '../../../store/useAuthStore';
import { useAppConfigStore } from '../../../store/useAppConfigStore';
import {
  X, Image, Smartphone, SlidersHorizontal, FileText, Mail, Shield, TabletSmartphone,
} from 'lucide-react';
import { AppIconTab } from './tabs/AppIconTab';
import { SplashScreenTab } from './tabs/SplashScreenTab';
import { OnboardingTab } from './tabs/OnboardingTab';
import { TermsTab } from './tabs/TermsTab';
import { SmtpTab } from './tabs/SmtpTab';
import { IosPermissionsTab } from './tabs/IosPermissionsTab';
import { AndroidConfigTab } from './tabs/AndroidConfigTab';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const TABS = [
  { id: 'icon', label: 'Identidad', icon: Image },
  { id: 'splash', label: 'Splash Screen', icon: Smartphone },
  { id: 'onboarding', label: 'Bienvenida', icon: SlidersHorizontal },
  { id: 'terms', label: 'Legal', icon: FileText },
  { id: 'smtp', label: 'Email (SMTP)', icon: Mail },
  { id: 'android', label: 'Android', icon: TabletSmartphone },
  { id: 'ios', label: 'Permisos iOS', icon: Shield },
] as const;

type TabId = (typeof TABS)[number]['id'];

export const AppConfigModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { appId } = useParams<{ appId: string }>();
  const token = useAuthStore((s) => s.token);
  const config = useAppConfigStore((s) => s.config);
  const loading = useAppConfigStore((s) => s.loading);
  const saving = useAppConfigStore((s) => s.saving);
  const dirty = useAppConfigStore((s) => s.dirty);
  const loadConfig = useAppConfigStore((s) => s.loadConfig);
  const saveConfig = useAppConfigStore((s) => s.saveConfig);
  const saveSmtp = useAppConfigStore((s) => s.saveSmtp);

  const [activeTab, setActiveTab] = useState<TabId>('icon');
  const [showDirtyWarning, setShowDirtyWarning] = useState(false);

  useEffect(() => {
    if (isOpen && appId && token) {
      loadConfig(appId, token);
      setShowDirtyWarning(false);
    }
  }, [isOpen, appId, token, loadConfig]);

  const forceClose = useCallback(() => {
    setShowDirtyWarning(false);
    useAppConfigStore.getState().resetDirty();
    onClose();
  }, [onClose]);

  const handleClose = useCallback(() => {
    if (dirty) {
      setShowDirtyWarning(true);
      return;
    }
    forceClose();
  }, [dirty, forceClose]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!appId || !token) return;
    try {
      await saveConfig(appId, token);
      if (config?.smtp?.host) {
        await saveSmtp(appId, token);
      }
    } catch {
      alert('Error al guardar la configuración');
    }
  };

  const handleSaveAndClose = async () => {
    await handleSave();
    forceClose();
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'icon': return <AppIconTab />;
      case 'splash': return <SplashScreenTab />;
      case 'onboarding': return <OnboardingTab />;
      case 'terms': return <TermsTab />;
      case 'smtp': return <SmtpTab />;
      case 'android': return <AndroidConfigTab />;
      case 'ios': return <IosPermissionsTab />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal panel */}
      <div
        className="relative z-10 bg-white rounded-2xl shadow-2xl w-[900px] max-w-[95vw] h-[620px] max-h-[90vh] flex overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left sidebar — tabs */}
        <div className="w-[200px] bg-gray-50 border-r border-gray-200 flex flex-col shrink-0">
          <div className="px-4 py-5 border-b border-gray-200">
            <h2 className="text-sm font-bold text-gray-900 tracking-tight">Configuración</h2>
            <p className="text-[11px] text-gray-500 mt-0.5">Ajustes de la app</p>
          </div>
          <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-[13px] transition-all ${
                    isActive
                      ? 'bg-white shadow-sm border border-gray-200 text-gray-900 font-medium'
                      : 'text-gray-600 hover:bg-white/60 hover:text-gray-900'
                  }`}
                >
                  <Icon size={16} className={isActive ? 'text-indigo-500' : 'text-gray-400'} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-[15px] text-gray-900">
              {TABS.find((t) => t.id === activeTab)?.label}
            </h3>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              renderTab()
            )}
          </div>

          {/* Dirty warning bar (replaces window.confirm) */}
          {showDirtyWarning && (
            <div className="px-6 py-3 bg-amber-50 border-t border-amber-200 flex items-center justify-between gap-3">
              <span className="text-[12px] text-amber-800 font-medium">
                Tienes cambios sin guardar. ¿Qué deseas hacer?
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setShowDirtyWarning(false)}
                  className="px-3 py-1.5 text-[12px] text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Volver
                </button>
                <button
                  onClick={forceClose}
                  className="px-3 py-1.5 text-[12px] text-red-600 hover:text-red-800 font-medium transition-colors"
                >
                  Descartar
                </button>
                <button
                  onClick={handleSaveAndClose}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[12px] font-medium rounded-lg transition-colors"
                >
                  Guardar y cerrar
                </button>
              </div>
            </div>
          )}

          {/* Footer */}
          {!showDirtyWarning && (
            <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
              <span className="text-[11px] text-gray-400">
                {dirty ? 'Cambios sin guardar' : 'Todo guardado'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={forceClose}
                  className="px-3 py-1.5 text-[13px] text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Cerrar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !dirty}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white text-[13px] font-medium rounded-lg transition-colors"
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
