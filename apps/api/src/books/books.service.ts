import {
  BookDetail,
  BookStats,
  BookSummary,
  BuyLink,
  CreateBookInput,
  MIN_PUBLIC_COUNT,
  MyReadingStatus,
  ReadingStatusInput,
  ShelfItem,
} from '@bnw/shared';
import { Injectable, Logger } from '@nestjs/common';
import { Prisma, ReadingStatus, ReadingStatusValue } from '@prisma/client';
import { conflict, notFound } from '../common/errors';
import { AuthUser, iso } from '../common/http';
import { bookInclude, clubSummaryInclude, toBookSummary, toClubSummary } from '../common/mappers';
import { env } from '../config/env';
import { PrismaService } from '../core/prisma.service';
import { QueueService } from '../core/queue.service';
import { SearchService } from '../core/search.service';
import { createBook, findBookByIsbn, isbn13to10 } from './book-factory';
import { CatalogService } from './catalog.service';

export function toMyStatus(rs: ReadingStatus): MyReadingStatus {
  return {
    status: rs.status,
    progressPct: rs.progressPct,
    currentChapter: rs.currentChapter,
    rating: rs.rating,
    startedAt: iso(rs.startedAt),
    finishedAt: iso(rs.finishedAt),
  };
}

@Injectable()
export class BooksService {
  private readonly logger = new Logger('Books');

  constructor(
    private readonly prisma: PrismaService,
    private readonly search: SearchService,
    private readonly catalog: CatalogService,
    private readonly queues: QueueService,
  ) {}

  private async byIds(ids: string[]): Promise<BookSummary[]> {
    if (!ids.length) return [];
    const rows = await this.prisma.book.findMany({
      where: { id: { in: ids }, status: 'approved' },
      include: bookInclude,
    });
    const byId = new Map(rows.map((r) => [r.id, r]));
    return ids.map((id) => byId.get(id)).filter(Boolean).map((b) => toBookSummary(b!));
  }

  /** Postgres fallback when Meilisearch is unavailable. */
  private async searchPostgres(q: string, language: string | undefined, limit: number): Promise<BookSummary[]> {
    const contains = { contains: q, mode: 'insensitive' as const };
    const rows = await this.prisma.book.findMany({
      where: {
        status: 'approved',
        ...(language ? { language } : {}),
        OR: [
          { title: contains },
          { subtitle: contains },
          { authors: { some: { author: { OR: [{ name: contains }, { nameNative: contains }] } } } },
          { editions: { some: { OR: [{ isbn13: q }, { isbn10: q }] } } },
        ],
      },
      include: bookInclude,
      take: limit,
      orderBy: { readingStatuses: { _count: 'desc' } },
    });
    return rows.map(toBookSummary);
  }

  async searchBooks(q: string, language: string | undefined, limit: number): Promise<BookSummary[]> {
    const run = async () => {
      const ids = await this.search.searchBooks(q, { language, limit });
      return ids ? this.byIds(ids) : this.searchPostgres(q, language, limit);
    };
    let results = await run();
    // Thin results → seed from Open Library / Google Books, then merge.
    if (results.length < 5 && q.length >= 3) {
      const external = await this.catalog.lookup(q);
      if (external.length) {
        const extra = await this.byIds(external.filter((id) => !results.some((r) => r.id === id)));
        results = [...results, ...extra.filter((b) => !language || b.language === language)].slice(0, limit);
      }
    }
    return results;
  }

  async get(id: string, user?: AuthUser): Promise<BookDetail> {
    const b = await this.prisma.book.findUnique({
      where: { id },
      include: { ...bookInclude, editions: true },
    });
    if (!b) throw notFound('Book');
    if (b.status !== 'approved' && b.createdById !== user?.id && !user?.isAdmin) throw notFound('Book');
    const rs = user
      ? await this.prisma.readingStatus.findUnique({ where: { userId_bookId: { userId: user.id, bookId: id } } })
      : null;
    return {
      ...toBookSummary(b),
      description: b.description,
      pageCount: b.pageCount,
      chapterCount: b.chapterCount,
      authorsNative: b.authors.map((a) => a.author.nameNative).filter((n): n is string => Boolean(n)),
      editions: b.editions.map((e) => ({ isbn13: e.isbn13, isbn10: e.isbn10, format: e.format, publisher: e.publisher })),
      status: b.status,
      myStatus: rs ? toMyStatus(rs) : null,
    };
  }

