import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nutriai.app',
  appName: 'NutriAI',
  webDir: '.output/public',
  server: {
    url: 'http://localhost:8081',
    cleartext: true,
  }
};

export default config;

