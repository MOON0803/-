import { CHAR_IDS, type CharId, type EventDef } from '../core/types';
import { CHARACTERS } from './characters';

const story: EventDef[] = [
  // 아침 스토리
  { id: 'intro', trigger: 'morning', scene: 'intro', priority: 100, conditions: [{ type: 'day', op: '==', value: 0 }] },
  {
    id: 'chaea_join',
    trigger: 'morning',
    scene: 'chaea_join',
    priority: 90,
    conditions: [
      { type: 'day', op: '>=', value: 2 },
      { type: 'recruited', char: 'chaea', value: false },
    ],
  },
  {
    id: 'blackswan_visit',
    trigger: 'morning',
    scene: 'blackswan_visit',
    priority: 60,
    conditions: [{ type: 'day', op: '>=', value: 12 }],
  },
  { id: 'ch2_start', trigger: 'morning', scene: 'ch2_start', priority: 95, conditions: [{ type: 'chapter', op: '>=', value: 2 }] },
  { id: 'ch3_start', trigger: 'morning', scene: 'ch3_start', priority: 95, conditions: [{ type: 'chapter', op: '>=', value: 3 }] },
  {
    id: 'sanwang_joint',
    trigger: 'morning',
    scene: 'sanwang_joint',
    priority: 80,
    conditions: [
      { type: 'chapter', op: '>=', value: 3 },
      { type: 'record', op: '>=', value: 30 },
    ],
  },
  {
    id: 'daeun_combat',
    trigger: 'morning',
    scene: 'daeun_combat',
    priority: 70,
    conditions: [
      { type: 'chapter', op: '>=', value: 3 },
      { type: 'seen', event: 'ch3_start', value: true },
      { type: 'day', op: '>=', value: 175 },
    ],
  },
  {
    id: 'doha_join',
    trigger: 'morning',
    scene: 'doha_join',
    priority: 85,
    conditions: [
      { type: 'flag', name: 'wall_broken', value: true },
      { type: 'seen', event: 'sanwang_joint', value: true },
    ],
  },
  { id: 'ch4_start', trigger: 'morning', scene: 'ch4_start', priority: 95, conditions: [{ type: 'chapter', op: '>=', value: 4 }] },

  // 층 클리어
  { id: 'lobby_register', trigger: 'floorClear', floor: 1, scene: 'lobby_register', conditions: [] },
  { id: 'trial5_clear', trigger: 'floorClear', floor: 5, scene: 'trial5_clear', conditions: [] },
  { id: 'guardian10', trigger: 'floorClear', floor: 10, scene: 'guardian10', conditions: [] },
  { id: 'seoyun_join', trigger: 'floorClear', floor: 11, scene: 'seoyun_join', conditions: [] },
  { id: 'ria_join', trigger: 'floorClear', floor: 20, scene: 'ria_join', conditions: [] },
  { id: 'memory_trial', trigger: 'floorClear', floor: 25, scene: 'memory_trial', conditions: [] },
  { id: 'guardian30', trigger: 'floorClear', floor: 30, scene: 'guardian30', conditions: [] },
  { id: 'wall_break', trigger: 'floorClear', floor: 35, scene: 'wall_break', conditions: [] },
  { id: 'heart_trial', trigger: 'floorClear', floor: 45, scene: 'heart_trial', conditions: [] },
  { id: 'summit', trigger: 'floorClear', floor: 50, scene: 'summit', conditions: [] },
  { id: 'root_final', trigger: 'floorClear', floor: 105, scene: 'root_final', conditions: [] },
];

function romanceEvents(c: CharId): EventDef[] {
  const r = (n: number): EventDef => ({
    id: `${c}_r18_0${n}`,
    trigger: 'visit',
    char: c,
    scene: `${c}_r18_0${n}`,
    priority: 40 - n,
    conditions: [
      { type: 'stage', char: c, op: '>=', value: 4 },
      ...(n === 1 ? [] : [{ type: 'seen' as const, event: `${c}_r18_0${n - 1}`, value: true }]),
      ...(n === 2
        ? [
            { type: 'intimacy' as const, char: c, op: '>=' as const, value: 25 },
            { type: 'facility' as const, id: 'bath' as const, op: '>=' as const, value: 1 },
          ]
        : []),
      ...(n === 3 ? [{ type: 'intimacy' as const, char: c, op: '>=' as const, value: 50 }] : []),
      ...(n === 4
        ? [
            { type: 'intimacy' as const, char: c, op: '>=' as const, value: 75 },
            { type: 'record' as const, op: '>=' as const, value: 21 },
          ]
        : []),
    ],
  });
  return [
    {
      id: `${c}_stage2`,
      trigger: 'visit',
      char: c,
      scene: `${c}_stage2`,
      priority: 60,
      conditions: [
        { type: 'stage', char: c, op: '==', value: 1 },
        { type: 'affection', char: c, op: '>=', value: 250 },
      ],
    },
    {
      id: `${c}_stage3`,
      trigger: 'visit',
      char: c,
      scene: `${c}_stage3`,
      priority: 60,
      conditions: [
        { type: 'stage', char: c, op: '==', value: 2 },
        { type: 'affection', char: c, op: '>=', value: 450 },
      ],
    },
    {
      id: `${c}_stage4`,
      trigger: 'date',
      char: c,
      scene: `${c}_stage4`,
      priority: 60,
      conditions: [
        { type: 'stage', char: c, op: '==', value: 3 },
        { type: 'affection', char: c, op: '>=', value: 700 },
      ],
    },
    {
      id: `${c}_stage4v`,
      trigger: 'visit',
      char: c,
      scene: `${c}_stage4`,
      priority: 55,
      conditions: [
        { type: 'stage', char: c, op: '==', value: 3 },
        { type: 'affection', char: c, op: '>=', value: 700 },
      ],
    },
    {
      id: `${c}_stage5`,
      trigger: 'date',
      char: c,
      scene: `${c}_stage5`,
      priority: 60,
      conditions: [
        { type: 'stage', char: c, op: '==', value: 4 },
        { type: 'affection', char: c, op: '>=', value: 950 },
        { type: 'personalTrial', char: c, value: true },
      ],
    },
    r(1),
    r(2),
    r(3),
    r(4),
  ];
}

export const EVENTS: EventDef[] = [...story, ...CHAR_IDS.flatMap(romanceEvents)];
export const EVENT_MAP: Record<string, EventDef> = Object.fromEntries(EVENTS.map((e) => [e.id, e]));

/** 디버그·문서용: 캐릭터 이름 */
export const charName = (c: CharId) => CHARACTERS[c].name;
