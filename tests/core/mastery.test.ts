import { describe, it, expect } from 'vitest';
import {
  calculateQuality,
  updateRawStrength,
  calculateEffectiveStrength,
  applyAttemptToFactState,
  createInitialFactState
} from '../../src/core/mastery';
import { Attempt } from '../../src/core/types';
import { SeededRNG } from '../../src/core/rng';

describe('Mastery Model (mastery.ts)', () => {
  it('verifies q is monotonically non-increasing in thinkMs', () => {
    let prevQ = calculateQuality({ correct: true, thinkMs: 0 });
    expect(prevQ).toBe(1.0);

    for (let thinkMs = 100; thinkMs <= 10000; thinkMs += 100) {
      const q = calculateQuality({ correct: true, thinkMs });
      expect(q).toBeLessThanOrEqual(prevQ);
      expect(q).toBeGreaterThanOrEqual(0.3);
      prevQ = q;
    }

    // Incorrect attempt is always 0
    expect(calculateQuality({ correct: false, thinkMs: 500 })).toBe(0);
    expect(calculateQuality({ correct: false, thinkMs: 3000 })).toBe(0);
  });

  it('ensures correct fast attempt never decreases strength; incorrect never increases it', () => {
    for (let s = 0; s <= 1.0; s += 0.05) {
      const qFast = calculateQuality({ correct: true, thinkMs: 1200 }); // q = 1.0
      const nextCorrect = updateRawStrength(s, qFast, true, 'typed');
      expect(nextCorrect).toBeGreaterThanOrEqual(s);

      const qWrong = calculateQuality({ correct: false, thinkMs: 1200 }); // q = 0
      const nextWrong = updateRawStrength(s, qWrong, false, 'typed');
      expect(nextWrong).toBeLessThanOrEqual(s);
    }
  });

  it('keeps strength in [0, 1] across 10,000 random attempts', () => {
    const rng = new SeededRNG(42);
    let state = createInitialFactState('7x8');

    for (let i = 0; i < 10000; i++) {
      const correct = rng.next() > 0.3;
      const thinkMs = rng.nextInt(500, 8000);
      const inputMode = rng.next() > 0.5 ? 'typed' : 'choice';
      const group = rng.next() > 0.5 ? 'mul' : 'div';

      const attempt: Attempt = {
        id: `att-${i}`,
        profileId: 'default',
        sessionId: 'session-1',
        familyId: '7x8',
        direction: group === 'mul' ? 'MUL_AB' : 'DIV_A',
        group,
        expected: 56,
        given: correct ? 56 : 54,
        correct,
        thinkMs,
        totalMs: thinkMs + 500,
        inputMode,
        mode: 'practice',
        at: 1000000 + i * 10000,
        schemaVersion: 1
      };

      state = applyAttemptToFactState(state, attempt, attempt.at);
      expect(state.mul.rawStrength).toBeGreaterThanOrEqual(0);
      expect(state.mul.rawStrength).toBeLessThanOrEqual(1);
      expect(state.div.rawStrength).toBeGreaterThanOrEqual(0);
      expect(state.div.rawStrength).toBeLessThanOrEqual(1);
      expect(state.effective).toBeGreaterThanOrEqual(0);
      expect(state.effective).toBeLessThanOrEqual(1);
    }
  });

  it('reaches Automatic with 10 typed correct fast attempts, but NOT with 10 choice attempts', () => {
    // 10 typed attempts on both mul and div (total 20 attempts)
    let typedFact = createInitialFactState('7x8');
    for (let i = 0; i < 10; i++) {
      const mulAttempt: Attempt = {
        id: `t-mul-${i}`,
        profileId: 'default',
        sessionId: 'sess',
        familyId: '7x8',
        direction: 'MUL_AB',
        group: 'mul',
        expected: 56,
        given: 56,
        correct: true,
        thinkMs: 1200,
        totalMs: 1500,
        inputMode: 'typed',
        mode: 'practice',
        at: 1000 + i * 1000,
        schemaVersion: 1
      };
      const divAttempt: Attempt = {
        id: `t-div-${i}`,
        profileId: 'default',
        sessionId: 'sess',
        familyId: '7x8',
        direction: 'DIV_A',
        group: 'div',
        expected: 8,
        given: 8,
        correct: true,
        thinkMs: 1200,
        totalMs: 1500,
        inputMode: 'typed',
        mode: 'practice',
        at: 1500 + i * 1000,
        schemaVersion: 1
      };
      typedFact = applyAttemptToFactState(typedFact, mulAttempt);
      typedFact = applyAttemptToFactState(typedFact, divAttempt);
    }

    expect(typedFact.effective).toBeGreaterThanOrEqual(0.90);
    expect(typedFact.level).toBe('automatic');

    // Now 10 choice attempts with identical timings
    let choiceFact = createInitialFactState('7x8');
    for (let i = 0; i < 10; i++) {
      const mulAttempt: Attempt = {
        id: `c-mul-${i}`,
        profileId: 'default',
        sessionId: 'sess',
        familyId: '7x8',
        direction: 'MUL_AB',
        group: 'mul',
        expected: 56,
        given: 56,
        correct: true,
        thinkMs: 1200,
        totalMs: 1500,
        inputMode: 'choice',
        mode: 'practice',
        at: 1000 + i * 1000,
        schemaVersion: 1
      };
      const divAttempt: Attempt = {
        id: `c-div-${i}`,
        profileId: 'default',
        sessionId: 'sess',
        familyId: '7x8',
        direction: 'DIV_A',
        group: 'div',
        expected: 8,
        given: 8,
        correct: true,
        thinkMs: 1200,
        totalMs: 1500,
        inputMode: 'choice',
        mode: 'practice',
        at: 1500 + i * 1000,
        schemaVersion: 1
      };
      choiceFact = applyAttemptToFactState(choiceFact, mulAttempt);
      choiceFact = applyAttemptToFactState(choiceFact, divAttempt);
    }

    // Choice weight (0.4) prevents premature automatic classification
    expect(choiceFact.effective).toBeLessThan(0.90);
    expect(choiceFact.level).not.toBe('automatic');
  });

  it('verifies decay: strength after halfLifeDays is within epsilon of half', () => {
    const raw = 0.8;
    const halfLife = 12; // 12 days
    const decayed = calculateEffectiveStrength(raw, halfLife, halfLife);
    expect(decayed).toBeCloseTo(0.4, 5);

    // After 2 * halfLife, should be quarter
    const decayedTwice = calculateEffectiveStrength(raw, 2 * halfLife, halfLife);
    expect(decayedTwice).toBeCloseTo(0.2, 5);
  });
});
