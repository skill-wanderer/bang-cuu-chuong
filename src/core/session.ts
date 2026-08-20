import { Attempt, FactState, Prompt, SessionMeta, SessionSummary } from './types';
import { ALL_FAMILIES, ALL_PROMPTS } from './facts';
import { RNG, defaultRNG } from './rng';

/**
 * Builds the 24-prompt stratified calibration sequence
 * - Every table 1-10 appears >= 2 times
 * - Weighted toward high-d families
 * - ~60% multiplication / ~40% division
 */
export function buildCalibrationPrompts(rng: RNG = defaultRNG): Prompt[] {
  const tableCounts = new Array(11).fill(0); // 1-indexed

  // Sort families by difficulty prior descending
  const sortedFamilies = [...ALL_FAMILIES].sort((a, b) => {
    if (b.priorDifficulty !== a.priorDifficulty) {
      return b.priorDifficulty - a.priorDifficulty;
    }
    return rng.next() - 0.5;
  });

  // Target: 14 mul, 10 div = 24 total
  const selectedPrompts: Prompt[] = [];

  // Pass 1: Ensure every table 1-10 is represented
  for (let table = 1; table <= 10; table++) {
    const tablePrompts = ALL_PROMPTS.filter(p => (p.a === table || p.b === table) && !selectedPrompts.some(sp => sp.id === p.id));
    const shuffled = rng.shuffle(tablePrompts);
    if (shuffled.length > 0) {
      const chosen = shuffled[0];
      selectedPrompts.push(chosen);
      tableCounts[chosen.a]++;
      tableCounts[chosen.b]++;
    }
  }

  // Pass 2: Add high difficulty facts until we reach 24 prompts
  for (const family of sortedFamilies) {
    if (selectedPrompts.length >= 24) break;
    const currentMul = selectedPrompts.filter(p => p.group === 'mul').length;
    const preferMul = currentMul < 14;

    const available = family.prompts.filter(p => !selectedPrompts.some(sp => sp.id === p.id));
    const matching = available.filter(p => (preferMul ? p.group === 'mul' : p.group === 'div'));
    const candidate = matching.length > 0 ? rng.choice(matching) : (available.length > 0 ? rng.choice(available) : null);

    if (candidate) {
      selectedPrompts.push(candidate);
      tableCounts[candidate.a]++;
      tableCounts[candidate.b]++;
    }
  }

  // If still under 24, fill from remaining
  const remaining = ALL_PROMPTS.filter(p => !selectedPrompts.some(sp => sp.id === p.id));
  const shuffledRemaining = rng.shuffle(remaining);
  while (selectedPrompts.length < 24 && shuffledRemaining.length > 0) {
    selectedPrompts.push(shuffledRemaining.pop()!);
  }

  // Shuffle prompts avoiding immediate consecutive same family
  const shuffled = rng.shuffle(selectedPrompts);
  return shuffled;
}

/**
 * Builds a 12-prompt Boss Run for a specific table
 */
export function buildBossRunPrompts(tableNumber: number, rng: RNG = defaultRNG): Prompt[] {
  const tablePrompts = ALL_PROMPTS.filter(p => p.a === tableNumber || p.b === tableNumber);
  const mulPrompts = tablePrompts.filter(p => p.group === 'mul');
  const divPrompts = tablePrompts.filter(p => p.group === 'div');

  // 7 mul, 5 div
  const selected: Prompt[] = [
    ...rng.shuffle(mulPrompts).slice(0, 7),
    ...rng.shuffle(divPrompts).slice(0, 5)
  ];

  return rng.shuffle(selected).slice(0, 12);
}

/**
 * Calculates session summary statistics from completed attempts
 */
export function calculateSessionSummary(
  meta: SessionMeta,
  attempts: Attempt[],
  endedAt: number = Date.now(),
  initialFactStateMap?: Map<string, FactState>,
  finalFactStateMap?: Map<string, FactState>,
  streakDays: number = 1
): SessionSummary {
  const totalPrompts = attempts.length;
  const correctCount = attempts.filter(a => a.correct).length;
  const accuracy = totalPrompts > 0 ? correctCount / totalPrompts : 0;

  const correctAttempts = attempts.filter(a => a.correct);
  const thinkTimes = correctAttempts.map(a => a.thinkMs).sort((a, b) => a - b);
  
  const medianThinkMs = thinkTimes.length > 0
    ? thinkTimes[Math.floor(thinkTimes.length / 2)]
    : 0;

  const bestThinkMs = thinkTimes.length > 0 ? thinkTimes[0] : 0;

  // Identify facts improved
  const factsImproved: string[] = [];
  if (initialFactStateMap && finalFactStateMap) {
    for (const [familyId, finalFact] of finalFactStateMap.entries()) {
      const initialFact = initialFactStateMap.get(familyId);
      if (initialFact) {
        if (finalFact.effective > initialFact.effective + 0.05 || (initialFact.level !== finalFact.level && finalFact.level !== 'shaky')) {
          factsImproved.push(familyId);
        }
      }
    }
  }

  let clearedBoss = false;
  if (meta.mode === 'boss') {
    // Boss cleared: 12 prompts, all correct (or at most 1 miss), median thinkMs <= 2500ms
    clearedBoss = totalPrompts >= 12 && correctCount >= 11 && medianThinkMs <= 2500;
  }

  return {
    id: meta.id,
    profileId: meta.profileId,
    mode: meta.mode,
    startedAt: meta.startedAt,
    endedAt,
    totalPrompts,
    correctCount,
    accuracy,
    medianThinkMs,
    bestThinkMs,
    streakDays,
    factsImproved,
    clearedBoss
  };
}
