import type { Phase } from './types';

export const DAYS_PER_WEEK = 7;
export const DAYS_PER_MONTH = 28;
export const DAYS_PER_CHAPTER = 84;
export const DAYS_PER_YEAR = 336;

const MONTHS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2];
const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'];
const SEASONS = ['봄', '여름', '가을', '겨울'];
export const PHASE_LABEL: Record<Phase, string> = { morning: '오전', afternoon: '오후', night: '밤' };

export interface DateInfo {
  day: number;
  month: number;
  week: number;
  weekday: number;
  weekdayName: string;
  chapter: number;
  season: string;
  isWeekend: boolean;
  /** 1부터 시작하는 누적 주차 */
  weekOfYear: number;
}

export function dateInfo(day: number): DateInfo {
  const d = Math.max(0, Math.min(day, DAYS_PER_YEAR - 1));
  const monthIdx = Math.floor(d / DAYS_PER_MONTH);
  const weekday = d % DAYS_PER_WEEK;
  const chapter = Math.floor(d / DAYS_PER_CHAPTER) + 1;
  return {
    day,
    month: MONTHS[monthIdx],
    week: Math.floor((d % DAYS_PER_MONTH) / DAYS_PER_WEEK) + 1,
    weekday,
    weekdayName: WEEKDAYS[weekday],
    chapter,
    season: SEASONS[chapter - 1],
    isWeekend: weekday >= 5,
    weekOfYear: Math.floor(d / DAYS_PER_WEEK) + 1,
  };
}

export function formatDate(day: number): string {
  const i = dateInfo(day);
  return `${i.month}월 ${i.week}주 (${i.weekdayName})`;
}
