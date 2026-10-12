/** mulberry32. 시드 상태를 GameState.rng 에 두어 세이브/재현이 가능하게 한다. */
export interface RngHolder {
  rng: number;
}

export function nextRandom(h: RngHolder): number {
  let t = (h.rng = (h.rng + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function randInt(h: RngHolder, min: number, max: number): number {
  return min + Math.floor(nextRandom(h) * (max - min + 1));
}

export function randRange(h: RngHolder, min: number, max: number): number {
  return min + nextRandom(h) * (max - min);
}

export function chance(h: RngHolder, p: number): boolean {
  return nextRandom(h) < p;
}

export function pick<T>(h: RngHolder, arr: readonly T[]): T {
  return arr[Math.floor(nextRandom(h) * arr.length)];
}

export function pickWeighted<T>(h: RngHolder, entries: readonly [T, number][]): T {
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = nextRandom(h) * total;
  for (const [v, w] of entries) {
    r -= w;
    if (r < 0) return v;
  }
  return entries[entries.length - 1][0];
}

export function shuffle<T>(h: RngHolder, arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(nextRandom(h) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
