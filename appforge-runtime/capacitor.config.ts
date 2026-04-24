import type { CapacitorConfig } from '@capacitor/cli';

// This file is a template — the build service generates it dynamically.
// Placeholders (%%PACKAGE_NAME%%, %%APP_NAME%%) are replaced at build time.
// androidScheme and cleartext are set based on PUBLIC_API_URL protocol.
const config: CapacitorConfig = {
  appId: '%%PACKAGE_NAME%%',
  appName: '%%APP_NAME%%',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
