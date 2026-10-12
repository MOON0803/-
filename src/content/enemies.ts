export interface EnemyBase {
  hp: number;
  atk: number;
  mag: number;
  def: number;
  spd: number;
}

export type EnemyPattern = 'every3' | 'opener';

export interface EnemyDef {
  id: string;
  name: string;
  icon: string;
  rank: 'normal' | 'elite' | 'boss';
  base: EnemyBase;
  skills: string[];
  /** every3: 3번째 행동마다 skills[0], opener: 첫 행동에 skills[0] */
  pattern?: EnemyPattern;
  /** 보스: 이 층 기준 스탯이다. 다른 층에 나오면 비율로 보정 */
  nativeFloor?: number;
}

const N = (id: string, name: string, icon: string, base: EnemyBase, skills: string[] = []): EnemyDef => ({
  id,
  name,
  icon,
  rank: 'normal',
  base,
  skills,
});
const E = (id: string, name: string, icon: string, base: EnemyBase, skills: string[]): EnemyDef => ({
  id,
  name,
  icon,
  rank: 'elite',
  base,
  skills,
});
const B = (
  id: string,
  name: string,
  icon: string,
  nativeFloor: number,
  base: EnemyBase,
  skills: string[],
  pattern: EnemyPattern = 'every3',
): EnemyDef => ({ id, name, icon, rank: 'boss', base, skills, pattern, nativeFloor });

