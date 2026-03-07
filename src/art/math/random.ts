export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0 || 0x6d2b79f5;
  }

  next(): number {
    let value = (this.state += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }

  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  int(min: number, maxExclusive: number): number {
    return Math.floor(this.range(min, maxExclusive));
  }

  pick<T>(items: readonly T[]): T {
    return items[this.int(0, items.length)];
  }

  shuffle<T>(items: readonly T[]): T[] {
    const copy = [...items];

    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = this.int(0, index + 1);
      [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }

    return copy;
  }
}

export function createTimeSeed(): number {
  return Math.floor(Date.now() % 4294967295);
}
