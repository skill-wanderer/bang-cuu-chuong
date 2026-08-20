export interface SkinManifest {
  id: string;
  displayName: string;
  description: string;
  theme: {
    bgGradient: [string, string];
    baseColor: string;
    entityBg: string;
    entityBorder: string;
    entityTextColor: string;
    lockBorder: string;
    particleColor: number;
    bulletColor: string;
    baseName: string;
  };
  unlockThreshold: number; // Solid+ facts required
}