  /** Users can add missing books; they go into a review queue unless an admin adds them. */
  async create(user: AuthUser, input: CreateBookInput): Promise<BookDetail> {
    const dupe = await findBookByIsbn(this.prisma, [input.isbn13, input.isbn10]);
    if (dupe) throw conflict('That book is already in the catalog', { bookId: dupe });
    const id = await this.prisma.$transaction((tx) =>
      createBook(tx, {
        title: input.title,
        subtitle: input.subtitle,
        authors: input.authors,
        authorsNative: input.authorsNative,
        language: input.language,
        description: input.description,
        coverUrl: input.coverUrl,
        pageCount: input.pageCount,
        chapterCount: input.chapterCount,
        publishedYear: input.publishedYear,
        publisher: input.publisher,
        isbn13s: input.isbn13 ? [input.isbn13] : [],
        isbn10s: input.isbn10 ? [input.isbn10] : [],
        source: 'user',
        status: user.isAdmin ? 'approved' : 'pending',
        createdById: user.id,
      }),
    );
    await this.queues.add('search', 'book', { id });
    return this.get(id, user);
  }

  async stats(bookId: string, city: string | undefined, userId?: string): Promise<BookStats> {
    const key = city ?? '_all';
    const stat = await this.prisma.bookStat.findUnique({ where: { bookId_city: { bookId, city: key } } });
    const count = stat?.readingCount ?? 0;
    // Clubs are listed, never individual readers. Private clubs show only to their members.
    const clubs = await this.prisma.club.findMany({
      where: {
        currentBookId: bookId,
        deletedAt: null,
        ...(city ? { city } : {}),
        OR: [{ visibility: 'public' }, ...(userId ? [{ members: { some: { userId } } }] : [])],
      },
      include: clubSummaryInclude,
      take: 12,
    });
    return {
      city: city ?? null,
      readingCount: count >= MIN_PUBLIC_COUNT ? count : null,
      fewReaders: count > 0 && count < MIN_PUBLIC_COUNT,
      clubsReadingCount: stat?.clubsReadingCount ?? 0,
      clubs: clubs.map(toClubSummary),
    };
  }

  async buyLinks(bookId: string): Promise<BuyLink[]> {
    const b = await this.prisma.book.findUnique({ where: { id: bookId }, include: { editions: true, links: true } });
    if (!b) throw notFound('Book');
    const tag = env().AMAZON_ASSOCIATE_TAG;
    const isbn10 = b.editions.find((e) => e.isbn10)?.isbn10 ?? b.editions.map((e) => e.isbn13 && isbn13to10(e.isbn13)).find(Boolean);
    const isbn13 = b.editions.find((e) => e.isbn13)?.isbn13;
    const stored = new Map(b.links.map((l) => [l.retailer, l]));

    const amazonUrl = isbn10
      ? `https://www.amazon.in/dp/${isbn10}${tag ? `?tag=${tag}` : ''}`
      : `https://www.amazon.in/s?k=${encodeURIComponent(b.title)}&i=stripbooks${tag ? `&tag=${tag}` : ''}`;
    const links: BuyLink[] = [
      {
        retailer: 'amazon',
        label: 'Amazon India',
        url: stored.get('amazon')?.url ?? amazonUrl,
        priceInr: stored.get('amazon')?.lastPriceInr ?? null,
        affiliate: Boolean(tag),
      },
      {
        retailer: 'flipkart',
        label: 'Flipkart',
        url: stored.get('flipkart')?.url ?? `https://www.flipkart.com/search?q=${encodeURIComponent(isbn13 ?? b.title)}`,
        priceInr: stored.get('flipkart')?.lastPriceInr ?? null,
        affiliate: false,
      },
    ];
    for (const l of b.links) {
      if (l.retailer === 'amazon' || l.retailer === 'flipkart') continue;
      links.push({ retailer: l.retailer, label: l.retailer, url: l.url, priceInr: l.lastPriceInr, affiliate: false });
    }
    return links;
  }

  // ---------- Reading status ----------

