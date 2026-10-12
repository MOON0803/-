import { EVENTS, EVENT_MAP } from '../content/events';
import { allPass, evalCond } from '../core/conditions';
import type { CharId, EventDef, GameState, Trigger } from '../core/types';

export interface EventContext {
  char?: CharId;
  floor?: number;
}

function matches(s: GameState, e: EventDef, trigger: Trigger, ctx: EventContext): boolean {
  if (e.trigger !== trigger) return false;
  if (e.char && e.char !== ctx.char) return false;
  if (e.floor !== undefined && e.floor !== ctx.floor) return false;
  if (e.once !== false && s.seenEvents.includes(e.id)) return false;
  return allPass(s, e.conditions);
}

export function findEvent(s: GameState, trigger: Trigger, ctx: EventContext = {}): EventDef | null {
  const list = EVENTS.filter((e) => matches(s, e, trigger, ctx)).sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  return list[0] ?? null;
}

export function markSeen(s: GameState, e: EventDef): void {
  if (!s.seenEvents.includes(e.id)) s.seenEvents.push(e.id);
}

/** 디버그 `why`: 이벤트가 왜 안 뜨는지 한 줄씩 */
export function explainEvent(s: GameState, id: string): string[] {
  const e = EVENT_MAP[id];
  if (!e) return [`이벤트 '${id}' 없음`];
  const lines = [`이벤트 ${e.id} (트리거: ${e.trigger}${e.char ? `, 대상: ${e.char}` : ''}${e.floor ? `, ${e.floor}층` : ''})`];
  if (e.once !== false && s.seenEvents.includes(e.id)) lines.push('✗ 이미 본 이벤트 (1회성)');
  for (const c of e.conditions) {
    const r = evalCond(s, c);
    lines.push(`${r.ok ? '✓' : '✗'} ${r.label} (현재: ${r.actual})`);
  }
  if (e.conditions.length === 0) lines.push('(조건 없음 — 트리거만 맞으면 발생)');
  return lines;
}
