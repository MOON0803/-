export interface ZoneDef {
  id: number;
  name: string;
  from: number;
  to: number;
  bg: string;
  village?: { floor: number; name: string };
  enemies: string[];
  elites: string[];
  guardian: string;
  /** 층 노드맵 단계 수 [min, max] */
  layers: [number, number];
  /** 전투 노드 마석 [min, max] */
  stones: [number, number];
}

export const ZONES: ZoneDef[] = [
  {
    id: 1,
    name: '석조 회랑',
    from: 1,
    to: 10,
    bg: 'zone1',
    enemies: ['slime', 'goblin', 'bat', 'turtle'],
    elites: ['golem'],
    guardian: 'g10',
    layers: [5, 6],
    stones: [4, 10],
  },
  {
    id: 2,
    name: '유리 온실 숲',
    from: 11,
    to: 20,
    bg: 'zone2',
    village: { floor: 11, name: '첫 등불' },
    enemies: ['vine', 'butterfly', 'mushroom', 'wolf'],
    elites: ['gardener'],
    guardian: 'g20',
    layers: [6, 7],
    stones: [15, 35],
  },
  {
    id: 3,
    name: '수몰 도시',
    from: 21,
    to: 30,
    bg: 'zone3',
    village: { floor: 21, name: '물빛 시장' },
    enemies: ['wraith', 'coral', 'crab', 'anglerfish'],
    elites: ['sentinel'],
    guardian: 'g30',
    layers: [7, 7],
    stones: [35, 70],
  },
  {
    id: 4,
    name: '모래시계 사막',
    from: 31,
    to: 40,
    bg: 'zone4',
    village: { floor: 31, name: '모래 여관' },
    enemies: ['scorpion', 'specter', 'sandworm', 'clockwork'],
    elites: ['watcher'],
    guardian: 'g40',
    layers: [7, 8],
    stones: [70, 140],
  },
  {
    id: 5,
    name: '천공 정원',
    from: 41,
    to: 50,
    bg: 'zone5',
    village: { floor: 41, name: '구름 항구' },
    enemies: ['cloud', 'eagle', 'starknight', 'windgolem'],
    elites: ['gatekeeper'],
    guardian: 'g50',
    layers: [7, 8],
    stones: [140, 260],
  },
];

export const ROOT_ZONE: ZoneDef = {
  id: 6,
  name: '역탑 (뿌리)',
  from: 101,
  to: 105,
  bg: 'root',
  enemies: ['root_tendril', 'shadow_climber', 'void'],
  elites: ['root_guard'],
  guardian: 'root_heart',
  layers: [7, 8],
  stones: [200, 340],
};

/** 뿌리 층은 내부적으로 101~105 로 표현한다 (B1~B5) */
export const ROOT_BASE = 100;
export const ROOT_FLOORS = 5;
export const MAIN_TOP = 50;

export type FloorKind = 'lobby' | 'village' | 'explore' | 'trial' | 'guardian' | 'rootBoss' | 'endless';

export type TrialKind = 'split' | 'solo' | 'memory' | 'bond' | 'heart';

export interface TrialDef {
  floor: number;
  name: string;
  kind: TrialKind;
  rule: string;
}

export const TRIALS: Record<number, TrialDef> = {
  5: { floor: 5, name: '협동의 시련', kind: 'split', rule: '파티가 둘로 나뉘어 각자 싸웁니다. 양쪽 모두 이겨야 문이 열립니다.' },
  15: { floor: 15, name: '고독의 시련', kind: 'solo', rule: '한 명씩 자신의 그림자와 1:1로 싸웁니다.' },
  25: { floor: 25, name: '기억의 시련', kind: 'memory', rule: '등반자의 기억이 재현됩니다. 링크 게이지가 가득 찬 채로 시작합니다.' },
  35: {
    floor: 35,
    name: '유대의 시련',
    kind: 'bond',
    rule: '링크 Lv3 이상인 등반자가 둘 이상 있어야 문이 열립니다. 두 명씩 짝을 지어 싸웁니다.',
  },
  45: { floor: 45, name: '진심의 시련', kind: 'heart', rule: '탑이 등반자들의 진심을 비춥니다.' },
};

export function isRoot(floor: number): boolean {
  return floor > ROOT_BASE;
}

export function floorKind(floor: number): FloorKind {
  if (isRoot(floor)) return floor === ROOT_BASE + ROOT_FLOORS ? 'rootBoss' : 'explore';
  if (floor > MAIN_TOP) return 'endless';
  if (floor === 1) return 'lobby';
  if (floor % 10 === 0) return 'guardian';
  if (floor % 10 === 5) return 'trial';
  if (floor % 10 === 1) return 'village';
  return 'explore';
}

export function zoneOf(floor: number): ZoneDef {
  if (isRoot(floor)) return ROOT_ZONE;
  if (floor > MAIN_TOP) {
    // 무한층: 구간을 순환
    return ZONES[(Math.floor((floor - 1) / 10) - 5 + ZONES.length * 10) % ZONES.length];
  }
  return ZONES.find((z) => floor >= z.from && floor <= z.to) ?? ZONES[0];
}

export function floorLabel(floor: number): string {
  if (isRoot(floor)) return `B${floor - ROOT_BASE}`;
  return `${floor}층`;
}

/** 적 스탯 스케일 기준 층 (뿌리는 51~55층 상당) */
export function effectiveFloor(floor: number): number {
  return isRoot(floor) ? MAIN_TOP + (floor - ROOT_BASE) : floor;
}

export function villageName(floor: number): string | null {
  return ZONES.find((z) => z.village?.floor === floor)?.village?.name ?? null;
}
