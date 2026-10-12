import { CHARACTERS, STAGE_THRESHOLDS } from '../content/characters';
import { GIFT_IDS, ITEMS } from '../content/items';
import { PLACE_MAP } from '../content/places';
import { randInt } from '../core/rng';
import type { CharId, GameState, MemberState } from '../core/types';

export type Mood = 'good' | 'normal' | 'bad';
export const MOOD_LABEL: Record<Mood, string> = { good: '좋음', normal: '보통', bad: '나쁨' };

export function moodOf(m: MemberState): Mood {
  if (m.stress >= 70) return 'bad';
  if (m.stress <= 25 && m.fatigue < 60) return 'good';
  return 'normal';
}

const MOOD_MULT: Record<Mood, number> = { good: 1.2, normal: 1, bad: 0.5 };

/** 호감 변화. 양수는 기분 보정. 단계는 자동으로 오르지 않는다 (이벤트가 올린다) */
export function addAffection(s: GameState, c: CharId, amount: number): number {
  const m = s.members[c];
  const delta = amount > 0 ? Math.round(amount * MOOD_MULT[moodOf(m)]) : amount;
  const before = m.affection;
  m.affection = Math.max(0, Math.min(1000, m.affection + delta));
  return m.affection - before;
}

export function addIntimacy(s: GameState, c: CharId, amount: number): number {
  const m = s.members[c];
  if (m.stage < 4) return 0;
  const before = m.intimacy;
  m.intimacy = Math.max(0, Math.min(100, m.intimacy + amount));
  return m.intimacy - before;
}

export function nextStageThreshold(m: MemberState): number | null {
  return m.stage >= 5 ? null : STAGE_THRESHOLDS[m.stage + 1];
}

export type GiftReaction = 'like' | 'neutral' | 'dislike';

export function giftReaction(c: CharId, itemId: string): GiftReaction {
  const d = CHARACTERS[c];
  if (d.likes.includes(itemId)) return 'like';
  if (d.dislikes.includes(itemId)) return 'dislike';
  return 'neutral';
}

export function giveGift(s: GameState, c: CharId, itemId: string): { reaction: GiftReaction; delta: number } {
  if (!GIFT_IDS.includes(itemId) || (s.inventory[itemId] ?? 0) <= 0) throw new Error('선물이 없습니다');
  s.inventory[itemId] -= 1;
  const m = s.members[c];
  const reaction = giftReaction(c, itemId);
  const times = m.giftsGiven[itemId] ?? 0;
  m.giftsGiven[itemId] = times + 1;
  const decay = Math.max(0.3, 1 - times * 0.25);
  const base = reaction === 'like' ? 30 : reaction === 'dislike' ? -20 : 10;
  const delta = addAffection(s, c, base > 0 ? Math.round(base * decay) : base);
  if (reaction === 'like' && !m.knownLikes.includes(itemId)) m.knownLikes.push(itemId);
  if (reaction === 'dislike' && !m.knownDislikes.includes(itemId)) m.knownDislikes.push(itemId);
  return { reaction, delta };
}

export function talkGain(s: GameState, c: CharId): number {
  const m = s.members[c];
  const base = randInt(s, 8, 15);
  const delta = addAffection(s, c, m.talkedToday ? Math.round(base * 0.3) : base);
  m.talkedToday = true;
  return delta;
}

export function dateGain(s: GameState, c: CharId, placeId: string): { delta: number; liked: boolean; disliked: boolean } {
  const d = CHARACTERS[c];
  const m = s.members[c];
  const liked = d.likedPlaces.includes(placeId);
  const disliked = d.dislikedPlaces.includes(placeId);
  const base = randInt(s, 25, 35) + (liked ? 20 : 0) - (disliked ? 15 : 0);
  if (liked && !m.knownLikes.includes(placeId)) m.knownLikes.push(placeId);
  if (disliked && !m.knownDislikes.includes(placeId)) m.knownDislikes.push(placeId);
  m.stress = Math.max(0, m.stress - 15);
  return { delta: addAffection(s, c, base), liked, disliked };
}

export function canDate(s: GameState, c: CharId, placeId: string): string | null {
  const m = s.members[c];
  const p = PLACE_MAP[placeId];
  if (!m.recruited) return '합류하지 않았습니다';
  if (m.stage < p.minStage) return `관계 단계 ${p.minStage} 이상 필요`;
  if (m.injuryDays > 0) return '부상 중입니다';
  if (s.guild.funds < p.cost) return '자금이 부족합니다';
  return null;
}

export function giftName(id: string): string {
  return ITEMS[id]?.name ?? PLACE_MAP[id]?.name ?? id;
}
