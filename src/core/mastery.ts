import { Attempt, DirectionGroup, FactState, GroupState, InputMode, MasteryLevel } from './types';
import { ALL_FAMILIES, FAMILY_MAP } from './facts';

export function clamp01(val: number): number {
  if (val < 0) return 0;
  if (val > 1) return 1;
  return Number.isFinite(val) ? val : 0;
}

/**
 * Calculates attempt quality q in [0, 1] based on correctness and thinkMs (latency to first keypress).
 */
export function calculateQuality(attempt: { correct: boolean; thinkMs: number }): number {
  if (!attempt.correct) {
    return 0;
  }
  if (attempt.thinkMs <= 2000) {
    return 1.0;
  }
  if (attempt.thinkMs <= 5000) {
    return 1.0 - 0.6 * (attempt.thinkMs - 2000) / 3000; // Linear from 1.0 to 0.4
  }
  return 0.3;
}

/**
 * Updates raw strength given previous strength, quality q, correctness, and inputMode.
 */
export function updateRawStrength(
  currentStrength: number,
  q: number,
  correct: boolean,
  inputMode: InputMode
): number {
  const alpha = correct ? 0.30 : 0.50;
  const weight = inputMode === 'typed' ? 1.0 : 0.4;
  const newStrength = currentStrength + alpha * weight * (q - currentStrength);
  return clamp01(newStrength);
}

/**
 * Computes memory half life in days from consecutive high-quality attempts (q >= 0.7).
 */
export function calculateHalfLifeDays(consecutiveGood: number): number {
  return Math.min(60, 1.5 * Math.pow(2, Math.max(0, consecutiveGood)));
}

/**
 * Applies exponential decay to raw strength based on elapsed days.
 */
export function calculateEffectiveStrength(
  rawStrength: number,
  daysSinceLast: number,
  halfLifeDays: number
): number {
  if (daysSinceLast <= 0 || halfLifeDays <= 0) {
    return clamp01(rawStrength);
  }
  const decayed = rawStrength * Math.pow(0.5, daysSinceLast / halfLifeDays);
  return clamp01(decayed);
}

/**
 * Derives mastery level from effective strength and recent attempt quality.
 */
export function deriveMasteryLevel(
  effective: number,
  recentAttempts: Attempt[],
  totalAttempts: number
): MasteryLevel {
  if (totalAttempts === 0) {
    return 'unseen';
  }
  if (effective < 0.45) {
    return 'shaky';
  }
  if (effective < 0.75) {
    return 'getting_there';
  }
  if (effective < 0.90) {
    return 'solid';
  }

  // Automatic: >= 0.90 AND last 3 attempts all q >= 0.7
  if (recentAttempts.length >= 3) {
    const last3 = recentAttempts.slice(-3);
    const allHighQuality = last3.every(a => calculateQuality(a) >= 0.7);
    if (allHighQuality) {
      return 'automatic';
    }
  }

  return 'solid';
}

/**
 * Creates initial default group state for a given family
 */
export function createInitialGroupState(group: DirectionGroup, initialStrength: number): GroupState {
  return {
    group,
    rawStrength: initialStrength,
    effectiveStrength: initialStrength,
    consecutiveGood: 0,
    halfLifeDays: calculateHalfLifeDays(0),
    lastAttemptAt: null,
    attemptCount: 0,
    correctCount: 0,
    bestThinkMs: null,
    recentAttempts: []
  };
}

/**
 * Creates initial default fact state for a family
 */
export function createInitialFactState(familyId: string): FactState {
  const family = FAMILY_MAP.get(familyId);
  const a = family ? family.a : parseInt(familyId.split('x')[0], 10);
  const b = family ? family.b : parseInt(familyId.split('x')[1], 10);
  const initialStrength = family ? family.initialStrength : 0.50;

  const mul = createInitialGroupState('mul', initialStrength);
  const div = createInitialGroupState('div', initialStrength);

  return {
    familyId,
    a,
    b,
    mul,
    div,
    effective: initialStrength,
    level: 'unseen',
    totalAttempts: 0
  };
}

/**
 * Creates initial map of all 55 fact states
 */
export function createInitialFactStateMap(): Map<string, FactState> {
  const map = new Map<string, FactState>();
  for (const family of ALL_FAMILIES) {
    map.set(family.id, createInitialFactState(family.id));
  }
  return map;
}

