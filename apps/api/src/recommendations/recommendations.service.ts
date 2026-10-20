import { cityName, languageName, MIN_PUBLIC_COUNT } from '@bnw/shared';
import type {
  BookRecommendation,
  ClubRecommendation,
  ReaderSignals,
  ReadingProfile,
  ReadingProfileInput,
  Recommendations,
} from '@bnw/shared';
import { Injectable } from '@nestjs/common';
import { bookInclude, BookRow, clubSummaryInclude, toBookSummary, toClubSummary } from '../common/mappers';
import { ClubSchedule } from '../clubs/schedule';
import { PrismaService } from '../core/prisma.service';

/** A reason with the weight it added, so we can show the strongest few. */
type Reason = [weight: number, text: string];

/** Everything we know about one reader, gathered once per request. */
interface Reader {
  id: string;
  city: string | null;
  languages: string[];
  profile: ReadingProfile | null;
  /** Genre → affinity, 0..1 (1 = the reader's favourite). */
  genres: Map<string, number>;
  /** Book ids on any of the reader's shelves (excluded from book picks). */
  shelved: Set<string>;
  wanted: Set<string>;
  /** Books the reader read or is reading, and liked (or didn't rate). */
  liked: Set<string>;
  /** Authors of liked and loved books → one title by them, for the reason text. */
  authors: Map<string, string>;
  clubIds: string[];
  /** Work keys of everything shelved or being read in their clubs. */
  ownedWorks: Set<string>;
  /** Books the reader's clubs are reading now (excluded from book picks). */
  clubCurrent: Set<string>;
  signals: ReaderSignals;
}

const lengthOf = (pages: number | null) => (pages == null ? null : pages < 250 ? 'short' : pages <= 450 ? 'medium' : 'long');
const paceOf = (perWeek: number | null) => (perWeek == null ? null : perWeek <= 2 ? 'relaxed' : perWeek <= 4 ? 'steady' : 'fast');
const LENGTH_TEXT = { short: 'A shorter read', medium: 'A medium-length read', long: 'A long, immersive read' } as const;
const PACE_TEXT = { relaxed: 'An easy pace', steady: 'A steady pace', fast: 'A brisk pace' } as const;
const WELCOMING = /new reader|newcomer|beginner|first[- ]time|all (are )?welcome|everyone is welcome|no pressure/i;

function topReasons(reasons: Reason[], n = 3): string[] {
  return reasons
    .filter(([w]) => w > 0)
    .sort((a, b) => b[0] - a[0])
    .slice(0, n)
    .map(([, t]) => t);
}

/** Title + first author, so several editions of one book count as the same work. */
const workKey = (title: string, author: string | undefined) =>
  `${title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()}|${(author ?? '').toLowerCase()}`;