  async setStatus(userId: string, bookId: string, input: ReadingStatusInput): Promise<MyReadingStatus> {
    const book = await this.prisma.book.findUnique({ where: { id: bookId } });
    if (!book || (book.status !== 'approved' && book.createdById !== userId)) throw notFound('Book');
    const existing = await this.prisma.readingStatus.findUnique({ where: { userId_bookId: { userId, bookId } } });
    const now = new Date();

    const data: Prisma.ReadingStatusUncheckedCreateInput = {
      userId,
      bookId,
      status: input.status as ReadingStatusValue,
      progressPct: input.progressPct ?? existing?.progressPct ?? 0,
      currentChapter: input.currentChapter ?? existing?.currentChapter ?? 0,
      rating: input.rating === undefined ? (existing?.rating ?? null) : input.rating,
      startedAt: existing?.startedAt ?? null,
      finishedAt: existing?.finishedAt ?? null,
    };
    if (input.status === 'reading' && !data.startedAt) data.startedAt = now;
    if (input.status === 'read') {
      data.progressPct = 100;
      data.finishedAt = existing?.status === 'read' ? (existing.finishedAt ?? now) : now;
      if (book.chapterCount) data.currentChapter = book.chapterCount;
    }
    if (input.status === 'reading' && input.currentChapter !== undefined && input.progressPct === undefined && book.chapterCount) {
      data.progressPct = Math.min(99, Math.round((input.currentChapter / book.chapterCount) * 100));
    }
    const rs = await this.prisma.readingStatus.upsert({
      where: { userId_bookId: { userId, bookId } },
      create: data,
      update: data,
    });
    return toMyStatus(rs);
  }

  async removeStatus(userId: string, bookId: string) {
    await this.prisma.readingStatus.deleteMany({ where: { userId, bookId } });
    return { ok: true };
  }

  async shelf(userId: string, status?: ReadingStatusValue): Promise<ShelfItem[]> {
    const rows = await this.prisma.readingStatus.findMany({
      where: { userId, ...(status ? { status } : {}) },
      include: { book: { include: bookInclude } },
      orderBy: { updatedAt: 'desc' },
      take: 500,
    });
    return rows.map((r) => ({ ...toMyStatus(r), book: toBookSummary(r.book), updatedAt: r.updatedAt.toISOString() }));
  }

  /**
   * Recompute aggregate counters per book and city (and '_all' for India-wide).
   * Runs every 15 minutes from the worker.
   */
  async recomputeStats() {
    await this.prisma.$transaction([
      this.prisma.$executeRaw`DELETE FROM book_stats`,
      this.prisma.$executeRaw`
        WITH readers AS (
          SELECT rs.book_id, COALESCE(u.city, '_none') AS city, COUNT(*)::int AS n
          FROM reading_status rs JOIN users u ON u.id = rs.user_id
          WHERE rs.status = 'reading' AND u.deleted_at IS NULL
          GROUP BY rs.book_id, COALESCE(u.city, '_none')
        ), club_reads AS (
          SELECT c.current_book_id AS book_id, COALESCE(c.city, '_none') AS city, COUNT(*)::int AS n
          FROM clubs c
          WHERE c.current_book_id IS NOT NULL AND c.deleted_at IS NULL
          GROUP BY 1, 2
        ), per_city AS (
          SELECT COALESCE(r.book_id, c.book_id) AS book_id, COALESCE(r.city, c.city) AS city,
                 COALESCE(r.n, 0) AS readers, COALESCE(c.n, 0) AS clubs
          FROM readers r FULL OUTER JOIN club_reads c ON r.book_id = c.book_id AND r.city = c.city
        )
        INSERT INTO book_stats (book_id, city, reading_count, clubs_reading_count, updated_at)
        SELECT book_id, city, readers, clubs, now() FROM per_city WHERE city <> '_none'
        UNION ALL
        SELECT book_id, '_all', SUM(readers)::int, SUM(clubs)::int, now() FROM per_city GROUP BY book_id`,
    ]);
    this.logger.debug('Book stats recomputed');
  }

  async popularIn(city: string | null, limit: number) {
    const rows = await this.prisma.bookStat.findMany({
      where: { city: city ?? '_all', book: { status: 'approved' } },
      orderBy: [{ readingCount: 'desc' }, { clubsReadingCount: 'desc' }],
      include: { book: { include: bookInclude } },
      take: limit,
    });
    return rows.map((r) => ({
      book: toBookSummary(r.book),
      readingCount: r.readingCount >= MIN_PUBLIC_COUNT ? r.readingCount : null,
      fewReaders: r.readingCount > 0 && r.readingCount < MIN_PUBLIC_COUNT,
      clubsReadingCount: r.clubsReadingCount,
    }));
  }
}
