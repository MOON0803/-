import { CHARACTERS } from '../content/characters';
import { FACILITIES } from '../content/facilities';
import { dateInfo } from './time';
import type { CompareOp, Cond, GameState } from './types';

export function compare(a: number, op: CompareOp, b: number): boolean {
  switch (op) {
    case '==':
      return a === b;
    case '!=':
      return a !== b;
    case '>=':
      return a >= b;
    case '<=':
      return a <= b;
    case '>':
      return a > b;
    case '<':
      return a < b;
  }
}

export interface CondResult {
  ok: boolean;
  /** 사람이 읽을 수 있는 조건 설명 */
  label: string;
  actual: string;
}

export function evalCond(s: GameState, c: Cond): CondResult {
  switch (c.type) {
    case 'day':
      return { ok: compare(s.time.day, c.op, c.value), label: `날짜 ${c.op} ${c.value}일차`, actual: `${s.time.day}` };
    case 'chapter': {
      const ch = dateInfo(s.time.day).chapter;
      return { ok: compare(ch, c.op, c.value), label: `챕터 ${c.op} ${c.value}`, actual: `${ch}` };
    }
    case 'record':
      return { ok: compare(s.tower.record, c.op, c.value), label: `최고 층 ${c.op} ${c.value}`, actual: `${s.tower.record}` };
    case 'rootRecord':
      return {
        ok: compare(s.tower.rootRecord, c.op, c.value),
        label: `뿌리 기록 ${c.op} B${c.value}`,
        actual: `B${s.tower.rootRecord}`,
      };
    case 'fame':
      return { ok: compare(s.guild.fame, c.op, c.value), label: `명성 ${c.op} ${c.value}`, actual: `${s.guild.fame}` };
    case 'stage':
    case 'affection':
    case 'intimacy': {
      const m = s.members[c.char];
      const v = m[c.type];
      const name = { stage: '관계 단계', affection: '호감', intimacy: '친밀' }[c.type];
      return {
        ok: compare(v, c.op, c.value),
        label: `${CHARACTERS[c.char].short} ${name} ${c.op} ${c.value}`,
        actual: `${Math.floor(v)}`,
      };
    }
    case 'recruited': {
      const v = s.members[c.char].recruited;
      return {
        ok: v === c.value,
        label: `${CHARACTERS[c.char].short} ${c.value ? '합류함' : '미합류'}`,
        actual: v ? '합류' : '미합류',
      };
    }
    case 'personalTrial': {
      const v = s.members[c.char].personalTrialCleared;
      return {
        ok: v === c.value,
        label: `${CHARACTERS[c.char].short} 개인 시련 ${c.value ? '클리어' : '미클리어'}`,
        actual: v ? '클리어' : '미클리어',
      };
    }
    case 'flag': {
      const v = s.flags[c.name] ?? false;
      return { ok: v === c.value, label: `플래그 ${c.name} = ${c.value}`, actual: `${v}` };
    }
    case 'facility': {
      const v = s.guild.facilities[c.id];
      return {
        ok: compare(v, c.op, c.value),
        label: `${FACILITIES[c.id].name} Lv ${c.op} ${c.value}`,
        actual: `Lv${v}`,
      };
    }
    case 'seen': {
      const v = s.seenEvents.includes(c.event);
      return { ok: v === c.value, label: `이벤트 ${c.event} ${c.value ? '봄' : '안 봄'}`, actual: v ? '봄' : '안 봄' };
    }
  }
}

export function allPass(s: GameState, conds: Cond[]): boolean {
  return conds.every((c) => evalCond(s, c).ok);
}
