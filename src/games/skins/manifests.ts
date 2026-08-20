import { SkinManifest } from './types';

export const SKINS: Record<string, SkinManifest> = {
  star_patrol: {
    id: 'star_patrol',
    displayName: 'Star Patrol',
    description: 'Defend your starbase against incoming space cruisers.',
    theme: {
      bgGradient: ['#090D16', '#121B2F'],
      baseColor: '#38BDF8',
      entityBg: '#1E293B',
      entityBorder: '#334155',
      entityTextColor: '#F8FAFC',
      lockBorder: '#F59E0B',
      particleColor: 0x38bdf8,
      bulletColor: '#60A5FA',
      baseName: 'Orbital Station'
    },
    unlockThreshold: 0
  },
  reef_guard: {
    id: 'reef_guard',
    displayName: 'Reef Guard',
    description: 'Protect the coral reef from rogue deep-sea gliders.',
    theme: {
      bgGradient: ['#041C24', '#083344'],
      baseColor: '#2DD4BF',
      entityBg: '#134E4A',
      entityBorder: '#14B8A6',
      entityTextColor: '#F0FDFA',
      lockBorder: '#F43F5E',
      particleColor: 0x2dd4bf,
      bulletColor: '#5EEAD4',
      baseName: 'Coral Sanctuary'
    },
    unlockThreshold: 30
  },
  bone_valley: {
    id: 'bone_valley',
    displayName: 'Bone Valley',
    description: 'Defend your camp from roaming prehistoric dinos.',
    theme: {
      bgGradient: ['#1C100B', '#331D12'],
      baseColor: '#F97316',
      entityBg: '#431407',
      entityBorder: '#7C2D12',
      entityTextColor: '#FFEDD5',
      lockBorder: '#EAB308',
      particleColor: 0xf97316,
      bulletColor: '#FDBA74',
      baseName: 'Outpost Camp'
    },
    unlockThreshold: 60
  }
};

export function getSkin(id: string): SkinManifest {
  return SKINS[id] || SKINS.star_patrol;
}
