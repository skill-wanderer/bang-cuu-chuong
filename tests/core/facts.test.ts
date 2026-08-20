import { describe, it, expect } from 'vitest';
import { ALL_FAMILIES, ALL_PROMPTS, FAMILY_MAP, PROMPT_MAP, getCanonicalFamilyId } from '../../src/core/facts';

describe('Fact Universe (facts.ts)', () => {
  it('has exactly 55 families', () => {
    expect(ALL_FAMILIES.length).toBe(55);
    expect(FAMILY_MAP.size).toBe(55);
  });

  it('has exactly 200 distinct prompts', () => {
    expect(ALL_PROMPTS.length).toBe(200);
    expect(PROMPT_MAP.size).toBe(200);
  });

  it('verifies every prompt answer is arithmetically correct', () => {
    for (const prompt of ALL_PROMPTS) {
      if (prompt.group === 'mul') {
        expect(prompt.a * prompt.b).toBe(prompt.expected);
      } else {
        const product = prompt.a * prompt.b;
        // Prompt is product ÷ divisor = answer
        expect(product / prompt.expected).toBe(prompt.expected === prompt.a ? prompt.b : prompt.a);
      }
    }
  });

  it('canonicalises 8x7, 7x8, 56/7, 56/8 to 7x8', () => {
    expect(getCanonicalFamilyId(8, 7, '*')).toBe('7x8');
    expect(getCanonicalFamilyId(7, 8, '*')).toBe('7x8');
    expect(getCanonicalFamilyId(56, 7, '/')).toBe('7x8');
    expect(getCanonicalFamilyId(56, 8, '/')).toBe('7x8');
  });

  it('ensures squares yield 2 prompts instead of 4', () => {
    const squareFamilies = ALL_FAMILIES.filter(f => f.a === f.b);
    expect(squareFamilies.length).toBe(10);
    for (const sq of squareFamilies) {
      expect(sq.prompts.length).toBe(2);
      expect(sq.prompts.filter(p => p.group === 'mul').length).toBe(1);
      expect(sq.prompts.filter(p => p.group === 'div').length).toBe(1);
    }
  });

  it('ensures non-squares yield 4 prompts', () => {
    const nonSquares = ALL_FAMILIES.filter(f => f.a !== f.b);
    expect(nonSquares.length).toBe(45);
    for (const ns of nonSquares) {
      expect(ns.prompts.length).toBe(4);
      expect(ns.prompts.filter(p => p.group === 'mul').length).toBe(2);
      expect(ns.prompts.filter(p => p.group === 'div').length).toBe(2);
    }
  });
});
