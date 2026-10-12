import type { StatKey } from '../core/types';
import type { Bonuses } from './titles';

export interface RelicDef {
  id: string;
  name: string;
  desc: string;
  bonus: Partial<Bonuses>;
}

export const RELICS: Record<string, RelicDef> = Object.fromEntries(
  (
    [
      { id: 'compass', name: '낡은 나침반', desc: '등반 시간 +1', bonus: { timeBonus: 1 } },
      { id: 'shard', name: '백탑의 파편', desc: '링크 게이지 충전 +15%', bonus: { linkPct: 0.15 } },
      { id: 'charm', name: '등반자의 부적', desc: '경험치 +10%', bonus: { expPct: 0.1 } },
      { id: 'red_thread', name: '붉은 실', desc: '전투 시작 시 링크 게이지 +20', bonus: { linkStart: 20 } },
      { id: 'glass_flower', name: '유리 꽃', desc: '전투 후 HP 8% 회복', bonus: { postHealPct: 0.08 } },
      { id: 'old_map', name: '오래된 지도', desc: '히든 노드가 보인다', bonus: { hiddenSight: true } },
      { id: 'lucky_coin', name: '행운의 동전', desc: '마석 +15%', bonus: { stonePct: 0.15 } },
      { id: 'whetstone', name: '탑의 숫돌', desc: '파티 공격 +5%', bonus: { atkPct: 0.05 } },
    ] as RelicDef[]
  ).map((r) => [r.id, r]),
);

export type PerkDef =
  | { id: string; name: string; desc: string; kind: 'stat'; stat: StatKey; amount: number }
  | { id: string; name: string; desc: string; kind: 'stones'; mult: number }
  | { id: string; name: string; desc: string; kind: 'heal' }
  | { id: string; name: string; desc: string; kind: 'relic'; relic: string }
  | { id: string; name: string; desc: string; kind: 'fame'; amount: number };

export const STAT_PERKS: PerkDef[] = [
  { id: 'p_atk', name: '힘의 축복', desc: '전원 공격 +2', kind: 'stat', stat: 'atk', amount: 2 },
  { id: 'p_def', name: '돌의 축복', desc: '전원 방어 +2', kind: 'stat', stat: 'def', amount: 2 },
  { id: 'p_mag', name: '별의 축복', desc: '전원 마력 +2', kind: 'stat', stat: 'mag', amount: 2 },
  { id: 'p_hp', name: '생명의 축복', desc: '전원 최대 HP +12', kind: 'stat', stat: 'hp', amount: 12 },
  { id: 'p_spd', name: '바람의 축복', desc: '전원 속도 +1', kind: 'stat', stat: 'spd', amount: 1 },
  { id: 'p_mp', name: '샘의 축복', desc: '전원 최대 MP +6', kind: 'stat', stat: 'mp', amount: 6 },
];

export const OTHER_PERKS: PerkDef[] = [
  { id: 'p_stones', name: '마석 광맥', desc: '이 층 마석 수익의 3배를 즉시 획득', kind: 'stones', mult: 3 },
  { id: 'p_heal', name: '탑의 숨결', desc: '파티 HP·MP 완전 회복', kind: 'heal' },
  { id: 'p_fame', name: '목격자들', desc: '명성 +40', kind: 'fame', amount: 40 },
];

export function relicPerk(relicId: string): PerkDef {
  const r = RELICS[relicId];
  return { id: `p_relic_${relicId}`, name: `유물: ${r.name}`, desc: r.desc, kind: 'relic', relic: relicId };
}
