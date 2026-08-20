import { create } from 'zustand';
import { OperationMode, SessionMeta, SessionMode } from '../core/types';
import { soundBus } from '../audio/soundBus';
import { repository } from '../data/repository';

export type ScreenName =
  | 'home'
  | 'practice'
  | 'calibration'
  | 'progress'
  | 'tables'
  | 'boss'
  | 'settings'
  | 'arcade';

interface AppState {
  currentScreen: ScreenName;
  selectedTable: number | null;
  activeSkinId: string;
  soundEnabled: boolean;
  gameSpeed: number;
  operationMode: OperationMode;
  activeSessionMeta: SessionMeta | null;

  setScreen: (screen: ScreenName) => void;
  setSelectedTable: (table: number | null) => void;
  setActiveSkinId: (skinId: string) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setGameSpeed: (speed: number) => Promise<void>;
  setOperationMode: (mode: OperationMode) => Promise<void>;
  startSession: (mode: SessionMode, tableNumber?: number) => Promise<SessionMeta>;
  clearSession: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentScreen: 'settings',
  selectedTable: null,
  activeSkinId: 'star_patrol',
  soundEnabled: true,
  gameSpeed: 1.0,
  operationMode: 'both',
  activeSessionMeta: null,

  setScreen: (screen) => {
    soundBus.play('click');
    set({ currentScreen: screen });
  },

  setSelectedTable: (table) => {
    set({ selectedTable: table });
  },

  setActiveSkinId: async (skinId) => {
    set({ activeSkinId: skinId });
    await repository.setSetting('activeSkinId', skinId);
  },

  setSoundEnabled: async (enabled) => {
    soundBus.setEnabled(enabled);
    set({ soundEnabled: enabled });
    await repository.setSetting('soundEnabled', enabled);
  },

  setGameSpeed: async (speed) => {
    set({ gameSpeed: speed });
    try {
      localStorage.setItem('arcade_game_speed', speed.toString());
    } catch {}
    await repository.setSetting('gameSpeed', speed);
  },

  setOperationMode: async (mode) => {
    set({ operationMode: mode });
    try {
      localStorage.setItem('arcade_operation_mode', mode);
    } catch {}
    await repository.setSetting('operationMode', mode);
  },

  startSession: async (mode, tableNumber) => {
    const id = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const meta: SessionMeta = {
      id,
      profileId: 'default',
      mode,
      startedAt: Date.now(),
      tableNumber
    };
    await repository.startSession(meta);
    set({ activeSessionMeta: meta });
    return meta;
  },

  clearSession: () => {
    set({ activeSessionMeta: null });
  }
}));
