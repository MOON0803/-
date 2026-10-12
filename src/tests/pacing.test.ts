import { describe, expect, it } from 'vitest';
import { createInitialState } from '../core/state';
import { simulate } from '../debug/sim';

/**
 * 1년 페이싱의 설계 의도를 지키는 테스트 (debug/sim.ts 의 자동 플레이 정책 사용).
 * 수치를 바꿔서 여기가 깨지면, 의도한 변화인지 GDD §7.6·§8 과 함께 확인한다.
 */
describe('yearly pacing', () => {
  const weekRow = (lines: string[], week: number) => {
    const row = lines.find((l) => l.startsWith(`${week}주 |`));
    if (!row) throw new Error(`week ${week} missing`);
    const [, , repaid, , floor] = row.split('|').map((x) => x.trim());
    return { repaid: parseInt(repaid, 10) * 10_000, floor: parseInt(floor, 10) };
  };

  it('balanced play meets the Ch1 goal but cannot rush the whole tower in a quarter', () => {
    const { lines } = simulate(createInitialState('t', 42), 24, 'balance');
    const w12 = weekRow(lines, 12);
    expect(w12.floor).toBeGreaterThanOrEqual(10);
    expect(w12.floor).toBeLessThan(35);
    expect(w12.repaid).toBeGreaterThanOrEqual(30_000_000);
  });

  it('climbing without romance stops at the 35th-floor bond wall', () => {
    const { state } = simulate(createInitialState('t', 7), 30, 'tower');
    expect(state.tower.record).toBe(34);
  });

  it('running only the cafe cannot pay the debt', () => {
    const { state } = simulate(createInitialState('t', 3), 24, 'cafe');
    expect(state.guild.repaid).toBeLessThan(30_000_000);
    expect(state.tower.record).toBe(0);
  });
});
