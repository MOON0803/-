import { CHARACTERS, callName } from '../content/characters';
import { PLACE_MAP } from '../content/places';
import { pick, randInt } from '../core/rng';
import { recruitedIds } from '../core/state';
import type { CharId, GameState } from '../core/types';
import { addAffection, canDate, dateGain, giftReaction, giveGift, talkGain } from './bond';
import { won } from './economy';
import { ACTIVITY_LABEL, applyTraining } from './schedule';
import { giftName } from './bond';

export type TrainStat = 'train_atk' | 'train_def' | 'train_mag' | 'train_spd';

export function actTalk(s: GameState, c: CharId): string[] {
  const d = CHARACTERS[c];
  const repeat = s.members[c].talkedToday;
  const delta = talkGain(s, c);
  const line = pick(s, d.lines.talk);
  return [`${d.short}: "${line}"`, `호감 ${delta >= 0 ? '+' : ''}${delta}${repeat ? ' (오늘 이미 대화함)' : ''}`];
}

export function actGift(s: GameState, c: CharId, itemId: string): string[] {
  const d = CHARACTERS[c];
  const { reaction, delta } = giveGift(s, c, itemId);
  const react = {
    like: `${d.short}의 눈이 반짝인다. "이거… 나 주는 거야?"`,
    neutral: `${d.short}: "고마워. 잘 쓸게."`,
    dislike: `${d.short}: "……아, 응. 고마워." (표정이 미묘하다)`,
  }[reaction];
  return [`${giftName(itemId)}을(를) 선물했다.`, react, `호감 ${delta >= 0 ? '+' : ''}${delta}`];
}

export function previewGift(c: CharId, itemId: string) {
  return giftReaction(c, itemId);
}

export function actTrain(s: GameState, c: CharId, stat: TrainStat): string[] {
  const m = s.members[c];
  const r = applyTraining(s, c, stat, 2);
  m.fatigue = Math.min(100, m.fatigue + 10);
  addAffection(s, c, 4);
  return [`${CHARACTERS[c].short}의 ${ACTIVITY_LABEL[stat]}을(를) 직접 봐 주었다. (${r})`, '호감 +4'];
}

export function actCafe(s: GameState): string[] {
  s.protagonistCafe += 15;
  return [`${s.playerName}이(가) 직접 카운터에 섰다. 단골들이 반가워한다. (오늘 매출 ↑)`];
}

export function actRift(s: GameState): string[] {
  const reward = Math.round(randInt(s, 15, 30) * 10_000 * (1 + s.tower.record / 10));
  const stones = randInt(s, 3, 8) + Math.floor(s.tower.record / 2);
  s.guild.funds += reward;
  s.guild.stones += stones;
  s.guild.fame += 2;
  const helpers = recruitedIds(s).filter((c) => s.members[c].combatant && s.members[c].injuryDays === 0);
  const lines = [`협회 의뢰로 도시 균열을 정리했다. 보수 +${won(reward)}, 마석 +${stones}, 명성 +2`];
  if (helpers.length) {
    const h = pick(s, helpers);
    s.members[h].fatigue = Math.min(100, s.members[h].fatigue + 10);
    lines.push(`(${CHARACTERS[h].short}이(가) 따라와 줬다)`);
  }
  return lines;
}

export function actRest(s: GameState): string[] {
  if (randInt(s, 1, 4) === 1) {
    const cands = recruitedIds(s);
    if (cands.length) {
      const c = pick(s, cands);
      addAffection(s, c, 5);
      return [`소파에서 졸다가 깨어 보니 ${CHARACTERS[c].short}이(가) 담요를 덮어 줬다. (호감 +5)`];
    }
  }
  return ['오랜만에 아무것도 하지 않았다. 창밖으로 백탑이 보인다.'];
}

export function actDate(s: GameState, c: CharId, placeId: string): string[] {
  const err = canDate(s, c, placeId);
  if (err) throw new Error(err);
  const p = PLACE_MAP[placeId];
  s.guild.funds -= p.cost;
  const r = dateGain(s, c, placeId);
  const d = CHARACTERS[c];
  const lines = [`${d.short}와(과) ${p.name}에서 데이트했다.${p.cost ? ` (−${won(p.cost)})` : ''}`];
  if (r.liked) lines.push(`${d.short}: "여기 진짜 좋다. ……${callName(c, s.members[c].stage)}랑 와서 더."`);
  else if (r.disliked) lines.push(`${d.short}은(는) 조금 지루해 보였다.`);
  else lines.push(`${d.short}: "오늘 즐거웠어."`);
  lines.push(`호감 ${r.delta >= 0 ? '+' : ''}${r.delta}`);
  return lines;
}

/** 이벤트가 없을 때의 밤 방문 */
export function actNightVisit(s: GameState, c: CharId): string[] {
  const d = CHARACTERS[c];
  const delta = addAffection(s, c, 6);
  return [`${d.short}의 방 문을 두드렸다.`, `${d.short}: "${pick(s, d.lines.night)}"`, `호감 +${delta}`];
}

export function actRooftop(s: GameState): string[] {
  for (const c of recruitedIds(s)) s.members[c].stress = Math.max(0, s.members[c].stress - 10);
  const cands = recruitedIds(s);
  const lines = ['옥상 정원에서 밤의 백탑을 바라봤다. 길드원 전원 스트레스 −10'];
  if (cands.length) {
    const c = pick(s, cands);
    addAffection(s, c, 4);
    lines.push(`${CHARACTERS[c].short}이(가) 슬쩍 옆에 와서 앉았다. (호감 +4)`);
  }
  return lines;
}

export function actBath(s: GameState): string[] {
  for (const c of recruitedIds(s)) s.members[c].fatigue = Math.max(0, s.members[c].fatigue - 15);
  return ['지하 욕탕에 물을 받았다. 다들 하나둘 내려온다. 길드원 전원 피로 −15'];
}

export function actLivingRoom(s: GameState): string[] {
  const ids = recruitedIds(s);
  for (const c of ids) addAffection(s, c, 3);
  const names = ids.map((c) => CHARACTERS[c].short).join(', ');
  return [`거실에서 다 같이 배달 음식을 먹었다. (${names} 호감 +3)`];
}
