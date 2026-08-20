import { FactState, GroupState, OperationMode, Prompt } from './types';
import { ALL_PROMPTS } from './facts';
import { RNG, defaultRNG } from './rng';

export interface SchedulerOptions {
  rng?: RNG;
  nowMs?: number;
  allowedTable?: number; // for table focus
  allowedPrompts?: Prompt[]; // custom restricted set
  operationMode?: OperationMode; // 'both' | 'mul' | 'div'
}

export interface PromptCandidate {
  prompt: Prompt;
  groupState: GroupState;
  factState: FactState;
  urgency: number;
  daysSinceLast: number;
}

/**
 * Calculates error rate over the last N attempts (up to 5) for a group
 */
export function calculateGroupErrorRate(groupState: GroupState, windowSize: number = 5): number {
  if (!groupState.recentAttempts || groupState.recentAttempts.length === 0) {
    return 0;
  }
  const slice = groupState.recentAttempts.slice(-windowSize);
  const errors = slice.filter(a => !a.correct).length;
  return errors / slice.length;
}

/**
 * Computes urgency score for a specific (family, group)
 */
export function computePromptUrgency(
  groupState: GroupState,
  nowMs: number
): { urgency: number; daysSinceLast: number } {
  const daysSinceLast = groupState.lastAttemptAt
    ? Math.max(0, (nowMs - groupState.lastAttemptAt) / (1000 * 60 * 60 * 24))
    : 30; // Unseen or long time defaults to 30 days

  const base = Math.max(0.01, 1 - groupState.effectiveStrength);
  const dueBoost = daysSinceLast > groupState.halfLifeDays ? 1.30 : 1.0;
  const divBoost = groupState.group === 'div' ? 1.15 : 1.0;
  const errorRate = calculateGroupErrorRate(groupState, 5);
  const errorBoost = 1 + 0.5 * errorRate;

  const urgency = base * dueBoost * divBoost * errorBoost;
  return { urgency, daysSinceLast };
}

/**
 * Checks if a candidate prompt satisfies the 4 hard constraints against recent history
 */
export function validateConstraints(
  candidate: Prompt,
  recentHistory: Prompt[],
  factStateMap: Map<string, FactState>,
  relaxLevel: number = 0, // 0 = all strict, 1 = relax constraint 4, 2 = relax 3, 3 = relax 2, 4 = relax 1
  operationMode: OperationMode = 'both'
): boolean {
  // Constraint 1: No family repeated within the last 3 prompts
  if (relaxLevel < 4) {
    const last3 = recentHistory.slice(-3);
    if (last3.some(p => p.familyId === candidate.familyId)) {
      return false;
    }
  }

  // Constraint 2: No identical prompt within the last 8
  if (relaxLevel < 3) {
    const last8 = recentHistory.slice(-8);
    if (last8.some(p => p.id === candidate.id)) {
      return false;
    }
  }

  // Constraint 3: No more than 2 consecutive prompts of the same operation (forces interleaving)
  // Only applies when both multiplication and division operations are active
  if (relaxLevel < 2 && (!operationMode || operationMode === 'both')) {
    if (recentHistory.length >= 2) {
      const last1 = recentHistory[recentHistory.length - 1];
      const last2 = recentHistory[recentHistory.length - 2];
      if (last1.group === candidate.group && last2.group === candidate.group) {
        return false;
      }
    }
  }

  // Constraint 4: At most 6 families below "Getting there" in active rotation (last 12 prompts)
  if (relaxLevel < 1) {
    const candidateFact = factStateMap.get(candidate.familyId);
    const isWeakCandidate = candidateFact ? (candidateFact.level === 'shaky' || candidateFact.effective < 0.45) : false;
    if (isWeakCandidate) {
      const last12 = recentHistory.slice(-12);
      const weakFamiliesInWindow = new Set<string>();
      for (const p of last12) {
        const fact = factStateMap.get(p.familyId);
        if (fact && (fact.level === 'shaky' || fact.effective < 0.45)) {
          weakFamiliesInWindow.add(p.familyId);
        }
      }
      if (weakFamiliesInWindow.size >= 6 && !weakFamiliesInWindow.has(candidate.familyId)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Weighted random selection
 */
function weightedSample<T>(items: T[], weights: number[], rng: RNG): T {
  let totalWeight = 0;
  for (let i = 0; i < weights.length; i++) {
    totalWeight += Math.max(0, weights[i]);
  }
  if (totalWeight <= 0) {
    return rng.choice(items);
  }

  let randomVal = rng.next() * totalWeight;
  for (let i = 0; i < items.length; i++) {
    randomVal -= Math.max(0, weights[i]);
    if (randomVal <= 0) {
      return items[i];
    }
  }
  return items[items.length - 1];
}

/**
 * Selects the next prompt to present to the user based on fact states and session history.
 */
export function getNextPrompt(
  factStateMap: Map<string, FactState>,
  recentHistory: Prompt[] = [],
  options: SchedulerOptions = {}
): Prompt {
  const rng = options.rng ?? defaultRNG;
  const nowMs = options.nowMs ?? Date.now();

  const rawPool = options.allowedPrompts ?? (
    options.allowedTable
      ? ALL_PROMPTS.filter(p => p.a === options.allowedTable || p.b === options.allowedTable)
      : ALL_PROMPTS
  );

  const operationMode = options.operationMode ?? 'both';
  const pool = rawPool.filter(p => {
    if (operationMode === 'mul') return p.group === 'mul';
    if (operationMode === 'div') return p.group === 'div';
    return true;
  });

  if (pool.length === 0) {
    throw new Error('Scheduler prompt pool is empty');
  }

  // Pre-calculate candidates
  const candidates: PromptCandidate[] = pool.map(prompt => {
    const fact = factStateMap.get(prompt.familyId);
    if (!fact) {
      throw new Error(`Missing fact state for ${prompt.familyId}`);
    }
    const groupState = prompt.group === 'mul' ? fact.mul : fact.div;
    const { urgency, daysSinceLast } = computePromptUrgency(groupState, nowMs);
    return {
      prompt,
      groupState,
      factState: fact,
      urgency,
      daysSinceLast
    };
  });

  // Try sampling with relaxation levels (0 to 4)
  for (let relaxLevel = 0; relaxLevel <= 4; relaxLevel++) {
    for (let attempt = 0; attempt < 20; attempt++) {
      const roll = rng.next();
      let selected: PromptCandidate;

      if (roll < 0.75) {
        // 75% Urgency^2 weighted sample
        const weights = candidates.map(c => c.urgency * c.urgency);
        selected = weightedSample(candidates, weights, rng);
      } else if (roll < 0.95) {
        // 20% Solid / Automatic maintenance pool
        const solidPool = candidates.filter(
          c => c.groupState.effectiveStrength >= 0.75 || c.factState.level === 'solid' || c.factState.level === 'automatic'
        );
        if (solidPool.length > 0) {
          const weights = solidPool.map(c => Math.max(1, c.daysSinceLast));
          selected = weightedSample(solidPool, weights, rng);
        } else {
          // Fallback to urgency
          const weights = candidates.map(c => c.urgency * c.urgency);
          selected = weightedSample(candidates, weights, rng);
        }
      } else {
        // 5% Uniform random variety
        selected = rng.choice(candidates);
      }

      if (validateConstraints(selected.prompt, recentHistory, factStateMap, relaxLevel, operationMode)) {
        return selected.prompt;
      }
    }
  }

  // Ultimate fallback if constrained
  return rng.choice(pool);
}
