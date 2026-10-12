export type BuffStat = 'atk' | 'mag' | 'def' | 'spd' | 'crit';

/** 'foe'/'friend' 는 시전자 기준 상대 진영/같은 진영 */
export type SkillTarget = 'foe' | 'allFoes' | 'randomFoes' | 'friend' | 'allFriends' | 'self';

export type Effect =
  | { kind: 'damage'; scale: 'atk' | 'mag'; mult: number; hits?: number; critBonus?: number }
  | { kind: 'heal'; mult?: number; pctMax?: number }
  | { kind: 'buff'; stat: BuffStat; amount: number; turns: number }
  | { kind: 'debuff'; stat: BuffStat; amount: number; turns: number }
  | { kind: 'taunt'; turns: number }
  /** 대상의 행동 간격(1000/속도) 대비 비율만큼 다음 턴을 늦춘다 */
  | { kind: 'delay'; pct: number }
  | { kind: 'poison'; pct: number; turns: number }
  | { kind: 'evade'; turns: number }
  | { kind: 'revive'; pct: number }
  | { kind: 'restoreMp'; pct: number };

export interface SkillPart {
  target: SkillTarget;
  effects: Effect[];
}

export interface SkillDef {
  id: string;
  name: string;
  mp: number;
  desc: string;
  parts: SkillPart[];
}

const S = (id: string, name: string, mp: number, desc: string, parts: SkillPart[]): SkillDef => ({
  id,
  name,
  mp,
  desc,
  parts,
});

