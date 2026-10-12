import { describe, expect, it } from 'vitest';
import { zoneOf } from '../content/floors';
import { pick, randInt } from '../core/rng';
import { createInitialState } from '../core/state';
import type { CharId } from '../core/types';
import { allyUnit, createBattle, enemyUnit, runToEnd } from '../systems/battle';

/**
 * 밸런스 회귀 테스트. 권장 레벨(층 × 0.85)의 파티가 자동 전투 AI로 싸웠을 때
 * 일반전은 거의 이기고, 수호자전은 대체로 이기되 HP를 꽤 잃어야 한다.
 */
function party(f: number): CharId[] {
  if (f <= 10) return ['harin', 'chaea'];
  if (f <= 19) return ['harin', 'chaea', 'seoyun'];
  if (f <= 34) return ['harin', 'chaea', 'seoyun', 'ria'];
  return ['harin', 'doha', 'seoyun', 'ria'];
}

function simulate(f: number, kind: 'normal' | 'boss', n = 60) {
  let wins = 0;
  let hpLeft = 0;
  for (let i = 0; i < n; i++) {
    const s = createInitialState('t', 500 + i);
    const p = party(f);
    for (const c of p) {
      const m = s.members[c];
      m.recruited = true;
      m.level = Math.max(1, Math.round(f * 0.85));
      m.stage = Math.min(4, Math.floor(f / 10) + 1);
      m.bonus.atk = f * 0.25;
      m.bonus.def = f * 0.25;
      m.bonus.hp = f * 1.2;
    }
    s.inventory = { potion: 2 };
    const z = zoneOf(f);
    const ids =
      kind === 'boss'
        ? [z.guardian, ...(f >= 20 ? [z.elites[0]] : [])]
        : Array.from({ length: f <= 10 ? randInt(s, 2, 3) : randInt(s, 2, 4) }, () => pick(s, z.enemies));
    const b = createBattle(s, p.map((c) => allyUnit(s, c)), ids.map((id, k) => enemyUnit(id, f, k)), 't');
    runToEnd(b, s);
    if (b.result === 'win') wins++;
    const allies = b.units.filter((u) => u.side === 'ally');
    hpLeft += allies.reduce((a, u) => a + u.hp / u.maxHp, 0) / allies.length;
  }
  return { winRate: wins / n, hpLeft: hpLeft / n };
}

describe('battle balance', () => {
  for (const f of [4, 14, 30, 45]) {
    it(`normal battles on floor ${f} are winnable but not free`, () => {
      const r = simulate(f, 'normal');
      expect(r.winRate).toBeGreaterThanOrEqual(0.95);
      expect(r.hpLeft).toBeLessThan(0.97);
    });
  }
  for (const f of [10, 30, 50]) {
    it(`guardian on floor ${f} is beatable and costly`, () => {
      const r = simulate(f, 'boss');
      expect(r.winRate).toBeGreaterThanOrEqual(0.6);
      expect(r.hpLeft).toBeLessThan(0.9);
    });
  }
});