const list: EnemyDef[] = [
  // 구간 1 석조 회랑
  N('slime', '이끼 슬라임', '🟢', { hp: 38, atk: 8, mag: 5, def: 3, spd: 7 }),
  N('goblin', '회랑 고블린', '👺', { hp: 34, atk: 10, mag: 3, def: 3, spd: 10 }, ['e_heavy']),
  N('bat', '석상 박쥐', '🦇', { hp: 26, atk: 8, mag: 6, def: 2, spd: 13 }),
  N('turtle', '돌거북', '🐢', { hp: 55, atk: 7, mag: 3, def: 7, spd: 5 }),
  E('golem', '갑옷 골렘', '🗿', { hp: 90, atk: 12, mag: 4, def: 8, spd: 6 }, ['e_heavy']),
  B('g10', '회랑의 파수꾼', '🛡️', 10, { hp: 620, atk: 21, mag: 12, def: 12, spd: 10 }, ['e_sweep', 'e_heavy']),
  // 구간 2 유리 온실 숲
  N('vine', '가시 덩굴', '🌿', { hp: 42, atk: 9, mag: 6, def: 4, spd: 6 }, ['e_poison']),
  N('butterfly', '유리 나비', '🦋', { hp: 28, atk: 6, mag: 10, def: 2, spd: 14 }, ['e_bolt']),
  N('mushroom', '포자 버섯', '🍄', { hp: 40, atk: 7, mag: 8, def: 4, spd: 7 }, ['e_poison']),
  N('wolf', '숲 늑대', '🐺', { hp: 36, atk: 11, mag: 3, def: 3, spd: 12 }),
  E('gardener', '온실 정원사', '🪴', { hp: 95, atk: 11, mag: 11, def: 7, spd: 8 }, ['e_wave']),
  B('g20', '유리 장미의 수호자', '🌹', 20, { hp: 1500, atk: 44, mag: 40, def: 22, spd: 18 }, ['e_wave', 'e_poison']),
  // 구간 3 수몰 도시
  N('wraith', '물귀신', '👻', { hp: 34, atk: 7, mag: 11, def: 3, spd: 11 }, ['e_bolt']),
  N('coral', '산호 기사', '🪸', { hp: 52, atk: 10, mag: 4, def: 7, spd: 7 }, ['e_heavy']),
  N('crab', '거대 게', '🦀', { hp: 48, atk: 11, mag: 2, def: 8, spd: 6 }),
  N('anglerfish', '심해어', '🐟', { hp: 36, atk: 10, mag: 7, def: 3, spd: 12 }),
  E('sentinel', '수몰 경비병', '🔱', { hp: 100, atk: 13, mag: 8, def: 9, spd: 8 }, ['e_sweep']),
  B('g30', '수몰왕', '🐙', 30, { hp: 3200, atk: 72, mag: 56, def: 34, spd: 24 }, ['e_sweep', 'e_wave']),
  // 구간 4 모래시계 사막
  N('scorpion', '모래 전갈', '🦂', { hp: 40, atk: 11, mag: 4, def: 6, spd: 10 }, ['e_poison']),
  N('specter', '사막 망령', '💀', { hp: 34, atk: 8, mag: 11, def: 3, spd: 11 }, ['e_bolt']),
  N('sandworm', '모래 벌레', '🪱', { hp: 58, atk: 11, mag: 3, def: 5, spd: 6 }, ['e_heavy']),
  N('clockwork', '시계 장치 병사', '⚙️', { hp: 44, atk: 10, mag: 6, def: 7, spd: 9 }),
  E('watcher', '시간 감시자', '⏳', { hp: 105, atk: 12, mag: 12, def: 8, spd: 10 }, ['e_slow']),
  B('g40', '모래시계 거인', '🏜️', 40, { hp: 5600, atk: 100, mag: 72, def: 46, spd: 28 }, ['e_slow', 'e_sweep']),
  // 구간 5 천공 정원
  N('cloud', '구름 정령', '☁️', { hp: 36, atk: 7, mag: 12, def: 4, spd: 12 }, ['e_wave']),
  N('eagle', '천공 새', '🦅', { hp: 38, atk: 12, mag: 4, def: 4, spd: 15 }),
  N('starknight', '별빛 기사', '⭐', { hp: 54, atk: 12, mag: 8, def: 8, spd: 9 }, ['e_heavy']),
  N('windgolem', '바람 골렘', '🌪️', { hp: 60, atk: 11, mag: 9, def: 7, spd: 8 }, ['e_sweep']),
  E('gatekeeper', '천공 수문장', '🏛️', { hp: 115, atk: 14, mag: 12, def: 9, spd: 10 }, ['e_wave']),
  B('g50', '정상의 문지기', '👁️', 50, { hp: 8000, atk: 125, mag: 110, def: 60, spd: 36 }, ['e_wave', 'e_slow']),
  // 뿌리
  N('root_tendril', '뿌리 촉수', '🪾', { hp: 54, atk: 14, mag: 10, def: 6, spd: 9 }, ['e_poison']),
  N('shadow_climber', '그림자 등반자', '👤', { hp: 50, atk: 15, mag: 9, def: 5, spd: 13 }, ['e_heavy']),
  N('void', '마력 흡수체', '🕳️', { hp: 48, atk: 9, mag: 15, def: 5, spd: 10 }, ['e_wave']),
  E('root_guard', '뿌리 파수꾼', '🌳', { hp: 125, atk: 15, mag: 13, def: 10, spd: 9 }, ['e_sweep']),
  B('root_heart', '뿌리의 심장', '🫀', 55, { hp: 15000, atk: 175, mag: 155, def: 66, spd: 40 }, ['e_wave', 'e_slow']),
  // 시련
  B('memory', '붕괴의 잔영', '🌫️', 25, { hp: 2400, atk: 58, mag: 50, def: 28, spd: 20 }, ['e_sweep'], 'opener'),
  B('bond_keeper', '유대의 문지기', '⛓️', 35, { hp: 2400, atk: 74, mag: 64, def: 38, spd: 26 }, ['e_wave']),
  B('heart_shadow', '진심의 그림자', '🎭', 45, { hp: 6200, atk: 110, mag: 100, def: 52, spd: 32 }, ['e_wave', 'e_heavy']),
];

export const ENEMIES: Record<string, EnemyDef> = Object.fromEntries(list.map((e) => [e.id, e]));
