import { CHARACTERS } from '../content/characters';
import { RELICS } from '../content/perks';
import { NO_BONUS, TITLE_MAP, type Bonuses } from '../content/titles';
import type { CharId, GameState, StatKey, Stats } from '../core/types';

const STAT_KEYS: StatKey[] = ['hp', 'mp', 'atk', 'mag', 'def', 'spd', 'chm'];

export function collectBonuses(s: GameState): Bonuses {
  const out: Bonuses = { ...NO_BONUS };
  const parts = [
    ...s.tower.equipped.map((id) => TITLE_MAP[id]?.bonus),
    ...s.tower.relics.map((id) => RELICS[id]?.bonus),
  ];
  for (const b of parts) {
    if (!b) continue;
    for (const [k, v] of Object.entries(b) as [keyof Bonuses, number | boolean][]) {
      if (typeof v === 'boolean') (out[k] as boolean) = (out[k] as boolean) || v;
      else (out[k] as number) += v;
    }
  }
  return out;
}

export function levelStats(c: CharId, level: number): Stats {
  const d = CHARACTERS[c];
  const out = {} as Stats;
  for (const k of STAT_KEYS) out[k] = d.base[k] + d.growth[k] * (level - 1);
  return out;
}

/** 전투·근무에 쓰는 최종 스탯. 링크 레벨(관계 단계)마다 +3%, 칭호·유물 보정 포함 */
export function memberStats(s: GameState, c: CharId, bonuses = collectBonuses(s)): Stats {
  const m = s.members[c];
  const lv = levelStats(c, m.level);
  const link = 1 + m.stage * 0.03 + bonuses.allPct;
  const out = {} as Stats;
  for (const k of STAT_KEYS) {
    let mult = link;
    if (k === 'atk') mult += bonuses.atkPct;
    if (k === 'def') mult += bonuses.defPct;
    if (k === 'hp') mult += bonuses.hpPct;
    out[k] = Math.round((lv[k] + m.bonus[k]) * mult);
  }
  return out;
}

export function expToNext(level: number): number {
  return Math.round(25 * Math.pow(level, 1.5));
}

export function gainExp(s: GameState, c: CharId, amount: number): number {
  const m = s.members[c];
  const b = collectBonuses(s);
  m.exp += Math.round(amount * (1 + b.expPct));
  let ups = 0;
  while (m.exp >= expToNext(m.level) && m.level < 99) {
    m.exp -= expToNext(m.level);
    m.level += 1;
    ups += 1;
  }
  return ups;
}

/** 합류 시 레벨을 기존 파티 평균에 맞춘다 */
export function catchUpLevel(s: GameState, c: CharId, others: CharId[]): void {
  const m = s.members[c];
  if (others.length === 0) return;
  const avg = Math.floor(others.reduce((sum, o) => sum + s.members[o].level, 0) / others.length);
  m.level = Math.max(m.level, avg);
}
