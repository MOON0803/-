import type { GameState } from '../core/types';

export interface Bonuses {
  expPct: number;
  atkPct: number;
  defPct: number;
  hpPct: number;
  allPct: number;
  cafePct: number;
  linkPct: number;
  famePct: number;
  stonePct: number;
  timeBonus: number;
  linkStart: number;
  postHealPct: number;
  hiddenSight: boolean;
}

export const NO_BONUS: Bonuses = {
  expPct: 0,
  atkPct: 0,
  defPct: 0,
  hpPct: 0,
  allPct: 0,
  cafePct: 0,
  linkPct: 0,
  famePct: 0,
  stonePct: 0,
  timeBonus: 0,
  linkStart: 0,
  postHealPct: 0,
  hiddenSight: false,
};

export interface TitleDef {
  id: string;
  name: string;
  condText: string;
  effectText: string;
  cond: (s: GameState) => boolean;
  bonus: Partial<Bonuses>;
}

export const TITLES: TitleDef[] = [
  {
    id: 'restart',
    name: '다시 오르는 자',
    condText: '1층 재등록',
    effectText: '경험치 +5%',
    cond: (s) => s.tower.record >= 1,
    bonus: { expPct: 0.05 },
  },
  {
    id: 'corridor',
    name: '회랑의 정복자',
    condText: '10층 수호자 처치',
    effectText: '파티 공격 +5%',
    cond: (s) => s.tower.record >= 10,
    bonus: { atkPct: 0.05 },
  },
  {
    id: 'barista',
    name: '을지로 바리스타',
    condText: '카페 누적 순익 1,000만 원',
    effectText: '카페 매출 +10%',
    cond: (s) => s.guild.cafeTotal >= 10_000_000,
    bonus: { cafePct: 0.1 },
  },
  {
    id: 'greenhouse',
    name: '온실의 개척자',
    condText: '20층 수호자 처치',
    effectText: '파티 방어 +5%',
    cond: (s) => s.tower.record >= 20,
    bonus: { defPct: 0.05 },
  },
  {
    id: 'memory',
    name: '기억을 넘어선 자',
    condText: '25층 기억의 시련 클리어',
    effectText: '링크 게이지 충전 +20%',
    cond: (s) => s.tower.clearedTrials.includes(25),
    bonus: { linkPct: 0.2 },
  },
  {
    id: 'drowned',
    name: '수몰 도시의 생환자',
    condText: '30층 수호자 처치',
    effectText: '파티 최대 HP +8%',
    cond: (s) => s.tower.record >= 30,
    bonus: { hpPct: 0.08 },
  },
  {
    id: 'wall',
    name: '벽을 넘은 자',
    condText: '35층 클리어 (인류 최초)',
    effectText: '명성 획득 +30%',
    cond: (s) => s.tower.record >= 35,
    bonus: { famePct: 0.3 },
  },
  {
    id: 'summit',
    name: '정상에 선 자',
    condText: '50층 도달',
    effectText: '전 스탯 +5%',
    cond: (s) => s.tower.record >= 50,
    bonus: { allPct: 0.05 },
  },
  {
    id: 'root',
    name: '뿌리를 끊은 자',
    condText: '뿌리 최심부 클리어',
    effectText: '마석 +20%',
    cond: (s) => s.tower.rootRecord >= 5,
    bonus: { stonePct: 0.2 },
  },
];

export const TITLE_MAP: Record<string, TitleDef> = Object.fromEntries(TITLES.map((t) => [t.id, t]));
export const MAX_EQUIPPED_TITLES = 2;
