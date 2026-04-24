import { create } from 'zustand';
import { getAppConfig, saveAppConfig, saveSmtpConfig, type AppConfig } from '../lib/api';

interface AppConfigState {
  config: AppConfig | null;
  loading: boolean;
  saving: boolean;
  dirty: boolean;

  loadConfig: (appId: string, token: string) => Promise<void>;
  updateSection: <K extends keyof AppConfig>(section: K, data: AppConfig[K]) => void;
  saveConfig: (appId: string, token: string) => Promise<void>;
  saveSmtp: (appId: string, token: string) => Promise<void>;
  resetDirty: () => void;
}

export const useAppConfigStore = create<AppConfigState>((set, get) => ({
  config: null,
  loading: false,
  saving: false,
  dirty: false,

  loadConfig: async (appId, token) => {
    set({ loading: true, dirty: false });
    try {
      const config = await getAppConfig(appId, token);
      set({ config, loading: false, dirty: false });
    } catch (err) {
      console.error('Error loading app config:', err);
      set({ loading: false, dirty: false });
    }
  },

  updateSection: (section, data) => {
    const { config } = get();
    set({
      config: { ...config, [section]: data },
      dirty: true,
    });
  },

  saveConfig: async (appId, token) => {
    const { config } = get();
    if (!config) return;
    set({ saving: true });
    try {
      // Save non-SMTP config
      const { smtp, ...rest } = config;
      await saveAppConfig(appId, rest, token);
      set({ saving: false, dirty: false });
    } catch (err) {
      console.error('Error saving app config:', err);
      set({ saving: false });
      throw err;
    }
  },

  saveSmtp: async (appId, token) => {
    const { config } = get();
    if (!config?.smtp) return;
    set({ saving: true });
    try {
      await saveSmtpConfig(
        appId,
        {
          host: config.smtp.host,
          port: config.smtp.port,
          secure: config.smtp.secure,
          username: config.smtp.username,
          password: config.smtp.password ?? '',
          fromEmail: config.smtp.fromEmail,
          fromName: config.smtp.fromName,
        },
        token,
      );
      set({ saving: false });
    } catch (err) {
      console.error('Error saving SMTP config:', err);
      set({ saving: false });
      throw err;
    }
  },

  resetDirty: () => set({ dirty: false }),
}));
