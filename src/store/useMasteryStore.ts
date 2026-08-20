import { create } from 'zustand';
import { Attempt, FactState } from '../core/types';
import { repository } from '../data/repository';
import { createInitialFactStateMap } from '../core/mastery';

interface MasteryState {
  factStateMap: Map<string, FactState>;
  streakDays: number;
  unlocks: Set<string>;
  totalAttempts: number;
  automaticCount: number;
  solidCount: number;
  dueTodayCount: number;
  isCalibrated: boolean;
  isLoading: boolean;

  loadAll: () => Promise<void>;
  recordAttempt: (attempt: Attempt) => Promise<void>;
  rebuildAll: () => Promise<void>;
  unlockKey: (key: string) => Promise<void>;
}

export const useMasteryStore = create<MasteryState>((set, get) => ({
  factStateMap: createInitialFactStateMap(),
  streakDays: 0,
  unlocks: new Set(['star_patrol']),
  totalAttempts: 0,
  automaticCount: 0,
  solidCount: 0,
  dueTodayCount: 0,
  isCalibrated: false,
  isLoading: true,

  loadAll: async () => {
    set({ isLoading: true });
    try {
      const factStateMap = await repository.getFactState();
      const streakDays = await repository.calculateStreakDays();
      const unlocks = await repository.getUnlocks();
      const isCalibrated = await repository.getSetting('isCalibrated', false);

      let totalAttempts = 0;
      let automaticCount = 0;
      let solidCount = 0;
      let dueTodayCount = 0;

      const now = Date.now();
      for (const fact of factStateMap.values()) {
        totalAttempts += fact.totalAttempts;
        if (fact.level === 'automatic') automaticCount++;
        if (fact.level === 'solid' || fact.level === 'automatic') solidCount++;

        // Check if either group is due
        const mulDays = fact.mul.lastAttemptAt ? (now - fact.mul.lastAttemptAt) / (1000 * 60 * 60 * 24) : 0;
        const divDays = fact.div.lastAttemptAt ? (now - fact.div.lastAttemptAt) / (1000 * 60 * 60 * 24) : 0;
        if (
          (fact.mul.attemptCount > 0 && mulDays > fact.mul.halfLifeDays) ||
          (fact.div.attemptCount > 0 && divDays > fact.div.halfLifeDays) ||
          fact.level === 'shaky'
        ) {
          dueTodayCount++;
        }
      }

      // Check unlock thresholds
      if (solidCount >= 30 && !unlocks.has('reef_guard')) {
        await repository.addUnlock('reef_guard');
        unlocks.add('reef_guard');
      }
      if (solidCount >= 60 && !unlocks.has('bone_valley')) {
        await repository.addUnlock('bone_valley');
        unlocks.add('bone_valley');
      }

      set({
        factStateMap,
        streakDays,
        unlocks,
        totalAttempts,
        automaticCount,
        solidCount,
        dueTodayCount,
        isCalibrated,
        isLoading: false
      });
    } catch (e) {
      console.error('Failed to load mastery data', e);
      set({ isLoading: false });
    }
  },

  recordAttempt: async (attempt: Attempt) => {
    await repository.recordAttempt(attempt);
    await get().loadAll();
  },

  rebuildAll: async () => {
    set({ isLoading: true });
    await repository.rebuildFromLog();
    await get().loadAll();
  },

  unlockKey: async (key: string) => {
    await repository.addUnlock(key);
    const unlocks = new Set(get().unlocks);
    unlocks.add(key);
    set({ unlocks });
  }
}));
