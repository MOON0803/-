import { CHARACTERS } from '../content/characters';
import { recruitedIds } from '../core/state';
import type { CharId, GameState } from '../core/types';

export const ENDING_LABEL: Record<string, string> = {
  bad: '배드 엔딩 — 꺼진 등불',
  normal: '노멀 엔딩 — 다시, 봄',
  guild: '길드 엔딩 — 여명',
  harem: '하렘 엔딩 — 모두의 탑',
};

export function endingLabel(id: string): string {
  if (ENDING_LABEL[id]) return ENDING_LABEL[id];
  const [kind, c] = id.split('_') as [string, CharId];
  const name = CHARACTERS[c]?.short ?? c;
  return kind === 'partner' ? `${name} 반려 엔딩 — 동반자 등록` : `${name} 연인 엔딩 — 같은 창문`;
}

export function determineEnding(s: GameState): string {
  if (s.guild.warnings >= 2 || s.guild.debt > 0) return 'bad';
  const lovers = recruitedIds(s)
    .filter((c) => s.members[c].stage >= 4)
    .sort((a, b) => s.members[b].stage - s.members[a].stage || s.members[b].affection - s.members[a].affection);
  const rootCleared = s.tower.rootRecord >= 5 || s.flags.root_cleared === true;
  if (lovers.length >= 4 && s.flags.harem === true) return 'harem';
  if (lovers.length > 0) {
    const best = lovers[0];
    return s.members[best].stage >= 5 && rootCleared ? `partner_${best}` : `lover_${best}`;
  }
  return rootCleared ? 'guild' : 'normal';
}
