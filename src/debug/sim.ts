import { getScene } from '../content/scenes';
import { combatantIds, recruitedIds } from '../core/state';
import { dateInfo } from '../core/time';
import type { CharId, GameState } from '../core/types';
import { actCafe, actNightVisit, actTalk } from '../systems/actions';
import { runToEnd } from '../systems/battle';
import { endDay } from '../systems/calendar';
import { repay } from '../systems/economy';
import { findEvent, markSeen } from '../systems/events';
import { runSceneHeadless } from '../systems/scene';
import { processPhaseSchedule } from '../systems/schedule';
import {
  advanceFloor,
  applyPerk,
  canContinue,
  clearFloor,
  enterNode,
  exitRun,
  finishBattle,
  nextFloorFor,
  reachable,
  resolveEvent,
  startRun,
  type TowerRun,
} from '../systems/tower';

export type SimPolicy = 'tower' | 'cafe' | 'balance';

function runEvents(s: GameState, trigger: 'morning' | 'floorClear', floor?: number) {
  for (let i = 0; i < 10; i++) {
    const ev = findEvent(s, trigger, { floor });
    if (!ev) return;
    markSeen(s, ev);
    runSceneHeadless(s, getScene(ev.scene), false);
  }
}

const PRIORITY: Record<string, number> = { exit: 9, boss: 9, trial: 9, village: 9, personal: 8, treasure: 6, hidden: 7, rest: 5, event: 4, battle: 3, elite: 2 };

function autoTower(s: GameState, root: boolean): void {
  const party = combatantIds(s)
    .filter((c) => s.members[c].injuryDays === 0)
    .slice(0, 4) as CharId[];
  if (party.length === 0) return;
  const next = nextFloorFor(s, root);
  const avgLv = party.reduce((a, c) => a + s.members[c].level, 0) / party.length;
  // 권장 레벨에 못 미치거나 직전에 졌으면 아래층에서 파밍
  const farm = !root && (avgLv < next * 0.8 || s.flags.__simLost === true);
  const floor = farm ? Math.max(1, next - 4) : next;
  s.flags.__simLost = false;
  const run: TowerRun = startRun(s, party, 'full', 'morning', floor);
  for (let guard = 0; guard < 400; guard++) {
    if (run.floorDone) {
      if (run.pendingPerks) applyPerk(s, run, run.pendingPerks[0]);
      if (!canContinue(s, run)) break;
      advanceFloor(s, run);
      continue;
    }
    if (run.timeLeft <= 0) break;
    const options = reachable(run.map).filter((n) => !n.hidden);
    if (options.length === 0) break;
    const lowHp = run.party.some((c) => run.hp[c] < 40);
    const next = [...options].sort((a, b) => (PRIORITY[b.type] + (lowHp && b.type === 'rest' ? 5 : 0)) - (PRIORITY[a.type] + (lowHp && a.type === 'rest' ? 5 : 0)))[0];
    const out = enterNode(s, run, next.id);
    if (out.kind === 'blocked') break;
    if (out.kind === 'event') resolveEvent(s, run, 0);
    if (out.kind === 'village') run.atVillage = false;
    if (out.kind === 'village' || out.kind === 'floorClear') {
      clearFloor(s, run);
      runEvents(s, 'floorClear', run.floor);
      continue;
    }
    if (out.kind === 'battle') {
      let b = out.battle;
      for (;;) {
        runToEnd(b, s);
        const end = finishBattle(s, run, b);
        if (end.next === 'battle') {
          b = end.battle!;
          continue;
        }
        if (end.next === 'defeat') {
          exitRun(s, run, 'defeat');
          s.flags.__simLost = true;
          return;
        }
        if (end.next === 'floorClear') {
          clearFloor(s, run);
          runEvents(s, 'floorClear', run.floor);
        }
        break;
      }
    }
  }
  exitRun(s, run, 'voluntary');
}

/** N주를 자동 진행하고 주간 요약을 돌려준다. 원본 상태는 건드리지 않는다 */
export function simulate(start: GameState, weeks: number, policy: SimPolicy): { lines: string[]; state: GameState } {
  const s = structuredClone(start);
  s.time.phase = 'morning';
  const lines = [`정책: ${policy} · ${weeks}주`, '주차 | 자금 | 상환누계 | 빚 | 최고층 | 평균Lv | 명성'];
  const endDayIdx = Math.min(336, s.time.day + weeks * 7);
  while (s.time.day < endDayIdx && !s.ending) {
    runEvents(s, 'morning');
    const wd = dateInfo(s.time.day).weekday;
    const fighters = combatantIds(s);
    const tired = fighters.reduce((a, c) => a + s.members[c].fatigue, 0) / Math.max(1, fighters.length);
    // 피로가 쌓이면 쉰다 (사람이 할 법한 운영)
    const climb =
      policy === 'tower' ? tired < 70 : policy === 'balance' ? wd % 2 === 0 && wd !== 6 && tired < 55 : false;
    // 연애 대상: 관계 단계가 가장 낮은 합류 히로인
    const heroine = recruitedIds(s).sort((a, b) => s.members[a].affection - s.members[b].affection)[0];
    if (climb) {
      const root = s.flags.root_open === true && s.tower.rootRecord < 5;
      autoTower(s, root);
      processPhaseSchedule(s, 'morning', combatantIds(s));
      processPhaseSchedule(s, 'afternoon', combatantIds(s));
    } else {
      if (policy === 'balance' && heroine) actTalk(s, heroine);
      else actCafe(s);
      processPhaseSchedule(s, 'morning');
      actCafe(s);
      processPhaseSchedule(s, 'afternoon');
    }
    s.time.phase = 'night';
    if (policy === 'balance' && heroine) {
      const ev = findEvent(s, 'visit', { char: heroine });
      if (ev) {
        markSeen(s, ev);
        runSceneHeadless(s, getScene(ev.scene), false);
      } else actNightVisit(s, heroine);
    }
    if (s.guild.stones > 0) {
      s.guild.funds += s.guild.stones * s.guild.stonePrice;
      s.guild.stones = 0;
    }
    endDay(s);
    if (dateInfo(s.time.day).weekday === 0) {
      repay(s, Math.max(0, s.guild.funds - 5_000_000));
      const lv = combatantIds(s).reduce((a, c) => a + s.members[c].level, 0) / Math.max(1, combatantIds(s).length);
      lines.push(
        `${dateInfo(s.time.day - 1).weekOfYear}주 | ${Math.round(s.guild.funds / 10_000)}만 | ${Math.round(s.guild.repaid / 10_000)}만 | ${Math.round(s.guild.debt / 10_000)}만 | ${s.tower.record}${s.tower.rootRecord ? `+B${s.tower.rootRecord}` : ''} | ${lv.toFixed(1)} | ${s.guild.fame}`,
      );
    }
  }
  if (s.ending) lines.push(`엔딩: ${s.ending}`);
  return { lines, state: s };
}
