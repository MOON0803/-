import { CHARACTERS, PROTAGONIST } from '../content/characters';
import { CHAR_IDS, type Activity, type CharId, type GameState, type MemberState, type WeeklySchedule } from './types';

export const SAVE_VERSION = 1;
export const INITIAL_DEBT = 300_000_000;

export const ZERO_STATS = { hp: 0, mp: 0, atk: 0, mag: 0, def: 0, spd: 0, chm: 0 };

export function defaultSchedule(): WeeklySchedule {
  const day = (morning: Activity, afternoon: Activity) => ({ morning, afternoon });
  return [
    day('standby', 'cafe'),
    day('standby', 'train_atk'),
    day('standby', 'cafe'),
    day('standby', 'train_def'),
    day('standby', 'cafe'),
    day('cafe', 'free'),
    day('rest', 'rest'),
  ];
}

export function newMember(id: CharId): MemberState {
  return {
    recruited: false,
    combatant: id !== 'daeun',
    level: CHARACTERS[id].joinLevel,
    exp: 0,
    bonus: { ...ZERO_STATS },
    fatigue: 0,
    stress: 10,
    injuryDays: 0,
    affection: 0,
    intimacy: 0,
    stage: 0,
    talkedToday: false,
    giftsGiven: {},
    knownLikes: [],
    knownDislikes: [],
    schedule: defaultSchedule(),
    personalTrialCleared: false,
  };
}

export const INITIAL_RIVALS: Record<string, number> = {
  산왕: 34,
  해남: 31,
  블랙스완: 29,
  청룡: 24,
  레드펄스: 21,
  미르: 18,
  한빛: 15,
  노을: 12,
  은하수: 9,
  동대문: 6,
};

export function createInitialState(playerName = PROTAGONIST.defaultName, seed = Date.now() >>> 0, adult = false): GameState {
  const members = Object.fromEntries(CHAR_IDS.map((id) => [id, newMember(id)])) as Record<CharId, MemberState>;
  // 다은은 처음부터 길드에 있다 (비전투 사무장)
  members.daeun.recruited = true;
  members.daeun.stage = 1;
  members.daeun.affection = 120;

  return {
    version: SAVE_VERSION,
    playerName,
    time: { day: 0, phase: 'morning' },
    guild: {
      funds: 5_000_000,
      debt: INITIAL_DEBT,
      repaid: 0,
      fame: 0,
      stones: 0,
      stonePrice: 10_000,
      facilities: { cafe: 1, training: 1, infirmary: 1, dorm: 1, bath: 0, rooftop: 0, info: 0 },
      construction: null,
      warnings: 0,
      cafeTotal: 0,
    },
    tower: { record: 0, rootRecord: 0, endlessRecord: 0, titles: [], equipped: [], relics: [], clearedTrials: [] },
    members,
    inventory: { potion: 3, ether: 1 },
    flags: {},
    seenScenes: [],
    seenEvents: [],
    messages: [],
    rivals: { ...INITIAL_RIVALS },
    cafeShifts: 0,
    protagonistCafe: 0,
    rng: seed || 1,
    ending: null,
    settings: { adult, textSpeed: 30 },
    cheats: { god: false, oneshot: false },
  };
}

export function recruitedIds(s: GameState): CharId[] {
  return CHAR_IDS.filter((id) => s.members[id].recruited);
}

export function combatantIds(s: GameState): CharId[] {
  return CHAR_IDS.filter((id) => s.members[id].recruited && s.members[id].combatant);
}
