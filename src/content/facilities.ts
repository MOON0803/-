import type { FacilityId } from '../core/types';

export interface FacilityCost {
  funds: number;
  stones: number;
  days: number;
}

export interface FacilityDef {
  id: FacilityId;
  name: string;
  location: string;
  maxLevel: number;
  /** costs[n] = 레벨 n 으로 올리는 비용 */
  costs: Record<number, FacilityCost>;
  effect: (level: number) => string;
}

const c = (funds: number, stones: number, days: number): FacilityCost => ({ funds, stones, days });

export const FACILITIES: Record<FacilityId, FacilityDef> = {
  cafe: {
    id: 'cafe',
    name: '카페 「여명」',
    location: '1층',
    maxLevel: 5,
    costs: { 2: c(15_000_000, 50, 4), 3: c(30_000_000, 120, 5), 4: c(60_000_000, 250, 6), 5: c(120_000_000, 500, 7) },
    effect: (l) => `기본 손님 ${20 + l * 15}명, 객단가 ${(6500 + (l - 1) * 500).toLocaleString()}원`,
  },
  training: {
    id: 'training',
    name: '훈련장',
    location: '지하',
    maxLevel: 5,
    costs: { 2: c(8_000_000, 40, 3), 3: c(20_000_000, 100, 4), 4: c(40_000_000, 220, 5), 5: c(80_000_000, 400, 6) },
    effect: (l) => `훈련 효율 +${(l - 1) * 15}%`,
  },
  infirmary: {
    id: 'infirmary',
    name: '의무실',
    location: '2층',
    maxLevel: 3,
    costs: { 2: c(10_000_000, 60, 3), 3: c(25_000_000, 150, 4) },
    effect: (l) => `부상 회복 하루 ${l}일분, 밤 스트레스 −${l * 3}`,
  },
  dorm: {
    id: 'dorm',
    name: '숙소',
    location: '3·4층',
    maxLevel: 3,
    costs: { 2: c(15_000_000, 0, 5), 3: c(30_000_000, 0, 6) },
    effect: (l) => `개인실 ${2 + l * 2}개, 밤 피로 회복 +${(l - 1) * 5}`,
  },
  bath: {
    id: 'bath',
    name: '욕탕 / 사우나',
    location: '지하 (증축)',
    maxLevel: 2,
    costs: { 1: c(12_000_000, 80, 5), 2: c(30_000_000, 200, 6) },
    effect: (l) => (l === 0 ? '미건설' : `밤 피로 회복 +${l * 10}, 이벤트 장소`),
  },
  rooftop: {
    id: 'rooftop',
    name: '옥상 정원',
    location: '옥상',
    maxLevel: 2,
    costs: { 1: c(6_000_000, 30, 3), 2: c(15_000_000, 100, 4) },
    effect: (l) => (l === 0 ? '미건설' : `밤 스트레스 회복 +${l * 5}, 이벤트 장소`),
  },
  info: {
    id: 'info',
    name: '정보실',
    location: '2층',
    maxLevel: 3,
    costs: { 1: c(8_000_000, 50, 3), 2: c(20_000_000, 120, 4), 3: c(40_000_000, 300, 5) },
    effect: (l) =>
      l === 0 ? '미건설' : l === 1 ? '노드 종류 미리 보기' : l === 2 ? '노드 미리 보기 + 히든 노드 탐지' : '히든 노드 + 등반 시간 +1',
  },
};

export const FACILITY_ORDER: FacilityId[] = ['cafe', 'training', 'infirmary', 'dorm', 'bath', 'rooftop', 'info'];