/** One entry per work, skipping works the reader already has: catalogue lookups can leave several editions. */
function distinctWorks(recs: BookRecommendation[], owned: Set<string>): BookRecommendation[] {
  const seen = new Set<string>();
  return recs.filter((r) => {
    // Match on title alone: editions spell authors differently ("R. K." vs "Rasipuram Krishnaswamy").
    const key = workKey(r.book.title, undefined).split('|')[0];
    if (seen.has(key) || owned.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function round(n: number) {
  return Math.round(n * 10) / 10;
}

@Injectable()
export class RecommendationsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- Reading profile (the quiz) ----------

  async profile(userId: string): Promise<ReadingProfile | null> {
    const [user, p] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { genres: true, languages: true } }),
      this.prisma.readingProfile.findUnique({ where: { userId } }),
    ]);
    if (!p) return null;
    const loved = p.lovedBookIds.length
      ? await this.prisma.book.findMany({ where: { id: { in: p.lovedBookIds } }, include: bookInclude })
      : [];
    const order = new Map(p.lovedBookIds.map((id, i) => [id, i]));
    loved.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    return {
      readingLevel: p.readingLevel as ReadingProfile['readingLevel'],
      genres: user.genres,
      languages: user.languages,
      lovedBooks: loved.map(toBookSummary),
      goals: p.goals as ReadingProfile['goals'],
      format: p.format as ReadingProfile['format'],
      pace: p.pace as ReadingProfile['pace'],
      length: p.length as ReadingProfile['length'],
      updatedAt: p.updatedAt.toISOString(),
    };
  }

  /** Saves quiz answers. Genres and languages go on the user; loved books are added to the "read" shelf. */
  async saveProfile(userId: string, input: ReadingProfileInput): Promise<ReadingProfile> {
    const lovedIds = [
      ...new Set(
        (
          await this.prisma.book.findMany({
            where: { id: { in: input.lovedBookIds }, status: 'approved' },
            select: { id: true },
          })
        ).map((b) => b.id),
      ),
    ];
    const data = {
      readingLevel: input.readingLevel,
      goals: input.goals,
      format: input.format,
      pace: input.pace,
      length: input.length,
      lovedBookIds: input.lovedBookIds.filter((id) => lovedIds.includes(id)),
    };
    await this.prisma.$transaction([
      this.prisma.readingProfile.upsert({ where: { userId }, create: { userId, ...data }, update: data }),
      this.prisma.user.update({ where: { id: userId }, data: { genres: input.genres, languages: input.languages } }),
      // Books they loved count as read; existing shelf entries (and ratings) are left alone.
      this.prisma.readingStatus.createMany({
        data: lovedIds.map((bookId) => ({ userId, bookId, status: 'read' as const, progressPct: 100 })),
        skipDuplicates: true,
      }),
    ]);
    return (await this.profile(userId))!;
  }

  // ---------- Recommendations ----------

  async forUser(userId: string): Promise<Recommendations> {
    const reader = await this.reader(userId);
    const isNewish =
      reader.profile?.readingLevel === 'new' ||
      reader.profile?.readingLevel === 'occasional' ||
      (!reader.profile && reader.signals.booksRead + reader.signals.booksReading < 2 && reader.signals.clubs === 0);
    const [books, clubs, starters] = await Promise.all([
      this.books(reader, 18),
      this.clubs(reader),
      isNewish ? this.starters(reader) : Promise.resolve([]),
    ]);
    const starterKeys = new Set(starters.map((b) => workKey(b.book.title, undefined)));
    const rest = books.filter((b) => !starterKeys.has(workKey(b.book.title, undefined))).slice(0, 12);
    return { profile: reader.profile, signals: reader.signals, clubs, books: rest, starters };
  }

  private async reader(userId: string): Promise<Reader> {
    const [user, profile, statuses, memberships] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { city: true, languages: true, genres: true } }),
      this.profile(userId),
      this.prisma.readingStatus.findMany({
        where: { userId },
        include: { book: { select: { genres: true, authors: { include: { author: true }, orderBy: { position: 'asc' } }, title: true } } },
      }),
      this.prisma.clubMember.findMany({
        where: { userId, club: { deletedAt: null } },
        select: {
          clubId: true,
          club: { select: { currentBookId: true, currentBook: { select: { title: true, authors: { include: { author: true }, orderBy: { position: 'asc' }, take: 1 } } } } },
        },
      }),
    ]);
    const clubIds = memberships.map((m) => m.clubId);
    const clubBooks = clubIds.length
      ? await this.prisma.clubBook.findMany({
          where: { clubId: { in: clubIds } },
          select: { bookId: true, book: { select: { genres: true } } },
        })
      : [];

    // Genre affinity: quiz answers count most, then what they've finished and rated, then club reads.
    const weight = new Map<string, number>();
    const add = (genres: string[], w: number) => genres.forEach((g) => weight.set(g, (weight.get(g) ?? 0) + w));
    add(user.genres, 3);
    const shelved = new Set<string>();
    const wanted = new Set<string>();
    const liked = new Set<string>();
    const authors = new Map<string, string>();
    let rated = 0;
    for (const s of statuses) {
      shelved.add(s.bookId);
      if (s.rating) rated++;
      if (s.status === 'want') {
        wanted.add(s.bookId);
        add(s.book.genres, 0.75);
        continue;
      }
      const likedIt = s.rating == null || s.rating >= 3;
      const w = s.rating == null ? (s.status === 'read' ? 1.5 : 1) : s.rating >= 4 ? 1 + s.rating / 2 : s.rating <= 2 ? -1 : 0.5;
      add(s.book.genres, w);
      if (likedIt) {
        liked.add(s.bookId);
        for (const a of s.book.authors) if (!authors.has(a.authorId)) authors.set(a.authorId, s.book.title);
      }
    }
    for (const cb of clubBooks) add(cb.book.genres, 0.75);
    const max = Math.max(0, ...weight.values());
    const genres = new Map([...weight].filter(([, w]) => w > 0).map(([g, w]) => [g, w / max]));

    const ownedWorks = new Set([
      ...statuses.map((s) => workKey(s.book.title, undefined).split('|')[0]),
      ...memberships.flatMap((m) => (m.club.currentBook ? [workKey(m.club.currentBook.title, undefined).split('|')[0]] : [])),
    ]);
    const languages = user.languages.length ? user.languages : ['en'];
    return {
      id: userId,
      city: user.city,
      languages,
      profile,
      genres,
      shelved,
      wanted,
      liked,
      authors,
      clubIds,
      ownedWorks,
      clubCurrent: new Set(memberships.map((m) => m.club.currentBookId).filter((id): id is string => Boolean(id))),
      signals: {
        booksRead: statuses.filter((s) => s.status === 'read').length,
        booksReading: statuses.filter((s) => s.status === 'reading').length,
        booksWanted: wanted.size,
        rated,
        clubs: clubIds.length,
        clubBooks: new Set(clubBooks.map((c) => c.bookId)).size,
        topGenres: [...genres].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([g]) => g),
      },
    };
  }

  // ---------- Books ----------

  private async books(r: Reader, limit = 12): Promise<BookRecommendation[]> {
    const exclude = [...r.shelved, ...r.clubCurrent];
    const topGenres = r.signals.topGenres;
    const notMine = exclude.length ? { id: { notIn: exclude } } : {};

    // Candidate pool: readers-like-you, genre matches, same authors, and what's popular nearby.
    const [similar, byGenre, byAuthor, stats] = await Promise.all([
      this.similarReaders(r),
      topGenres.length
        ? this.prisma.book.findMany({
            where: { status: 'approved', genres: { hasSome: topGenres }, ...notMine },
            select: { id: true },
            take: 150,
          })
        : Promise.resolve([]),
      r.authors.size
        ? this.prisma.book.findMany({
            where: { status: 'approved', authors: { some: { authorId: { in: [...r.authors.keys()] } } }, ...notMine },
            select: { id: true },
            take: 30,
          })
        : Promise.resolve([]),
      this.prisma.bookStat.findMany({
        where: { city: { in: [r.city ?? '_all', '_all'] }, book: { status: 'approved', ...notMine } },
        orderBy: { readingCount: 'desc' },
        take: 60,
      }),
    ]);
    const ids = new Set([...similar.keys(), ...byGenre.map((b) => b.id), ...byAuthor.map((b) => b.id), ...stats.map((s) => s.bookId)]);
    for (const id of exclude) ids.delete(id);
    if (ids.size < limit) {
      // Brand-new catalogue or reader: fill with anything in their languages.
      const more = await this.prisma.book.findMany({
        where: { status: 'approved', language: { in: r.languages }, ...notMine },
        select: { id: true },
        take: 40,
      });
      more.forEach((b) => ids.add(b.id));
    }
    const books = await this.prisma.book.findMany({ where: { id: { in: [...ids] } }, include: bookInclude });

    const local = new Map(stats.filter((s) => s.city === r.city).map((s) => [s.bookId, s]));
    const national = new Map(stats.filter((s) => s.city === '_all').map((s) => [s.bookId, s]));
    const seedTitles = await this.titles([...new Set([...similar.values()].map((s) => s.seed))]);

    const scored = books
      .map((b) => this.scoreBook(b, r, { similar: similar.get(b.id), seedTitles, local: local.get(b.id), national: national.get(b.id) }))
      .sort((a, b) => b.score - a.score);
    return distinctWorks(scored, r.ownedWorks).slice(0, limit);
  }

  private scoreBook(
    b: BookRow,
    r: Reader,
    ctx: {
      similar?: { readers: number; seed: string };
      seedTitles: Map<string, string>;
      local?: { readingCount: number; clubsReadingCount: number };
      national?: { readingCount: number; clubsReadingCount: number };
    },
  ): BookRecommendation {
    const reasons: Reason[] = [];
    // Books we know little about (no genres yet) sit below ones we can explain.
    let score = b.genres.length ? 0 : -1.5;

    // Genres: the best-matching genre gives the reason; overlap adds a little more.
    const matches = b.genres.map((g) => [g, r.genres.get(g) ?? 0] as const).filter(([, w]) => w > 0).sort((a, b) => b[1] - a[1]);
    if (matches.length) {
      const s = matches[0][1] * 8 + matches.slice(1).reduce((t, [, w]) => t + w * 2, 0);
      score += s;
      const named = matches.slice(0, 2).map(([g]) => g.toLowerCase());
      reasons.push([s, `Because you enjoy ${named.join(' and ')}`]);
    }

    if (r.languages.includes(b.language)) {
      score += 2;
      if (b.language !== 'en') reasons.push([3, `In ${languageName(b.language)}, one of your languages`]);
    } else {
      score -= 4;
    }

    if (ctx.similar) {
      const s = Math.min(ctx.similar.readers, 5) * 2;
      score += s;
      const seed = ctx.seedTitles.get(ctx.similar.seed);
      reasons.push([s + 1, seed ? `Readers who liked ${seed} also enjoyed this` : 'Readers with similar taste enjoyed this']);
    }

    const author = b.authors.find((a) => r.authors.has(a.authorId) && r.authors.get(a.authorId) !== b.title);
    if (author) {
      score += 5;
      reasons.push([5.5, `By ${author.author.name}, author of ${r.authors.get(author.authorId)}`]);
    }

    const pop = ctx.local ?? ctx.national;
    if (pop) {
      const s = Math.min(pop.readingCount, 20) * 0.25 + Math.min(pop.clubsReadingCount, 5) * 0.6;
      score += s;
      const where = ctx.local && r.city ? cityName(r.city) : 'India';
      if (pop.clubsReadingCount > 0) {
        reasons.push([s, `${pop.clubsReadingCount} club${pop.clubsReadingCount === 1 ? ' is' : 's are'} reading it in ${where}`]);
      } else if (pop.readingCount >= MIN_PUBLIC_COUNT) {
        reasons.push([s, `Popular with readers in ${where}`]);
      }
    }

    const want = r.profile?.length ?? 'any';
    const len = lengthOf(b.pageCount);
    if (len && want !== 'any') {
      if (len === want) {
        score += 2;
        reasons.push([1.5, LENGTH_TEXT[len]]);
      } else if ((want === 'short' && len === 'long') || (want === 'long' && len === 'short')) {
        score -= 2;
      }
    }

    return {
      book: { ...toBookSummary(b), genres: b.genres, pageCount: b.pageCount, description: b.description },
      reasons: topReasons(reasons),
      score: round(score),
    };
  }

  /** Books read by people who read (and liked) the same books as this reader, with the shared book that links them. */
  private async similarReaders(r: Reader) {
    const mine = [...new Set([...r.liked, ...(r.profile?.lovedBooks.map((b) => b.id) ?? [])])];
    if (!mine.length) return new Map<string, { readers: number; seed: string }>();
    const rows = await this.prisma.$queryRaw<{ book_id: string; readers: number; seed: string }[]>`
      SELECT c.book_id, COUNT(DISTINCT c.user_id)::int AS readers, mode() WITHIN GROUP (ORDER BY s.book_id) AS seed
      FROM reading_status s
      JOIN reading_status c ON c.user_id = s.user_id AND c.book_id <> s.book_id
      WHERE s.book_id = ANY(${mine}::uuid[])
        AND s.user_id <> ${r.id}::uuid
        AND COALESCE(s.rating, 4) >= 3
        AND c.status IN ('read', 'reading')
        AND COALESCE(c.rating, 4) >= 3
        AND NOT EXISTS (SELECT 1 FROM reading_status m WHERE m.user_id = ${r.id}::uuid AND m.book_id = c.book_id)
      GROUP BY c.book_id
      ORDER BY readers DESC
      LIMIT 60`;
    return new Map(rows.map((row) => [row.book_id, { readers: row.readers, seed: row.seed }]));
  }

  private async titles(ids: string[]) {
    if (!ids.length) return new Map<string, string>();
    const rows = await this.prisma.book.findMany({ where: { id: { in: ids } }, select: { id: true, title: true } });
    return new Map(rows.map((b) => [b.id, b.title]));
  }

  /** Short, well-loved books to (re)start the habit, matched to genre and language where possible. */
  private async starters(r: Reader, limit = 6): Promise<BookRecommendation[]> {
    const exclude = [...r.shelved, ...r.clubCurrent];
    const books = await this.prisma.book.findMany({
      where: {
        status: 'approved',
        ...(exclude.length ? { id: { notIn: exclude } } : {}),
        OR: [{ pageCount: { lte: 300 } }, { genres: { hasSome: ['Short stories', 'Poetry', 'Graphic novels'] } }],
      },
      include: { ...bookInclude, stats: { where: { city: '_all' } }, _count: { select: { readingStatuses: true, clubBooks: true } } },
      take: 80,
    });
    const scored = books
      .map((b) => {
        const reasons: Reason[] = [];
        let score = b.genres.length ? 0 : -1.5;
        const short = b.genres.includes('Short stories');
        if (short) {
          score += 3;
          reasons.push([4, 'Short stories — easy to read one at a time']);
        } else if (b.pageCount && b.pageCount <= 300) {
          score += 3;
          reasons.push([4, `Only about ${Math.round(b.pageCount / 10) * 10} pages`]);
        }
        const g = b.genres.map((x) => [x, r.genres.get(x) ?? 0] as const).sort((a, b) => b[1] - a[1])[0];
        if (g && g[1] > 0) {
          score += g[1] * 6;
          reasons.push([g[1] * 6, `Fits your taste for ${g[0].toLowerCase()}`]);
        }
        if (r.languages.includes(b.language)) score += 2;
        else score -= 4;
        // "Well-loved" means people here have actually read it.
        const readers = b._count.readingStatuses + b._count.clubBooks * 3;
        score += Math.min(readers, 10) * 0.4;
        const stat = b.stats[0];
        if (stat) {
          score += Math.min(stat.readingCount, 20) * 0.2 + Math.min(stat.clubsReadingCount, 5) * 0.5;
          if (stat.clubsReadingCount > 0) reasons.push([2, 'A favourite with book clubs']);
        }
        return {
          book: { ...toBookSummary(b), genres: b.genres, pageCount: b.pageCount, description: b.description },
          reasons: topReasons(reasons),
          score: round(score),
        };
      })
      .sort((a, b) => b.score - a.score);
    const picks = distinctWorks(scored, r.ownedWorks);
    // Only books we can describe and that someone has read: bare lookups are often study guides or odd editions.
    const known = new Set(books.filter((b) => b._count.readingStatuses + b._count.clubBooks > 0).map((b) => b.id));
    const good = picks.filter((p) => p.book.genres.length && known.has(p.book.id));
    return (good.length ? good : picks.filter((p) => p.book.genres.length)).slice(0, limit);
  }

  // ---------- Clubs ----------

  private async clubs(r: Reader, limit = 9): Promise<ClubRecommendation[]> {
    const clubs = await this.prisma.club.findMany({
      where: { deletedAt: null, visibility: 'public', ...(r.clubIds.length ? { id: { notIn: r.clubIds } } : {}) },
      include: {
        ...clubSummaryInclude,
        clubBooks: { select: { bookId: true, isCurrent: true, schedule: true, book: { select: { title: true } } } },
      },
      orderBy: { members: { _count: 'desc' } },
      take: 200,
    });
    if (!clubs.length) return [];

    const since = new Date(Date.now() - 14 * 86400_000);
    const activity = await this.prisma.$queryRaw<{ club_id: string; posts: number }[]>`
      SELECT t.club_id, COUNT(*)::int AS posts
      FROM posts po JOIN threads t ON t.id = po.thread_id
      WHERE t.club_id = ANY(${clubs.map((c) => c.id)}::uuid[]) AND po.created_at >= ${since} AND po.deleted_at IS NULL
      GROUP BY t.club_id`;
    const posts = new Map(activity.map((a) => [a.club_id, a.posts]));

    const p = r.profile;
    const format = p?.format ?? 'either';
    const goals = new Set(p?.goals ?? []);
    const newish = p?.readingLevel === 'new' || p?.readingLevel === 'occasional';

    const scored = clubs
      .map((c): ClubRecommendation => {
        const reasons: Reason[] = [];
        let score = 0;
        const current = c.clubBooks.find((cb) => cb.isCurrent);
        const perWeek = (current?.schedule as ClubSchedule | null)?.chaptersPerWeek ?? null;
        const recent = posts.get(c.id) ?? 0;

        // Where it meets. A club without a city meets online.
        const online = !c.city;
        const local = Boolean(r.city && c.city === r.city);
        if (local && format !== 'online') {
          score += format === 'in_person' ? 7 : 5;
          reasons.push([6, `Meets in ${cityName(c.city!)}, your city`]);
          if (goals.has('meet_people')) score += 2;
        } else if (online && format !== 'in_person') {
          score += format === 'online' ? 7 : 3;
          reasons.push([format === 'online' ? 6 : 3, 'Meets online — join from anywhere']);
          if (goals.has('online_discussion')) score += 2;
        } else if (!online && !local && r.city) {
          score -= format === 'online' ? 2 : 6;
        } else if (!online && !local) {
          // We don't know where they live yet: no bonus, no penalty.
        } else {
          score -= 2;
        }

        if (r.languages.includes(c.language)) {
          score += 3;
          if (c.language !== 'en') reasons.push([4, `Discusses in ${languageName(c.language)}`]);
        } else {
          score -= 5;
        }

        if (c.currentBook) {
          const b = c.currentBook;
          if (r.wanted.has(b.id)) {
            score += 7;
            reasons.push([7, `Reading ${b.title}, which is on your want-to-read list`]);
          } else if (r.liked.has(b.id)) {
            score += 2;
            reasons.push([2, `Reading ${b.title}, which you've read too`]);
          }
          const g = b.genres.map((x) => [x, r.genres.get(x) ?? 0] as const).sort((a, b) => b[1] - a[1])[0];
          if (g && g[1] > 0) {
            score += g[1] * 6;
            reasons.push([g[1] * 6, `Now reading ${b.title} — ${g[0].toLowerCase()}, which you enjoy`]);
          }
        }

        const shared = c.clubBooks.filter((cb) => !cb.isCurrent && r.liked.has(cb.bookId));
        if (shared.length) {
          score += Math.min(shared.length, 3) * 2;
          reasons.push([shared.length * 2, `Has read ${shared[0].book.title}, like you`]);
        }

        const pace = paceOf(perWeek);
        if (pace && p) {
          if (pace === p.pace) {
            score += 2;
            reasons.push([2, `${PACE_TEXT[pace]}: ${perWeek} chapter${perWeek === 1 ? '' : 's'} a week`]);
          } else if ((p.pace === 'relaxed' && pace === 'fast') || (p.pace === 'fast' && pace === 'relaxed')) {
            score -= 2;
          }
        }

        if (recent > 0) {
          score += Math.min(recent, 20) * 0.2;
          if (recent >= 5) reasons.push([Math.min(recent, 20) * 0.2, `Active: ${recent} posts in the last two weeks`]);
        }

        if (c.description && WELCOMING.test(c.description)) {
          score += newish ? 3 : 1;
          if (newish) reasons.push([3.5, 'Welcomes new readers']);
        }
        score += Math.log2(1 + c._count.members) * 0.5;
        if (!reasons.some(([w]) => w > 0)) {
          reasons.push([0.1, c.currentBook ? `Reading ${c.currentBook.title} now` : `${c._count.members} members`]);
        }

        return {
          club: { ...toClubSummary(c), description: c.description, chaptersPerWeek: perWeek, postsLast14d: recent },
          reasons: topReasons(reasons),
          score: round(score),
        };
      })
      .sort((a, b) => b.score - a.score);
    // Drop clear mismatches (wrong city and language), but always offer a few.
    const good = scored.filter((c) => c.score > -4);
    return (good.length >= 3 ? good : scored.slice(0, 3)).slice(0, limit);
  }
}
