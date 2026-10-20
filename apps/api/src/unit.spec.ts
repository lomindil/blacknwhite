import { isbn13to10, normalizeIsbn } from './books/book-factory';
import { buildSchedule, weekThreadTitle } from './clubs/schedule';
import { detectSource, mapRow } from './imports/imports.service';

describe('schedule', () => {
  it('splits chapters into weeks, last week shorter', () => {
    const s = buildSchedule(new Date('2026-10-01T00:00:00Z'), 21, 4);
    expect(s.weeks).toHaveLength(6);
    expect(s.weeks[0]).toEqual({ week: 1, fromChapter: 1, toChapter: 4, startsOn: '2026-10-01' });
    expect(s.weeks[5]).toEqual({ week: 6, fromChapter: 21, toChapter: 21, startsOn: '2026-11-05' });
  });

  it('titles single-chapter weeks', () => {
    expect(weekThreadTitle({ week: 6, fromChapter: 21, toChapter: 21 })).toBe('Week 6 · Chapter 21');
    expect(weekThreadTitle({ week: 1, fromChapter: 1, toChapter: 4 })).toBe('Week 1 · Chapters 1–4');
  });
});

describe('ISBN helpers', () => {
  it('converts ISBN-13 to ISBN-10 with check digit', () => {
    expect(isbn13to10('9780143028574')).toBe('014302857X'); // check digit 10 → X
    expect(isbn13to10('9780306406157')).toBe('0306406152');
    expect(isbn13to10('9791234567896')).toBeNull();
  });

  it('normalizes Goodreads-wrapped ISBNs', () => {
    expect(normalizeIsbn('="0743273567"')).toBe('0743273567');
    expect(normalizeIsbn('978-0-14-302857-4')).toBe('9780143028574');
    expect(normalizeIsbn('')).toBeNull();
  });
});

describe('CSV import mapping', () => {
  it('detects the export source from headers', () => {
    expect(detectSource(['Book Id', 'Title', 'Exclusive Shelf'])).toBe('goodreads');
    expect(detectSource(['Title', 'Authors', 'ISBN/UID', 'Read Status'])).toBe('storygraph');
    expect(detectSource(['foo', 'bar'])).toBeNull();
  });

  it('maps a Goodreads row', () => {
    const row = mapRow('goodreads', {
      Title: 'Godaan',
      Author: 'Munshi Premchand',
      'Additional Authors': 'Gordon C. Roadarmel',
      ISBN: '="8171670245"',
      ISBN13: '=""',
      'My Rating': '4',
      'Exclusive Shelf': 'read',
      'Date Read': '2024/03/01',
    });
    expect(row).toMatchObject({ title: 'Godaan', authors: ['Munshi Premchand', 'Gordon C. Roadarmel'], isbn10: '8171670245', isbn13: null, status: 'read', rating: 4 });
    expect(row.finishedAt?.toISOString().slice(0, 10)).toBe('2024-03-01');
  });

  it('maps StoryGraph statuses and skips did-not-finish', () => {
    expect(mapRow('storygraph', { Title: 'X', Authors: 'A, B', 'Read Status': 'currently-reading', 'Star Rating': '4.5' })).toMatchObject({
      status: 'reading',
      authors: ['A', 'B'],
      rating: 5,
    });
    expect(mapRow('storygraph', { Title: 'Y', Authors: 'A', 'Read Status': 'did-not-finish' })).toMatchObject({
      status: null,
      skipReason: 'Did not finish — skipped',
    });
  });
});