export const SKILLS: Record<string, SkillDef> = Object.fromEntries(
  [
    // 하린
    S('shield_bash', '방패 강타', 4, '적 1체 공격 ×1.2, 행동을 늦춘다', [
      { target: 'foe', effects: [{ kind: 'damage', scale: 'atk', mult: 1.2 }, { kind: 'delay', pct: 0.35 }] },
    ]),
    S('taunt', '도발', 5, '2턴간 적의 공격을 끌어온다. 방어 +30%', [
      { target: 'self', effects: [{ kind: 'taunt', turns: 2 }, { kind: 'buff', stat: 'def', amount: 0.3, turns: 2 }] },
    ]),
    S('guard_all', '수호의 벽', 8, '아군 전체 방어 +25% (3턴)', [
      { target: 'allFriends', effects: [{ kind: 'buff', stat: 'def', amount: 0.25, turns: 3 }] },
    ]),
    // 채아
    S('rapid_fire', '속사', 4, '적 1체에 ×0.6 3연사', [
      { target: 'foe', effects: [{ kind: 'damage', scale: 'atk', mult: 0.6, hits: 3 }] },
    ]),
    S('headshot', '헤드샷', 7, '적 1체 ×1.7, 치명타 확률 +25%', [
      { target: 'foe', effects: [{ kind: 'damage', scale: 'atk', mult: 1.7, critBonus: 0.25 }] },
    ]),
    S('smoke', '연막탄', 6, '적 전체의 행동을 늦춘다', [
      { target: 'allFoes', effects: [{ kind: 'delay', pct: 0.4 }] },
    ]),
    // 서윤
    S('heal', '힐', 5, '아군 1명 회복 (마력 ×1.6)', [{ target: 'friend', effects: [{ kind: 'heal', mult: 1.6 }] }]),
    S('bless', '축복', 8, '아군 전체 공격·마력 +20% (3턴)', [
      {
        target: 'allFriends',
        effects: [
          { kind: 'buff', stat: 'atk', amount: 0.2, turns: 3 },
          { kind: 'buff', stat: 'mag', amount: 0.2, turns: 3 },
        ],
      },
    ]),
    S('mass_heal', '치유의 빛', 12, '아군 전체 회복 (마력 ×0.8)', [
      { target: 'allFriends', effects: [{ kind: 'heal', mult: 0.8 }] },
    ]),
    // 리아
    S('fireball', '파이어볼', 6, '적 1체 마법 ×1.6', [{ target: 'foe', effects: [{ kind: 'damage', scale: 'mag', mult: 1.6 }] }]),
    S('chain_lightning', '체인 라이트닝', 10, '적 전체 마법 ×0.9', [
      { target: 'allFoes', effects: [{ kind: 'damage', scale: 'mag', mult: 0.9 }] },
    ]),
    S('ice_lance', '아이스 랜스', 7, '적 1체 마법 ×1.3, 속도 −30% (2턴)', [
      {
        target: 'foe',
        effects: [
          { kind: 'damage', scale: 'mag', mult: 1.3 },
          { kind: 'debuff', stat: 'spd', amount: 0.3, turns: 2 },
        ],
      },
    ]),
    // 다은
    S('analyze', '약점 분석', 5, '적 1체 방어 −35% (3턴)', [
      { target: 'foe', effects: [{ kind: 'debuff', stat: 'def', amount: 0.35, turns: 3 }] },
    ]),
    S('poison_needle', '독침', 5, '적 1체 ×0.7 + 중독 (3턴)', [
      {
        target: 'foe',
        effects: [
          { kind: 'damage', scale: 'atk', mult: 0.7 },
          { kind: 'poison', pct: 0.06, turns: 3 },
        ],
      },
    ]),
    S('disrupt', '교란', 6, '적 전체 공격 −20% (2턴), 행동 지연', [
      {
        target: 'allFoes',
        effects: [
          { kind: 'debuff', stat: 'atk', amount: 0.2, turns: 2 },
          { kind: 'delay', pct: 0.25 },
        ],
      },
    ]),
    // 도하
    S('ambush', '암습', 6, '적 1체 ×2.0, 치명타 확률 +30%', [
      { target: 'foe', effects: [{ kind: 'damage', scale: 'atk', mult: 2.0, critBonus: 0.3 }] },
    ]),
    S('flurry', '연속 베기', 8, '무작위 적에게 ×0.65 4연격', [
      { target: 'randomFoes', effects: [{ kind: 'damage', scale: 'atk', mult: 0.65, hits: 4 }] },
    ]),
    S('vanish', '은신', 5, '다음 공격 1회 회피, 공격 +40% (1턴)', [
      {
        target: 'self',
        effects: [
          { kind: 'evade', turns: 1 },
          { kind: 'buff', stat: 'atk', amount: 0.4, turns: 1 },
        ],
      },
    ]),

    // 링크 버스트
    S('burst_aegis', '이지스 링크', 0, '아군 전체 방어 +50%·HP 25% 회복, 적 전체 ×1.0', [
      {
        target: 'allFriends',
        effects: [
          { kind: 'buff', stat: 'def', amount: 0.5, turns: 3 },
          { kind: 'heal', pctMax: 0.25 },
        ],
      },
      { target: 'allFoes', effects: [{ kind: 'damage', scale: 'atk', mult: 1.0 }] },
    ]),
    S('burst_fullfire', '풀 버스트', 0, '무작위 적에게 ×0.9 6연사', [
      { target: 'randomFoes', effects: [{ kind: 'damage', scale: 'atk', mult: 0.9, hits: 6, critBonus: 0.2 }] },
    ]),
    S('burst_vow', '생명의 서약', 0, '쓰러진 아군 부활, 아군 전체 완전 회복', [
      { target: 'allFriends', effects: [{ kind: 'revive', pct: 0.5 }, { kind: 'heal', pctMax: 1.0 }] },
    ]),
    S('burst_elements', '원소 해방', 0, '적 전체 마법 ×2.4', [
      { target: 'allFoes', effects: [{ kind: 'damage', scale: 'mag', mult: 2.4 }] },
    ]),
    S('burst_full_analysis', '완전 분석', 0, '적 전체 방어 −50%, 아군 전체 치명타 +30% (3턴)', [
      { target: 'allFoes', effects: [{ kind: 'debuff', stat: 'def', amount: 0.5, turns: 3 }] },
      { target: 'allFriends', effects: [{ kind: 'buff', stat: 'crit', amount: 0.3, turns: 3 }] },
    ]),
    S('burst_nightfall', '나이트폴', 0, '적 1체 ×4.0, 치명타 확률 +50%', [
      { target: 'foe', effects: [{ kind: 'damage', scale: 'atk', mult: 4.0, critBonus: 0.5 }] },
    ]),

    // 적
    S('e_heavy', '강타', 0, '', [{ target: 'foe', effects: [{ kind: 'damage', scale: 'atk', mult: 1.5 }] }]),
    S('e_sweep', '휩쓸기', 0, '', [{ target: 'allFoes', effects: [{ kind: 'damage', scale: 'atk', mult: 0.75 }] }]),
    S('e_poison', '독액', 0, '', [
      {
        target: 'foe',
        effects: [
          { kind: 'damage', scale: 'mag', mult: 0.6 },
          { kind: 'poison', pct: 0.05, turns: 3 },
        ],
      },
    ]),
    S('e_roar', '포효', 0, '', [{ target: 'self', effects: [{ kind: 'buff', stat: 'atk', amount: 0.3, turns: 3 }] }]),
    S('e_bolt', '마력탄', 0, '', [{ target: 'foe', effects: [{ kind: 'damage', scale: 'mag', mult: 1.3 }] }]),
    S('e_wave', '마력 해일', 0, '', [{ target: 'allFoes', effects: [{ kind: 'damage', scale: 'mag', mult: 0.9 }] }]),
    S('e_slow', '시간 왜곡', 0, '', [
      {
        target: 'allFoes',
        effects: [
          { kind: 'delay', pct: 0.4 },
          { kind: 'debuff', stat: 'spd', amount: 0.2, turns: 2 },
        ],
      },
    ]),
  ].map((s) => [s.id, s]),
);
