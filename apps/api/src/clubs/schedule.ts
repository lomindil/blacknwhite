import type { ScheduleWeek } from '@bnw/shared';

export interface ClubSchedule {
  totalChapters: number;
  chaptersPerWeek: number;
  weeks: { week: number; fromChapter: number; toChapter: number; startsOn: string }[];
}

const DAY = 24 * 60 * 60 * 1000;

/** Splits a book into weekly chunks: week 1 = chapters 1..n, starting on `startsOn`. */
export function buildSchedule(startsOn: Date, totalChapters: number, chaptersPerWeek: number): ClubSchedule {
  const count = Math.ceil(totalChapters / chaptersPerWeek);
  const weeks: ScheduleWeek[] = [];
  for (let w = 1; w <= count; w++) {
    weeks.push({
      week: w,
      fromChapter: (w - 1) * chaptersPerWeek + 1,
      toChapter: Math.min(w * chaptersPerWeek, totalChapters),
      startsOn: new Date(startsOn.getTime() + (w - 1) * 7 * DAY),
    });
  }
  return {
    totalChapters,
    chaptersPerWeek,
    weeks: weeks.map((w) => ({ ...w, startsOn: w.startsOn.toISOString().slice(0, 10) })),
  };
}

export function scheduleEnd(s: ClubSchedule): Date {
  const last = s.weeks[s.weeks.length - 1];
  return new Date(new Date(last.startsOn).getTime() + 6 * DAY);
}

/** Thread markers stored in threads.schedule_week: 0 = introductions, -1 = finished-the-book. */
export const INTRO_WEEK = 0;
export const FINISHED_WEEK = -1;

export function weekThreadTitle(w: { week: number; fromChapter: number; toChapter: number }) {
  return w.fromChapter === w.toChapter
    ? `Week ${w.week} · Chapter ${w.fromChapter}`
    : `Week ${w.week} · Chapters ${w.fromChapter}–${w.toChapter}`;
}
