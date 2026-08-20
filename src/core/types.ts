export type Direction = 'MUL_AB' | 'MUL_BA' | 'DIV_A' | 'DIV_B';
export type DirectionGroup = 'mul' | 'div';
export type OperationMode = 'both' | 'mul' | 'div';
export type InputMode = 'typed' | 'choice';
export type SessionMode = 'calibration' | 'practice' | 'arcade' | 'boss' | 'table_focus';
export type MasteryLevel = 'unseen' | 'shaky' | 'getting_there' | 'solid' | 'automatic';

export interface Prompt {
  id: string;              // e.g. '7x8:MUL_AB'
  familyId: string;        // '7x8'
  direction: Direction;
  group: DirectionGroup;
  a: number;               // smaller operand (or first in family)
  b: number;               // larger operand
  display: string;         // '7 × 8' or '56 ÷ 7'
  expected: number;        // product or quotient
}

export interface Family {
  id: string;              // '${a}x${b}' with a <= b
  a: number;
  b: number;
  priorDifficulty: number; // d in [0, 1]
  initialStrength: number; // 0.75 - 0.5 * d
  prompts: Prompt[];
}

export interface Attempt {
  id: string;              // uuid or unique string
  profileId: string;       // 'default' in v1
  sessionId: string;
  familyId: string;        // '7x8'
  direction: Direction;
  group: DirectionGroup;
  expected: number;
  given: number | null;    // null = timed out / entity reached base
  correct: boolean;
  thinkMs: number;         // prompt render -> first keypress
  totalMs: number;         // prompt render -> submit
  inputMode: InputMode;
  mode: SessionMode;
  skinId?: string;
  at: number;              // epoch ms
  schemaVersion: 1;
}

export interface GroupState {
  group: DirectionGroup;
  rawStrength: number;
  effectiveStrength: number;
  consecutiveGood: number;
  halfLifeDays: number;
  lastAttemptAt: number | null;
  attemptCount: number;
  correctCount: number;
  bestThinkMs: number | null;
  recentAttempts: Attempt[];
}

export interface FactState {
  familyId: string;
  a: number;
  b: number;
  mul: GroupState;
  div: GroupState;
  effective: number;       // overall effective strength (min of mul and div effective, or mul if square)
  level: MasteryLevel;
  totalAttempts: number;
}

export interface SessionMeta {
  id: string;
  profileId: string;
  mode: SessionMode;
  startedAt: number;
  tableNumber?: number;    // for table_focus or boss
}

export interface SessionSummary {
  id: string;
  profileId: string;
  mode: SessionMode;
  startedAt: number;
  endedAt: number;
  totalPrompts: number;
  correctCount: number;
  accuracy: number;
  medianThinkMs: number;
  bestThinkMs: number;
  streakDays: number;
  factsImproved: string[]; // familyIds that went up in level or strength
  clearedBoss?: boolean;
}
