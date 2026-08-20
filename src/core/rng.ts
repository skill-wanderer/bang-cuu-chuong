export interface RNG {
  next(): number;
  nextInt(min: number, max: number): number;
  choice<T>(array: readonly T[]): T;
  shuffle<T>(array: readonly T[]): T[];
}

export class SeededRNG implements RNG {
  private state: number;

  constructor(seed: number = Date.now()) {
    this.state = seed >>> 0;
    if (this.state === 0) {
      this.state = 1;
    }
  }

  // Mulberry32 32-bit generator
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  nextInt(min: number, max: number): number {
    const floorMin = Math.ceil(min);
    const floorMax = Math.floor(max);
    return Math.floor(this.next() * (floorMax - floorMin + 1)) + floorMin;
  }

  choice<T>(array: readonly T[]): T {
    if (array.length === 0) {
      throw new Error('Cannot pick from empty array');
    }
    const idx = Math.floor(this.next() * array.length);
    return array[idx];
  }

  shuffle<T>(array: readonly T[]): T[] {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      const temp = copy[i];
      copy[i] = copy[j];
      copy[j] = temp;
    }
    return copy;
  }
}

export const defaultRNG = new SeededRNG();
