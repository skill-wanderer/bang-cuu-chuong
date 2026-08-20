import { describe, it, expect } from 'vitest';
import { rebuildFactState } from '../../src/data/rebuild';
import { applyAttemptToFactState, createInitialFactStateMap } from '../../src/core/mastery';
import { ALL_FAMILIES } from '../../src/core/facts';
import { Attempt } from '../../src/core/types';
import { SeededRNG } from '../../src/core/rng';

describe('Log Rebuild Equivalence (rebuild.ts)', () => {
  it('guarantees rebuildFactState(attempts) strictly matches incrementally-maintained state for 5,000 random attempts', () => {
    const rng = new SeededRNG(8888);
    const attempts: Attempt[] = [];
    const incrementalMap = createInitialFactStateMap();

    let currentTime = 1700000000000;

    for (let i = 0; i < 5000; i++) {
      const family = rng.choice(ALL_FAMILIES);
      const prompt = rng.choice(family.prompts);
      const correct = rng.next() > 0.25;
      const thinkMs = rng.nextInt(600, 6000);
      const inputMode = rng.next() > 0.3 ? 'typed' : 'choice';

      // Increment timestamp between 10 seconds and 3 days
      currentTime += rng.nextInt(10000, 3 * 24 * 60 * 60 * 1000);

      const attempt: Attempt = {
        id: `att-${i}`,
        profileId: 'default',
        sessionId: `sess-${Math.floor(i / 20)}`,
        familyId: family.id,
        direction: prompt.direction,
        group: prompt.group,
        expected: prompt.expected,
        given: correct ? prompt.expected : null,
        correct,
        thinkMs,
        totalMs: thinkMs + rng.nextInt(200, 1000),
        inputMode,
        mode: 'practice',
        at: currentTime,
        schemaVersion: 1
      };

      attempts.push(attempt);

      // Incrementally update
      const currentFact = incrementalMap.get(family.id)!;
      const updatedFact = applyAttemptToFactState(currentFact, attempt, attempt.at);
      incrementalMap.set(family.id, updatedFact);
    }

    // Now test batch rebuild from scratch
    const rebuiltMap = rebuildFactState(attempts);

    expect(rebuiltMap.size).toBe(incrementalMap.size);

    for (const [familyId, incrementalFact] of incrementalMap.entries()) {
      const rebuiltFact = rebuiltMap.get(familyId);
      expect(rebuiltFact).toBeDefined();
      if (rebuiltFact) {
        expect(rebuiltFact.familyId).toBe(incrementalFact.familyId);
        expect(rebuiltFact.totalAttempts).toBe(incrementalFact.totalAttempts);
        expect(rebuiltFact.level).toBe(incrementalFact.level);
        expect(rebuiltFact.effective).toBeCloseTo(incrementalFact.effective, 6);
        expect(rebuiltFact.mul.rawStrength).toBeCloseTo(incrementalFact.mul.rawStrength, 6);
        expect(rebuiltFact.mul.effectiveStrength).toBeCloseTo(incrementalFact.mul.effectiveStrength, 6);
        expect(rebuiltFact.mul.consecutiveGood).toBe(incrementalFact.mul.consecutiveGood);
        expect(rebuiltFact.div.rawStrength).toBeCloseTo(incrementalFact.div.rawStrength, 6);
        expect(rebuiltFact.div.effectiveStrength).toBeCloseTo(incrementalFact.div.effectiveStrength, 6);
        expect(rebuiltFact.div.consecutiveGood).toBe(incrementalFact.div.consecutiveGood);
      }
    }
  });
});
