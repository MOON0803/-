export type Phase = 'morning' | 'afternoon' | 'night';

export const CHAR_IDS = ['harin', 'chaea', 'seoyun', 'ria', 'daeun', 'doha'] as const;
export type CharId = (typeof CHAR_IDS)[number];

export type StatKey = 'hp' | 'mp' | 'atk' | 'mag' | 'def' | 'spd' | 'chm';
export type Stats = Record<StatKey, number>;

export type Activity =
  | 'standby'
  | 'train_atk'
  | 'train_def'
  | 'train_mag'
  | 'train_spd'
  | 'cafe'
  | 'rest'
  | 'free';

export interface DaySchedule {
  morning: Activity;
  afternoon: Activity;
}

/** index 0 = 월요일 */
export type WeeklySchedule = DaySchedule[];

export type FacilityId = 'cafe' | 'training' | 'infirmary' | 'dorm' | 'bath' | 'rooftop' | 'info';

export interface MemberState {
  recruited: boolean;
  /** false면 비전투 (다은 초기 상태). 스케줄·파티 편성 대상이 아니다 */
  combatant: boolean;
  level: number;
  exp: number;
  /** 훈련·층 특전으로 쌓인 추가 스탯 (소수점 누적) */
  bonus: Stats;
  fatigue: number;
  stress: number;
  injuryDays: number;
  affection: number;
  intimacy: number;
  stage: number;
  talkedToday: boolean;
  giftsGiven: Record<string, number>;
  /** 수첩에 기록된 취향 (선물/장소 id) */
  knownLikes: string[];
  knownDislikes: string[];
  schedule: WeeklySchedule;
  personalTrialCleared: boolean;
}

export interface MessageReply {
  text: string;
  aff: number;
  response: string;
}

export interface Message {
  uid: string;
  templateId: string;
  from: CharId;
  day: number;
  text: string;
  replies: MessageReply[];
  answered: number | null;
  read: boolean;
}

export interface Construction {
  id: FacilityId;
  targetLevel: number;
  daysLeft: number;
}

export interface GameState {
  version: number;
  playerName: string;
  time: { day: number; phase: Phase };
  guild: {
    funds: number;
    debt: number;
    repaid: number;
    fame: number;
    stones: number;
    stonePrice: number;
    facilities: Record<FacilityId, number>;
    construction: Construction | null;
    warnings: number;
    cafeTotal: number;
  };
  tower: {
    record: number;
    rootRecord: number;
    endlessRecord: number;
    titles: string[];
    equipped: string[];
    relics: string[];
    clearedTrials: number[];
  };
  members: Record<CharId, MemberState>;
  inventory: Record<string, number>;
  flags: Record<string, boolean | number | string>;
  seenScenes: string[];
  seenEvents: string[];
  messages: Message[];
  rivals: Record<string, number>;
  /** 오늘 카페 근무 누적 (접객 합) — 일일 정산에서 사용 */
  cafeShifts: number;
  protagonistCafe: number;
  rng: number;
  ending: string | null;
  settings: { adult: boolean; textSpeed: number };
  cheats: { god: boolean; oneshot: boolean };
}

export type CompareOp = '==' | '!=' | '>=' | '<=' | '>' | '<';

export type Cond =
  | { type: 'day'; op: CompareOp; value: number }
  | { type: 'chapter'; op: CompareOp; value: number }
  | { type: 'record'; op: CompareOp; value: number }
  | { type: 'rootRecord'; op: CompareOp; value: number }
  | { type: 'fame'; op: CompareOp; value: number }
  | { type: 'stage' | 'affection' | 'intimacy'; char: CharId; op: CompareOp; value: number }
  | { type: 'recruited'; char: CharId; value: boolean }
  | { type: 'personalTrial'; char: CharId; value: boolean }
  | { type: 'flag'; name: string; value: boolean | number | string }
  | { type: 'facility'; id: FacilityId; op: CompareOp; value: number }
  | { type: 'seen'; event: string; value: boolean };

export type Trigger = 'morning' | 'night' | 'visit' | 'talk' | 'date' | 'floorClear';

export interface EventDef {
  id: string;
  trigger: Trigger;
  scene: string;
  char?: CharId;
  floor?: number;
  conditions: Cond[];
  priority?: number;
  /** false면 반복 가능 */
  once?: boolean;
}
