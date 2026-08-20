import Dexie from 'dexie';
import { Attempt, FactState, SessionMeta, SessionSummary } from '../core/types';
import { db, DbFactState, DbSession } from './db';
import { applyAttemptToFactState, createInitialFactStateMap, refreshFactStateDecay } from '../core/mastery';
import { rebuildFactState } from './rebuild';

export interface ProgressRepository {
  recordAttempt(a: Attempt): Promise<void>;
  recordAttempts(attempts: Attempt[]): Promise<void>;
  getFactState(profileId?: string): Promise<Map<string, FactState>>;
  getRecentAttempts(profileId?: string, limit?: number): Promise<Attempt[]>;
  startSession(meta: SessionMeta): Promise<string>;
  endSession(id: string, summary: SessionSummary): Promise<void>;
  getUnlocks(profileId?: string): Promise<Set<string>>;
  addUnlock(key: string, profileId?: string): Promise<void>;
  getSetting<T>(key: string, defaultValue: T): Promise<T>;
  setSetting<T>(key: string, value: T): Promise<void>;
  rebuildFromLog(profileId?: string): Promise<Map<string, FactState>>;
  calculateStreakDays(profileId?: string): Promise<number>;
  exportJson(): Promise<string>;
  importJson(jsonStr: string): Promise<void>;
}

export class LocalDexieRepository implements ProgressRepository {
  private defaultProfileId = 'default';

  async recordAttempt(attempt: Attempt): Promise<void> {
    const profileId = attempt.profileId || this.defaultProfileId;

    // 1. Save immutable attempt
    await db.attempts.add({
      ...attempt,
      profileId
    });

    // 2. Fetch current cached factState
    const cached = await db.factState.get([profileId, attempt.familyId]);
    const currentFactState = cached ? cached.state : createInitialFactStateMap().get(attempt.familyId)!;

    // 3. Apply state transition
    const updatedFactState = applyAttemptToFactState(currentFactState, attempt, attempt.at);

    // 4. Update cache
    await db.factState.put({
      profileId,
      familyId: attempt.familyId,
      level: updatedFactState.level,
      effective: updatedFactState.effective,
      state: updatedFactState
    });
  }

  async recordAttempts(attempts: Attempt[]): Promise<void> {
    for (const a of attempts) {
      await this.recordAttempt(a);
    }
  }

  async getFactState(profileId: string = this.defaultProfileId): Promise<Map<string, FactState>> {
    const cachedList = await db.factState.where({ profileId }).toArray();
    const map = createInitialFactStateMap();

    const now = Date.now();
    for (const item of cachedList) {
      const refreshed = refreshFactStateDecay(item.state, now);
      map.set(item.familyId, refreshed);
    }

    return map;
  }

  async getRecentAttempts(profileId: string = this.defaultProfileId, limit: number = 50): Promise<Attempt[]> {
    const attempts = await db.attempts
      .where('[profileId+at]')
      .between([profileId, Dexie.minKey], [profileId, Dexie.maxKey])
      .reverse()
      .limit(limit)
      .toArray();

    return attempts;
  }

  async startSession(meta: SessionMeta): Promise<string> {
    const profileId = meta.profileId || this.defaultProfileId;
    const sessionDoc: DbSession = {
      id: meta.id,
      profileId,
      mode: meta.mode,
      startedAt: meta.startedAt
    };
    await db.sessions.add(sessionDoc);
    return meta.id;
  }

  async endSession(id: string, summary: SessionSummary): Promise<void> {
    await db.sessions.update(id, {
      endedAt: summary.endedAt,
      summary
    });
  }

  async getUnlocks(profileId: string = this.defaultProfileId): Promise<Set<string>> {
    const list = await db.unlocks.where({ profileId }).toArray();
    const keys = new Set<string>(['star_patrol']); // default skin always unlocked
    for (const u of list) {
      keys.add(u.key);
    }
    return keys;
  }

  async addUnlock(key: string, profileId: string = this.defaultProfileId): Promise<void> {
    await db.unlocks.put({
      profileId,
      key,
      unlockedAt: Date.now()
    });
  }

  async getSetting<T>(key: string, defaultValue: T): Promise<T> {
    const item = await db.settings.get(key);
    if (!item) return defaultValue;
    return item.value as T;
  }

  async setSetting<T>(key: string, value: T): Promise<void> {
    await db.settings.put({ key, value });
  }

  async rebuildFromLog(profileId: string = this.defaultProfileId): Promise<Map<string, FactState>> {
    const allAttempts = await db.attempts.where({ profileId }).sortBy('at');
    const rebuiltMap = rebuildFactState(allAttempts);

    // Overwrite cached factState table
    await db.transaction('rw', db.factState, async () => {
      await db.factState.where({ profileId }).delete();
      const entries: DbFactState[] = [];
      for (const [familyId, state] of rebuiltMap.entries()) {
        entries.push({
          profileId,
          familyId,
          level: state.level,
          effective: state.effective,
          state
        });
      }
      await db.factState.bulkAdd(entries);
    });

    return rebuiltMap;
  }

  async calculateStreakDays(profileId: string = this.defaultProfileId): Promise<number> {
    const attempts = await db.attempts.where({ profileId }).sortBy('at');
    if (attempts.length === 0) return 0;

    // Group dates by local day string (YYYY-MM-DD)
    const daysSet = new Set<string>();
    for (const a of attempts) {
      const d = new Date(a.at);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      daysSet.add(dateKey);
    }

    const today = new Date();
    let checkDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const dateToKey = (date: Date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    let streak = 0;
    const todayKey = dateToKey(checkDate);

    if (daysSet.has(todayKey)) {
      while (daysSet.has(dateToKey(checkDate))) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }
    } else {
      checkDate.setDate(checkDate.getDate() - 1);
      while (daysSet.has(dateToKey(checkDate))) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }
    }

    return streak;
  }

  async exportJson(): Promise<string> {
    const attempts = await db.attempts.toArray();
    const sessions = await db.sessions.toArray();
    const unlocks = await db.unlocks.toArray();
    const settings = await db.settings.toArray();

    const data = {
      version: 1,
      exportedAt: Date.now(),
      attempts,
      sessions,
      unlocks,
      settings
    };

    return JSON.stringify(data, null, 2);
  }

  async importJson(jsonStr: string): Promise<void> {
    const data = JSON.parse(jsonStr);
    if (!data || !Array.isArray(data.attempts)) {
      throw new Error('Invalid backup data');
    }

    await db.transaction('rw', [db.attempts, db.factState, db.sessions, db.unlocks, db.settings], async () => {
      await db.attempts.clear();
      await db.factState.clear();
      await db.sessions.clear();
      await db.unlocks.clear();
      await db.settings.clear();

      if (data.attempts.length > 0) await db.attempts.bulkAdd(data.attempts);
      if (data.sessions?.length > 0) await db.sessions.bulkAdd(data.sessions);
      if (data.unlocks?.length > 0) await db.unlocks.bulkAdd(data.unlocks);
      if (data.settings?.length > 0) await db.settings.bulkAdd(data.settings);
    });

    await this.rebuildFromLog();
  }
}

export const repository = new LocalDexieRepository();