/**
 * Updates a GroupState with a new attempt
 */
export function updateGroupState(
  prev: GroupState,
  attempt: Attempt,
  nowMs: number = attempt.at
): GroupState {
  const q = calculateQuality(attempt);
  const newRawStrength = updateRawStrength(prev.rawStrength, q, attempt.correct, attempt.inputMode);

  let newConsecutiveGood = prev.consecutiveGood;
  if (q >= 0.7) {
    newConsecutiveGood += 1;
  } else {
    newConsecutiveGood = 0;
  }

  const newHalfLifeDays = calculateHalfLifeDays(newConsecutiveGood);
  const daysSinceLast = prev.lastAttemptAt ? (nowMs - prev.lastAttemptAt) / (1000 * 60 * 60 * 24) : 0;
  const newEffective = calculateEffectiveStrength(newRawStrength, daysSinceLast, newHalfLifeDays);

  const newBestThinkMs = attempt.correct
    ? prev.bestThinkMs === null
      ? attempt.thinkMs
      : Math.min(prev.bestThinkMs, attempt.thinkMs)
    : prev.bestThinkMs;

  const newRecent = [...prev.recentAttempts, attempt].slice(-10);

  return {
    group: prev.group,
    rawStrength: newRawStrength,
    effectiveStrength: newEffective,
    consecutiveGood: newConsecutiveGood,
    halfLifeDays: newHalfLifeDays,
    lastAttemptAt: attempt.at,
    attemptCount: prev.attemptCount + 1,
    correctCount: prev.correctCount + (attempt.correct ? 1 : 0),
    bestThinkMs: newBestThinkMs,
    recentAttempts: newRecent
  };
}

/**
 * Recalculates effective strengths and decay for a fact state at a given timestamp
 */
export function refreshFactStateDecay(factState: FactState, nowMs: number = Date.now()): FactState {
  const mulDays = factState.mul.lastAttemptAt ? (nowMs - factState.mul.lastAttemptAt) / (1000 * 60 * 60 * 24) : 0;
  const mulEff = factState.mul.attemptCount === 0
    ? factState.mul.rawStrength
    : calculateEffectiveStrength(factState.mul.rawStrength, mulDays, factState.mul.halfLifeDays);

  const divDays = factState.div.lastAttemptAt ? (nowMs - factState.div.lastAttemptAt) / (1000 * 60 * 60 * 24) : 0;
  const divEff = factState.div.attemptCount === 0
    ? factState.div.rawStrength
    : calculateEffectiveStrength(factState.div.rawStrength, divDays, factState.div.halfLifeDays);

  const mulGroup: GroupState = { ...factState.mul, effectiveStrength: mulEff };
  const divGroup: GroupState = { ...factState.div, effectiveStrength: divEff };

  const effective = Math.min(mulEff, divEff);
  const allRecent = [...factState.mul.recentAttempts, ...factState.div.recentAttempts]
    .sort((x, y) => x.at - y.at)
    .slice(-10);

  const level = deriveMasteryLevel(effective, allRecent, factState.totalAttempts);

  return {
    ...factState,
    mul: mulGroup,
    div: divGroup,
    effective,
    level
  };
}

/**
 * Pure state transition: Given previous FactState and an Attempt, returns new FactState
 */
export function applyAttemptToFactState(
  prevState: FactState,
  attempt: Attempt,
  nowMs: number = attempt.at
): FactState {
  const isMul = attempt.group === 'mul';
  const updatedMul = isMul ? updateGroupState(prevState.mul, attempt, nowMs) : prevState.mul;
  const updatedDiv = !isMul ? updateGroupState(prevState.div, attempt, nowMs) : prevState.div;

  const totalAttempts = prevState.totalAttempts + 1;
  const effective = Math.min(updatedMul.effectiveStrength, updatedDiv.effectiveStrength);
  const allRecent = [...updatedMul.recentAttempts, ...updatedDiv.recentAttempts]
    .sort((x, y) => x.at - y.at)
    .slice(-10);

  const level = deriveMasteryLevel(effective, allRecent, totalAttempts);

  return {
    familyId: prevState.familyId,
    a: prevState.a,
    b: prevState.b,
    mul: updatedMul,
    div: updatedDiv,
    effective,
    level,
    totalAttempts
  };
}
