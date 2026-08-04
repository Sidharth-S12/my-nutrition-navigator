import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.nutriai.app",
  appName: "NutriAI",
  webDir: ".output/public",
  server: {
    url: "https://my-nutrition-navigator.vercel.app",
    cleartext: true,
  },
};

export default config;
