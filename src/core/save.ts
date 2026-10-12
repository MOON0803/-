import { dateInfo, formatDate } from './time';
import { SAVE_VERSION } from './state';
import type { GameState } from './types';

export const SLOTS = ['auto', 'quick', 'slot1', 'slot2', 'slot3'] as const;
export type SlotId = (typeof SLOTS)[number];

export const SLOT_LABEL: Record<SlotId, string> = {
  auto: '오토세이브',
  quick: '퀵세이브',
  slot1: '슬롯 1',
  slot2: '슬롯 2',
  slot3: '슬롯 3',
};

interface SaveFile {
  version: number;
  savedAt: number;
  summary: string;
  state: GameState;
}

const KEY = (slot: SlotId) => `baektap.save.${slot}`;

export function summarize(s: GameState): string {
  return `${formatDate(s.time.day)} · Ch${dateInfo(s.time.day).chapter} · 최고 ${s.tower.record}층`;
}

/** 세이브 버전이 바뀌면 여기서 이전 형식을 새 형식으로 고친다 */
export function migrate(raw: SaveFile): GameState {
  const s = raw.state;
  if (raw.version > SAVE_VERSION) throw new Error('더 새로운 버전의 세이브입니다');
  return s;
}

export function serialize(s: GameState): string {
  const file: SaveFile = { version: SAVE_VERSION, savedAt: Date.now(), summary: summarize(s), state: s };
  return JSON.stringify(file);
}

export function deserialize(json: string): GameState {
  return migrate(JSON.parse(json) as SaveFile);
}

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function saveTo(slot: SlotId, s: GameState): boolean {
  try {
    storage()?.setItem(KEY(slot), serialize(s));
    return true;
  } catch {
    return false;
  }
}

export function loadFrom(slot: SlotId): GameState | null {
  try {
    const raw = storage()?.getItem(KEY(slot));
    return raw ? deserialize(raw) : null;
  } catch {
    return null;
  }
}

export function slotInfo(slot: SlotId): { summary: string; savedAt: number } | null {
  try {
    const raw = storage()?.getItem(KEY(slot));
    if (!raw) return null;
    const f = JSON.parse(raw) as SaveFile;
    return { summary: f.summary, savedAt: f.savedAt };
  } catch {
    return null;
  }
}
