import { Family, Prompt } from './types';

/**
 * Calculates difficulty prior d in [0, 1] for family (a, b) where 1 <= a <= b <= 10
 */
export function calculateDifficultyPrior(a: number, b: number): number {
  const easySet = new Set([1, 2, 5, 10]);
  if (easySet.has(a) || easySet.has(b)) {
    return 0.15;
  }
  if (a === b) {
    return 0.35;
  }
  const hardSet = new Set([6, 7, 8, 9]);
  if (hardSet.has(a) && hardSet.has(b)) {
    return 0.85;
  }
  return 0.50;
}

/**
 * Resolves any multiplication or division expression into its canonical family ID
 */
export function getCanonicalFamilyId(x: number, y: number, op: '*' | '×' | '/' | '÷' = '*'): string {
  if (op === '*' || op === '×') {
    const a = Math.min(x, y);
    const b = Math.max(x, y);
    return `${a}x${b}`;
  } else {
    // division: product ÷ divisor = quotient
    const product = x;
    const divisor = y;
    const quotient = Math.round(product / divisor);
    const a = Math.min(divisor, quotient);
    const b = Math.max(divisor, quotient);
    return `${a}x${b}`;
  }
}

/**
 * Generates all 55 canonical families and 200 prompts
 */
function buildFactUniverse(): { families: Family[]; prompts: Prompt[]; familyMap: Map<string, Family>; promptMap: Map<string, Prompt> } {
  const families: Family[] = [];
  const prompts: Prompt[] = [];
  const familyMap = new Map<string, Family>();
  const promptMap = new Map<string, Prompt>();

  for (let a = 1; a <= 10; a++) {
    for (let b = a; b <= 10; b++) {
      const familyId = `${a}x${b}`;
      const prior = calculateDifficultyPrior(a, b);
      const initialStrength = 0.75 - 0.5 * prior;
      const familyPrompts: Prompt[] = [];
      const product = a * b;

      if (a === b) {
        // Squares generate 2 prompts: MUL_AB and DIV_A
        const mulPrompt: Prompt = {
          id: `${familyId}:MUL_AB`,
          familyId,
          direction: 'MUL_AB',
          group: 'mul',
          a,
          b,
          display: `${a} × ${b}`,
          expected: product
        };
        const divPrompt: Prompt = {
          id: `${familyId}:DIV_A`,
          familyId,
          direction: 'DIV_A',
          group: 'div',
          a,
          b,
          display: `${product} ÷ ${a}`,
          expected: b
        };
        familyPrompts.push(mulPrompt, divPrompt);
      } else {
        // Non-squares generate 4 prompts: MUL_AB, MUL_BA, DIV_A, DIV_B
        const mulAB: Prompt = {
          id: `${familyId}:MUL_AB`,
          familyId,
          direction: 'MUL_AB',
          group: 'mul',
          a,
          b,
          display: `${a} × ${b}`,
          expected: product
        };
        const mulBA: Prompt = {
          id: `${familyId}:MUL_BA`,
          familyId,
          direction: 'MUL_BA',
          group: 'mul',
          a,
          b,
          display: `${b} × ${a}`,
          expected: product
        };
        const divA: Prompt = {
          id: `${familyId}:DIV_A`,
          familyId,
          direction: 'DIV_A',
          group: 'div',
          a,
          b,
          display: `${product} ÷ ${a}`,
          expected: b
        };
        const divB: Prompt = {
          id: `${familyId}:DIV_B`,
          familyId,
          direction: 'DIV_B',
          group: 'div',
          a,
          b,
          display: `${product} ÷ ${b}`,
          expected: a
        };
        familyPrompts.push(mulAB, mulBA, divA, divB);
      }

      const family: Family = {
        id: familyId,
        a,
        b,
        priorDifficulty: prior,
        initialStrength,
        prompts: familyPrompts
      };

      families.push(family);
      familyMap.set(familyId, family);

      for (const p of familyPrompts) {
        prompts.push(p);
        promptMap.set(p.id, p);
      }
    }
  }

  return { families, prompts, familyMap, promptMap };
}

const universe = buildFactUniverse();

export const ALL_FAMILIES: readonly Family[] = universe.families;
export const ALL_PROMPTS: readonly Prompt[] = universe.prompts;
export const FAMILY_MAP: ReadonlyMap<string, Family> = universe.familyMap;
export const PROMPT_MAP: ReadonlyMap<string, Prompt> = universe.promptMap;

export function getFamily(familyId: string): Family | undefined {
  return FAMILY_MAP.get(familyId);
}

export function getPrompt(promptId: string): Prompt | undefined {
  return PROMPT_MAP.get(promptId);
}

export function getPromptsForTable(tableNumber: number): Prompt[] {
  return ALL_PROMPTS.filter(p => p.a === tableNumber || p.b === tableNumber);
}
