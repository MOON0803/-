import { CHARACTERS } from '../content/characters';
import { MESSAGES } from '../content/messages';
import { chance, pick, randRange } from '../core/rng';
import { recruitedIds } from '../core/state';
import { DAYS_PER_CHAPTER, DAYS_PER_MONTH, DAYS_PER_YEAR, dateInfo } from '../core/time';
import type { GameState } from '../core/types';
import { addAffection } from './bond';
import { cafeDay, emergencyLoan, quarterTarget, sponsorAmount, tickConstruction, weeklyCosts, won } from './economy';
import { determineEnding } from './ending';

export interface DayReport {
  title: string;
  lines: string[];
  weekly: string[] | null;
  quarter: string[] | null;
}

function clamp(v: number) {
  return Math.max(0, Math.min(100, v));
}

/** 밤이 시작될 때: 헌터톡 메시지 수신 */
export function nightStart(s: GameState): string | null {
  if (!chance(s, 0.5)) return null;
  const sent = new Set(s.messages.map((m) => m.templateId));
  const candidates = MESSAGES.filter(
    (t) => s.members[t.from].recruited && s.members[t.from].stage >= t.minStage && !sent.has(t.id),
  );
  if (candidates.length === 0) return null;
  const t = pick(s, candidates);
  s.messages.push({
    uid: `${t.id}_${s.time.day}`,
    templateId: t.id,
    from: t.from,
    day: s.time.day,
    text: t.text,
    replies: t.replies,
    answered: null,
    read: false,
  });
  return `📱 ${CHARACTERS[t.from].short}에게서 헌터톡이 왔다.`;
}

export function answerMessage(s: GameState, uid: string, replyIdx: number): string {
  const msg = s.messages.find((m) => m.uid === uid);
  if (!msg || msg.answered !== null) return '';
  msg.answered = replyIdx;
  msg.read = true;
  const r = msg.replies[replyIdx];
  addAffection(s, msg.from, r.aff);
  return r.response;
}

function weeklySettlement(s: GameState): string[] {
  const lines: string[] = [];
  const cost = weeklyCosts(s);
  s.guild.funds -= cost.total;
  lines.push(`급여 ${won(cost.salaries)} · 유지비 ${won(cost.upkeep)} · 이자 ${won(cost.interest)}`);
  lines.push(`주간 지출 합계 −${won(cost.total)}`);
  if (s.guild.funds < 0) {
    const need = -s.guild.funds;
    emergencyLoan(s, need);
    lines.push(`⚠ 자금 부족! 긴급 대출 ${won(need)} (빚 +${won(need * 1.2)})`);
  }
  s.guild.stonePrice = Math.round(randRange(s, 0.8, 1.25) * 10_000 / 100) * 100;
  lines.push(`마석 시세: 개당 ${won(s.guild.stonePrice)}`);

  // 라이벌 길드 기록 갱신
  const wallBroken = s.flags.wall_broken === true;
  for (const [name, rec] of Object.entries(s.rivals)) {
    if (name === '산왕') {
      if (wallBroken && rec < s.tower.record - 1 && chance(s, 0.3)) s.rivals[name] = rec + 1;
      continue;
    }
    if (rec < 33 && rec < s.rivals['산왕'] - 1 && chance(s, 0.2)) {
      s.rivals[name] = rec + 1;
      lines.push(`📈 ${name} 길드가 ${rec + 1}층을 돌파했다.`);
    }
  }
  const ranking = rankingTable(s);
  const myRank = ranking.findIndex((r) => r.mine) + 1;
  lines.push(`등반 랭킹: ${myRank}위 / ${ranking.length}개 길드`);
  return lines;
}

export function rankingTable(s: GameState): { name: string; floor: number; mine: boolean }[] {
  const rows = Object.entries(s.rivals).map(([name, floor]) => ({ name, floor, mine: false }));
  rows.push({ name: '여명', floor: s.tower.record, mine: true });
  return rows.sort((a, b) => b.floor - a.floor || (a.mine ? -1 : 1));
}

function quarterCheck(s: GameState, chapter: number): string[] {
  const t = quarterTarget(chapter);
  const okRepay = s.guild.repaid >= t.repaid;
  const okFloor = s.tower.record >= t.floor;
  const lines = [
    `상환 누계 ${won(s.guild.repaid)} / 목표 ${won(t.repaid)} ${okRepay ? '✅' : '❌'}`,
    `최고 층 ${s.tower.record}층 / 목표 ${t.floorLabel} ${okFloor ? '✅' : '❌'}`,
  ];
  if (okRepay && okFloor) {
    s.guild.fame += 50;
    lines.push('협회 감독관 강민서: "다음 분기도 이렇게만 해 주세요." (명성 +50)');
  } else {
    s.guild.warnings += 1;
    lines.push(`⚠ 분기 목표 미달. 경고 ${s.guild.warnings}회. (2회면 길드 해산)`);
    if (s.guild.warnings >= 2) s.ending = determineEnding(s);
  }
  return lines;
}

/** 잠자리에 든 뒤 하루를 마감하고 다음 날 아침으로 넘긴다 */
export function endDay(s: GameState): DayReport {
  const info = dateInfo(s.time.day);
  const lines: string[] = [];

  const cafe = cafeDay(s);
  s.guild.funds += cafe.profit;
  s.guild.cafeTotal += cafe.profit;
  lines.push(`☕ 카페: 손님 ${cafe.customers}명 · 매출 ${won(cafe.revenue)} · 순익 +${won(cafe.profit)}`);
  s.cafeShifts = 0;
  s.protagonistCafe = 0;

  const f = s.guild.facilities;
  for (const c of recruitedIds(s)) {
    const m = s.members[c];
    m.fatigue = clamp(m.fatigue - 20 - f.bath * 10 - (f.dorm - 1) * 5);
    m.stress = clamp(m.stress - 5 - f.rooftop * 5 - f.infirmary * 3);
    if (m.injuryDays > 0) {
      m.injuryDays = Math.max(0, m.injuryDays - f.infirmary - (s.members.seoyun.recruited && c !== 'seoyun' ? 1 : 0));
      if (m.injuryDays === 0) lines.push(`🩹 ${CHARACTERS[c].short}의 부상이 나았다.`);
    }
    m.talkedToday = false;
  }

  const built = tickConstruction(s);
  if (built) lines.push(built);

  for (const msg of s.messages) {
    if (msg.answered === null && msg.day < s.time.day) {
      msg.answered = -1;
      addAffection(s, msg.from, -2);
      lines.push(`📱 ${CHARACTERS[msg.from].short}의 헌터톡을 읽씹했다… (호감 −2)`);
    }
  }

  let weekly: string[] | null = null;
  if (info.weekday === 6) weekly = weeklySettlement(s);
  if ((s.time.day + 1) % DAYS_PER_MONTH === 0) {
    const sp = sponsorAmount(s);
    if (sp > 0) {
      s.guild.funds += sp;
      (weekly ??= []).push(`🤝 스폰서 월 지원금 +${won(sp)}`);
    }
  }

  let quarter: string[] | null = null;
  const lastDayOfChapter = (s.time.day + 1) % DAYS_PER_CHAPTER === 0;
  if (lastDayOfChapter && info.chapter < 4) quarter = quarterCheck(s, info.chapter);

  s.time.day += 1;
  s.time.phase = 'morning';
  if (s.time.day >= DAYS_PER_YEAR && !s.ending) s.ending = determineEnding(s);

  return { title: `${info.month}월 ${info.week}주 ${info.weekdayName}요일 정산`, lines, weekly, quarter };
}
