import Dexie, { type Table } from 'dexie';
import { Attempt, FactState, MasteryLevel, SessionMode, SessionSummary } from '../core/types';

export interface DbProfile {
  id: string;
  createdAt: number;
  displayName: string;
}

export interface DbAttempt extends Attempt {}

export interface DbFactState {
  profileId: string;
  familyId: string;
  level: MasteryLevel;
  effective: number;
  state: FactState; // full cached json
}

export interface DbSession {
  id: string;
  profileId: string;
  mode: SessionMode;
  startedAt: number;
  endedAt?: number;
  summary?: SessionSummary;
}

export interface DbUnlock {
  profileId: string;
  key: string;
  unlockedAt: number;
}

export interface DbSetting {
  key: string;
  value: any;
}

export class TenByTenDatabase extends Dexie {
  profiles!: Table<DbProfile, string>;
  attempts!: Table<DbAttempt, string>;
  factState!: Table<DbFactState, [string, string]>;
  sessions!: Table<DbSession, string>;
  unlocks!: Table<DbUnlock, [string, string]>;
  settings!: Table<DbSetting, string>;

  constructor() {
    super('TenByTenDB');

    this.version(1).stores({
      profiles: 'id, createdAt, displayName',
      attempts: 'id, [profileId+at], familyId, sessionId, mode, at',
      factState: '[profileId+familyId], profileId, familyId, level, effective',
      sessions: 'id, [profileId+startedAt], mode, startedAt',
      unlocks: '[profileId+key], profileId, key',
      settings: 'key'
    });
  }
}

export const db = new TenByTenDatabase();
