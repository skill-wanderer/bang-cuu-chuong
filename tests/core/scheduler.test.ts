import { describe, it, expect } from 'vitest';
import { getNextPrompt } from '../../src/core/scheduler';
import { createInitialFactStateMap } from '../../src/core/mastery';
import { SeededRNG } from '../../src/core/rng';
import { Prompt } from '../../src/core/types';

describe('Scheduler (scheduler.ts)', () => {
  it('never violates constraints 1-3 over 1,000 prompts with standard pool', () => {
    const factStateMap = createInitialFactStateMap();
    const rng = new SeededRNG(12345);
    const history: Prompt[] = [];

    for (let i = 0; i < 1000; i++) {
      const nextPrompt = getNextPrompt(factStateMap, history, { rng });

      // Constraint 1: No family repeated within last 3
      const last3 = history.slice(-3);
      expect(last3.some(p => p.familyId === nextPrompt.familyId)).toBe(false);

      // Constraint 2: No identical prompt within last 8
      const last8 = history.slice(-8);
      expect(last8.some(p => p.id === nextPrompt.id)).toBe(false);

      // Constraint 3: No more than 2 consecutive of same operation
      if (history.length >= 2) {
        const last1 = history[history.length - 1];
        const last2 = history[history.length - 2];
        const threeInARow = last1.group === nextPrompt.group && last2.group === nextPrompt.group;
        expect(threeInARow).toBe(false);
      }

      history.push(nextPrompt);
    }
  });

  it('produces identical sequences given identical seed and state', () => {
    const factMapA = createInitialFactStateMap();
    const rngA = new SeededRNG(999);
    const historyA: Prompt[] = [];

    const factMapB = createInitialFactStateMap();
    const rngB = new SeededRNG(999);
    const historyB: Prompt[] = [];

    for (let i = 0; i < 100; i++) {
      const promptA = getNextPrompt(factMapA, historyA, { rng: rngA });
      const promptB = getNextPrompt(factMapB, historyB, { rng: rngB });
      expect(promptA.id).toBe(promptB.id);

      historyA.push(promptA);
      historyB.push(promptB);
    }
  });

  it('shows a family forced to strength 0 within the next 10 prompts', () => {
    const factStateMap = createInitialFactStateMap();
    const rng = new SeededRNG(777);

    // Set all facts to solid strength 0.85 except 7x8 which is 0.0
    for (const [, fact] of factStateMap.entries()) {
      fact.mul.effectiveStrength = 0.85;
      fact.div.effectiveStrength = 0.85;
      fact.effective = 0.85;
      fact.level = 'solid';
    }

    const weakFact = factStateMap.get('7x8')!;
    weakFact.mul.effectiveStrength = 0.01;
    weakFact.div.effectiveStrength = 0.01;
    weakFact.effective = 0.01;
    weakFact.level = 'shaky';

    const history: Prompt[] = [];
    let sawWeakFact = false;

    for (let i = 0; i < 10; i++) {
      const prompt = getNextPrompt(factStateMap, history, { rng });
      if (prompt.familyId === '7x8') {
        sawWeakFact = true;
        break;
      }
      history.push(prompt);
    }

    expect(sawWeakFact).toBe(true);
  });

  it('lands direction mix within 10 percentage points of 50/50 balance over 500 prompts', () => {
    const factStateMap = createInitialFactStateMap();
    const rng = new SeededRNG(54321);
    const history: Prompt[] = [];

    for (let i = 0; i < 500; i++) {
      const prompt = getNextPrompt(factStateMap, history, { rng });
      history.push(prompt);
    }

    const mulCount = history.filter(p => p.group === 'mul').length;
    const divCount = history.filter(p => p.group === 'div').length;

    const mulRatio = mulCount / 500;
    const divRatio = divCount / 500;

    // Both should be in [0.40, 0.60]
    expect(mulRatio).toBeGreaterThanOrEqual(0.40);
    expect(mulRatio).toBeLessThanOrEqual(0.60);
    expect(divRatio).toBeGreaterThanOrEqual(0.40);
    expect(divRatio).toBeLessThanOrEqual(0.60);
  });

  it('generates 100% multiplication prompts when operationMode is "mul"', () => {
    const factStateMap = createInitialFactStateMap();
    const rng = new SeededRNG(4444);
    const history: Prompt[] = [];

    for (let i = 0; i < 200; i++) {
      const prompt = getNextPrompt(factStateMap, history, { rng, operationMode: 'mul' });
      expect(prompt.group).toBe('mul');

      // Constraint 1: No family repeated within last 3
      const last3 = history.slice(-3);
      expect(last3.some(p => p.familyId === prompt.familyId)).toBe(false);

      // Constraint 2: No identical prompt within last 8
      const last8 = history.slice(-8);
      expect(last8.some(p => p.id === prompt.id)).toBe(false);

      history.push(prompt);
    }

    expect(history.every(p => p.group === 'mul')).toBe(true);
    expect(history.length).toBe(200);
  });

  it('generates 100% division prompts when operationMode is "div"', () => {
    const factStateMap = createInitialFactStateMap();
    const rng = new SeededRNG(8888);
    const history: Prompt[] = [];

    for (let i = 0; i < 200; i++) {
      const prompt = getNextPrompt(factStateMap, history, { rng, operationMode: 'div' });
      expect(prompt.group).toBe('div');

      // Constraint 1: No family repeated within last 3
      const last3 = history.slice(-3);
      expect(last3.some(p => p.familyId === prompt.familyId)).toBe(false);

      // Constraint 2: No identical prompt within last 8
      const last8 = history.slice(-8);
      expect(last8.some(p => p.id === prompt.id)).toBe(false);

      history.push(prompt);
    }

    expect(history.every(p => p.group === 'div')).toBe(true);
    expect(history.length).toBe(200);
  });
});
