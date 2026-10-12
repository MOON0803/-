import { CHARACTERS } from '../content/characters';
import { FACILITIES } from '../content/facilities';
import { randRange } from '../core/rng';
import { INITIAL_DEBT, recruitedIds } from '../core/state';
import { dateInfo } from '../core/time';
import type { FacilityId, GameState } from '../core/types';
import { collectBonuses } from './stats';

export const RANKS = ['F', 'E', 'D', 'C', 'B', 'A', 'S'] as const;
export type Rank = (typeof RANKS)[number];

export function rankOf(record: number): Rank {
  if (record >= 50) return 'S';
  if (record >= 35) return 'A';
  if (record >= 30) return 'B';
  if (record >= 20) return 'C';
  if (record >= 10) return 'D';
  if (record >= 5) return 'E';
  return 'F';
}

const SPONSOR: Record<Rank, number> = {
  F: 0,
  E: 0,
  D: 2_000_000,
  C: 5_000_000,
  B: 10_000_000,
  A: 20_000_000,
  S: 40_000_000,
};

export function sponsorAmount(s: GameState): number {
  return Math.round(SPONSOR[rankOf(s.tower.record)] * (1 + s.guild.fame / 5000));
}

/** 분기(챕터) 목표: 상환 누계, 목표 층 */
export const QUARTER_TARGETS = [
  { repaid: 30_000_000, floor: 10, floorLabel: '10층' },
  { repaid: 90_000_000, floor: 25, floorLabel: '25층' },
  { repaid: 180_000_000, floor: 35, floorLabel: '35층' },
  { repaid: INITIAL_DEBT, floor: 50, floorLabel: '50층' },
];

export function quarterTarget(chapter: number) {
  return QUARTER_TARGETS[Math.max(0, Math.min(3, chapter - 1))];
}

export interface CafeResult {
  customers: number;
  revenue: number;
  profit: number;
}

export function cafeDay(s: GameState): CafeResult {
  const lv = s.guild.facilities.cafe;
  const info = dateInfo(s.time.day);
  // 다은이 매니저로 기본 운영 (전투원이 되면 빠진다)
  const manager = s.members.daeun.combatant ? 8 : 20;
  const chm = manager + s.cafeShifts + s.protagonistCafe;
  const customers = Math.round(
    (20 + lv * 15) * (1 + s.guild.fame / 2000) * (info.isWeekend ? 1.4 : 1) * (1 + chm / 200) * randRange(s, 0.9, 1.1),
  );
  const revenue = customers * (6500 + (lv - 1) * 500);
  const profit = Math.round(revenue * 0.65 * (1 + collectBonuses(s).cafePct));
  return { customers, revenue, profit };
}

export interface WeeklyCosts {
  salaries: number;
  upkeep: number;
  interest: number;
  total: number;
}

export function weeklyCosts(s: GameState): WeeklyCosts {
  const salaries = recruitedIds(s).reduce((sum, c) => sum + CHARACTERS[c].weeklySalary, 0);
  const levels = (Object.keys(s.guild.facilities) as FacilityId[]).reduce((sum, f) => sum + s.guild.facilities[f], 0);
  const upkeep = 300_000 + levels * 80_000;
  const interest = Math.round(s.guild.debt * 0.001);
  return { salaries, upkeep, interest, total: salaries + upkeep + interest };
}

export function repay(s: GameState, amount: number): number {
  const pay = Math.max(0, Math.min(amount, s.guild.funds, s.guild.debt));
  s.guild.funds -= pay;
  s.guild.debt -= pay;
  s.guild.repaid += pay;
  return pay;
}

export function sellStones(s: GameState, count: number): number {
  const n = Math.max(0, Math.min(Math.floor(count), s.guild.stones));
  const won = n * s.guild.stonePrice;
  s.guild.stones -= n;
  s.guild.funds += won;
  return won;
}

export function emergencyLoan(s: GameState, amount: number): void {
  s.guild.funds += amount;
  s.guild.debt += Math.round(amount * 1.2);
}

export interface BuildCheck {
  ok: boolean;
  reason?: string;
  cost?: { funds: number; stones: number; days: number };
}

export function canBuild(s: GameState, id: FacilityId): BuildCheck {
  const def = FACILITIES[id];
  const lv = s.guild.facilities[id];
  if (lv >= def.maxLevel) return { ok: false, reason: '최대 레벨' };
  const cost = def.costs[lv + 1];
  if (s.guild.construction) return { ok: false, reason: '다른 공사가 진행 중', cost };
  if (s.guild.funds < cost.funds) return { ok: false, reason: '자금 부족', cost };
  if (s.guild.stones < cost.stones) return { ok: false, reason: '마석 부족', cost };
  return { ok: true, cost };
}

export function startBuild(s: GameState, id: FacilityId): void {
  const chk = canBuild(s, id);
  if (!chk.ok || !chk.cost) throw new Error(chk.reason);
  s.guild.funds -= chk.cost.funds;
  s.guild.stones -= chk.cost.stones;
  s.guild.construction = { id, targetLevel: s.guild.facilities[id] + 1, daysLeft: chk.cost.days };
}

export function tickConstruction(s: GameState): string | null {
  const c = s.guild.construction;
  if (!c) return null;
  c.daysLeft -= 1;
  if (c.daysLeft > 0) return null;
  s.guild.facilities[c.id] = c.targetLevel;
  s.guild.construction = null;
  return `🏗 ${FACILITIES[c.id].name} Lv${c.targetLevel} 완공!`;
}

export function won(n: number): string {
  const sign = n < 0 ? '-' : '';
  const v = Math.abs(Math.round(n));
  if (v >= 100_000_000) {
    const eok = Math.floor(v / 100_000_000);
    const man = Math.floor((v % 100_000_000) / 10_000);
    return `${sign}${eok}억${man ? ` ${man.toLocaleString()}만` : ''}원`;
  }
  if (v >= 10_000) return `${sign}${Math.floor(v / 10_000).toLocaleString()}만원`;
  return `${sign}${v.toLocaleString()}원`;
}
