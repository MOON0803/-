import { CHARACTERS } from '../content/characters';
import { chance } from '../core/rng';
import { combatantIds } from '../core/state';
import { dateInfo } from '../core/time';
import type { Activity, CharId, GameState, Phase, StatKey } from '../core/types';
import { addAffection } from './bond';
import { gainExp, memberStats } from './stats';

export const ACTIVITY_LABEL: Record<Activity, string> = {
  standby: '등반 대기',
  train_atk: '훈련: 공격',
  train_def: '훈련: 방어',
  train_mag: '훈련: 마력',
  train_spd: '훈련: 속도',
  cafe: '카페 근무',
  rest: '휴식',
  free: '자유',
};

export const ACTIVITIES = Object.keys(ACTIVITY_LABEL) as Activity[];

const TRAIN_GAIN: Record<string, Partial<Record<StatKey, number>>> = {
  train_atk: { atk: 0.6 },
  train_def: { def: 0.6, hp: 2 },
  train_mag: { mag: 0.6, mp: 1 },
  train_spd: { spd: 0.3 },
};

export function trainingMultiplier(s: GameState, c: CharId): number {
  const m = s.members[c];
  const facility = 1 + (s.guild.facilities.training - 1) * 0.15;
  const tired = m.fatigue >= 80 ? 0.5 : 1;
  return facility * tired;
}

export function applyTraining(s: GameState, c: CharId, act: Activity, scale = 1): string {
  const gains = TRAIN_GAIN[act];
  const mult = trainingMultiplier(s, c) * scale;
  const m = s.members[c];
  const parts: string[] = [];
  for (const [k, v] of Object.entries(gains) as [StatKey, number][]) {
    m.bonus[k] += v * mult;
    parts.push(`${k.toUpperCase()} +${(v * mult).toFixed(1)}`);
  }
  gainExp(s, c, Math.round(8 * scale));
  return parts.join(', ');
}

function clamp(v: number) {
  return Math.max(0, Math.min(100, v));
}

/** 한 페이즈 동안 멤버 스케줄을 실행한다. exclude 는 탑에 올라간 파티 */
export function processPhaseSchedule(s: GameState, phase: Exclude<Phase, 'night'>, exclude: CharId[] = []): string[] {
  const lines: string[] = [];
  const weekday = dateInfo(s.time.day).weekday;
  for (const c of combatantIds(s)) {
    if (exclude.includes(c)) continue;
    const m = s.members[c];
    const name = CHARACTERS[c].short;
    if (m.injuryDays > 0) {
      m.fatigue = clamp(m.fatigue - 15);
      continue;
    }
    const act = m.schedule[weekday][phase];
    switch (act) {
      case 'standby':
        m.fatigue = clamp(m.fatigue - 5);
        break;
      case 'train_atk':
      case 'train_def':
      case 'train_mag':
      case 'train_spd': {
        const r = applyTraining(s, c, act);
        m.fatigue = clamp(m.fatigue + 15);
        m.stress = clamp(m.stress + 5);
        lines.push(`${name}: ${ACTIVITY_LABEL[act]} (${r})`);
        break;
      }
      case 'cafe': {
        const chm = memberStats(s, c).chm;
        s.cafeShifts += chm * 0.5;
        m.bonus.chm += 0.3;
        m.fatigue = clamp(m.fatigue + 10);
        m.stress = clamp(m.stress + 5);
        lines.push(`${name}: 카페 근무`);
        break;
      }
      case 'rest':
        m.fatigue = clamp(m.fatigue - 30);
        m.stress = clamp(m.stress - 15);
        break;
      case 'free':
        m.fatigue = clamp(m.fatigue - 10);
        m.stress = clamp(m.stress - 10);
        if (chance(s, 0.15)) {
          addAffection(s, c, 3);
          lines.push(`${name}: 자유 시간에 거실에서 마주쳐 수다를 떨었다 (호감 +3)`);
        }
        break;
    }
    if (m.fatigue >= 90 && act !== 'rest' && chance(s, 0.1)) {
      m.injuryDays = 2;
      lines.push(`⚠ ${name}: 과로로 쓰러졌다! (부상 2일)`);
    }
  }
  return lines;
}
