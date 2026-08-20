import { Attempt, FactState } from '../core/types';
import { applyAttemptToFactState, createInitialFactStateMap } from '../core/mastery';

/**
 * Rebuilds the entire FactState map by folding over an immutable append-only log of attempts.
 * This is the single source of truth guarantee for mastery and persistence.
 */
export function rebuildFactState(attempts: readonly Attempt[]): Map<string, FactState> {
  const factStateMap = createInitialFactStateMap();

  // Sort attempts chronologically
  const sorted = [...attempts].sort((a, b) => a.at - b.at);

  for (const attempt of sorted) {
    const current = factStateMap.get(attempt.familyId);
    if (current) {
      const next = applyAttemptToFactState(current, attempt, attempt.at);
      factStateMap.set(attempt.familyId, next);
    }
  }

  return factStateMap;
}
