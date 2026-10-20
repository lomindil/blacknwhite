import type { ImportJobInfo } from '@bnw/shared';
import { Injectable, Logger } from '@nestjs/common';
import { ImportJob, ImportSource, ReadingStatusValue } from '@prisma/client';
import { parse } from 'csv-parse/sync';
import { badRequest, notFound } from '../common/errors';
import { iso } from '../common/http';
import { createBook, findBookByIsbn, normalizeIsbn } from '../books/book-factory';
import { NotificationsService } from '../core/notifications.service';
import { PrismaService } from '../core/prisma.service';
import { QueueService } from '../core/queue.service';

interface ImportRow {
  title: string;
  authors: string[];
  isbn13: string | null;
  isbn10: string | null;
  status: ReadingStatusValue | null;
  skipReason?: string;
  rating: number | null;
  finishedAt: Date | null;
  startedAt: Date | null;
  pageCount: number | null;
  publishedYear: number | null;
  publisher: string | null;
}

export interface ImportJobData {
  importJobId: string;
  csv: string;
}

const MAX_UNMATCHED = 200;

function clean(v: string | undefined): string {
  // Goodreads wraps ISBNs as ="0743273567".
  return (v ?? '').replace(/^="?|"$/g, '').trim();
}

function parseDate(v: string | undefined): Date | null {
  const s = clean(v);
  if (!s) return null;
  const d = new Date(s.replace(/\//g, '-'));
  return Number.isNaN(d.getTime()) ? null : d;
}

function num(v: string | undefined): number | null {
  const n = Number(clean(v));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function detectSource(headers: string[]): ImportSource | null {
  if (headers.includes('Exclusive Shelf') || headers.includes('Bookshelves')) return 'goodreads';
  if (headers.includes('Read Status') || headers.includes('ISBN/UID')) return 'storygraph';
  return null;
}

export function mapRow(source: ImportSource, r: Record<string, string>): ImportRow {
  if (source === 'goodreads') {
    const shelf = clean(r['Exclusive Shelf']);
    const status: ReadingStatusValue =
      shelf === 'read' ? 'read' : shelf === 'currently-reading' ? 'reading' : 'want';
    const extra = clean(r['Additional Authors'])
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return {
      title: clean(r['Title']),
      authors: [clean(r['Author']), ...extra].filter(Boolean),
      isbn13: normalizeIsbn(clean(r['ISBN13'])),
      isbn10: normalizeIsbn(clean(r['ISBN'])),
      status,
      rating: num(r['My Rating']),
      finishedAt: status === 'read' ? parseDate(r['Date Read']) : null,
      startedAt: null,
      pageCount: num(r['Number of Pages']),
      publishedYear: num(r['Original Publication Year']) ?? num(r['Year Published']),
      publisher: clean(r['Publisher']) || null,
    };
  }
  const readStatus = clean(r['Read Status']);
  const status: ReadingStatusValue | null =
    readStatus === 'read' ? 'read' : readStatus === 'currently-reading' ? 'reading' : readStatus === 'to-read' ? 'want' : null;
  const isbn = normalizeIsbn(clean(r['ISBN/UID']));
  const rating = num(r['Star Rating']);
  return {
    title: clean(r['Title']),
    authors: clean(r['Authors'])
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    isbn13: isbn?.length === 13 ? isbn : null,
    isbn10: isbn?.length === 10 ? isbn : null,
    status,
    skipReason: status ? undefined : readStatus === 'did-not-finish' ? 'Did not finish — skipped' : `Unknown status "${readStatus}"`,
    rating: rating ? Math.min(5, Math.max(1, Math.round(rating))) : null,
    finishedAt: status === 'read' ? parseDate(r['Last Date Read']) : null,
    startedAt: null,
    pageCount: null,
    publishedYear: null,
    publisher: null,
  };
}

export function toImportInfo(j: ImportJob): ImportJobInfo {
  return {
    id: j.id,
    source: j.source,
    status: j.status,
    total: j.total,
    matched: j.matched,
    created: j.created,
    unmatched: (j.unmatched as ImportJobInfo['unmatched']) ?? [],
    error: j.error,
    createdAt: j.createdAt.toISOString(),
    finishedAt: iso(j.finishedAt),
  };
}

/** Goodreads / StoryGraph CSV import (docs/architecture.md §7.6). */
@Injectable()
export class ImportsService {
  private readonly logger = new Logger('Imports');

  constructor(
    private readonly prisma: PrismaService,
    private readonly queues: QueueService,
    private readonly notifications: NotificationsService,
  ) {}

  async start(userId: string, csv: string): Promise<ImportJobInfo> {
    const firstLine = csv.replace(/^﻿/, '').split(/\r?\n/, 1)[0] ?? '';
    const headers = parse(firstLine, { relax_quotes: true })[0] ?? [];
    const source = detectSource(headers);
    if (!source) throw badRequest("That doesn't look like a Goodreads or StoryGraph export CSV");
    const job = await this.prisma.importJob.create({ data: { userId, source } });
    await this.queues.add('imports', 'import', { importJobId: job.id, csv } satisfies ImportJobData, { attempts: 1 });
    return toImportInfo(job);
  }

  async get(userId: string, id: string): Promise<ImportJobInfo> {
    const job = await this.prisma.importJob.findFirst({ where: { id, userId } });
    if (!job) throw notFound('Import');
    return toImportInfo(job);
  }

  async list(userId: string): Promise<ImportJobInfo[]> {
    const jobs = await this.prisma.importJob.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 10 });
    return jobs.map(toImportInfo);
  }

  /** Runs in the worker. */
  async process({ importJobId, csv }: ImportJobData) {
    const job = await this.prisma.importJob.findUnique({ where: { id: importJobId } });
    if (!job || job.status === 'done') return;
    try {
      const records: Record<string, string>[] = parse(csv, {
        columns: true,
        skip_empty_lines: true,
        relax_column_count: true,
        relax_quotes: true,
        bom: true,
      });
      await this.prisma.importJob.update({ where: { id: job.id }, data: { status: 'processing', total: records.length } });

      let matched = 0;
      let created = 0;
      const unmatched: { row: number; title: string; reason: string }[] = [];

      for (let i = 0; i < records.length; i++) {
        const row = mapRow(job.source, records[i]);
        const rowNo = i + 2; // header is row 1
        try {
          if (!row.title) {
            unmatched.push({ row: rowNo, title: '(no title)', reason: 'Missing title' });
            continue;
          }
          if (!row.status) {
            unmatched.push({ row: rowNo, title: row.title, reason: row.skipReason ?? 'Unknown shelf' });
            continue;
          }
          let bookId = await findBookByIsbn(this.prisma, [row.isbn13, row.isbn10]);
          if (!bookId && row.authors[0]) {
            const byTitle = await this.prisma.book.findFirst({
              where: {
                title: { equals: row.title, mode: 'insensitive' },
                authors: { some: { author: { name: { equals: row.authors[0], mode: 'insensitive' } } } },
              },
              select: { id: true },
            });
            bookId = byTitle?.id ?? null;
          }
          if (bookId) {
            matched++;
          } else {
            if (!row.authors.length) {
              unmatched.push({ row: rowNo, title: row.title, reason: 'Missing author' });
              continue;
            }
            bookId = await this.prisma.$transaction((tx) =>
              createBook(tx, {
                title: row.title,
                authors: row.authors,
                isbn13s: row.isbn13 ? [row.isbn13] : [],
                isbn10s: row.isbn10 ? [row.isbn10] : [],
                pageCount: row.pageCount,
                publishedYear: row.publishedYear,
                publisher: row.publisher,
                source: 'import',
              }),
            );
            await this.queues.add('search', 'book', { id: bookId });
            created++;
          }

          const existing = await this.prisma.readingStatus.findUnique({
            where: { userId_bookId: { userId: job.userId, bookId } },
          });
          // Don't overwrite progress the reader already tracks here, except to mark a book finished.
          if (!existing || (row.status === 'read' && existing.status !== 'read')) {
            const data = {
              status: row.status,
              rating: row.rating ?? existing?.rating ?? null,
              progressPct: row.status === 'read' ? 100 : (existing?.progressPct ?? 0),
              finishedAt: row.finishedAt ?? (row.status === 'read' ? new Date() : null),
              startedAt: row.status === 'reading' ? (existing?.startedAt ?? new Date()) : (existing?.startedAt ?? null),
            };
            await this.prisma.readingStatus.upsert({
              where: { userId_bookId: { userId: job.userId, bookId } },
              create: { userId: job.userId, bookId, ...data },
              update: data,
            });
          }
        } catch (e) {
          unmatched.push({ row: rowNo, title: row.title || '(no title)', reason: (e as Error).message.slice(0, 120) });
        }
        if (i % 25 === 0) {
          await this.prisma.importJob.update({ where: { id: job.id }, data: { matched, created } });
        }
      }

      await this.prisma.importJob.update({
        where: { id: job.id },
        data: {
          status: 'done',
          matched,
          created,
          unmatched: unmatched.slice(0, MAX_UNMATCHED),
          finishedAt: new Date(),
        },
      });
      await this.notifications.notify([job.userId], {
        type: 'import_done',
        title: 'Your import is ready',
        body: `${matched + created} books added to your shelves${unmatched.length ? `, ${unmatched.length} rows need a look` : ''}.`,
        url: '/me/import',
      });
    } catch (e) {
      this.logger.error(`Import ${job.id} failed: ${(e as Error).message}`);
      await this.prisma.importJob.update({
        where: { id: job.id },
        data: { status: 'failed', error: 'We could not read that file', finishedAt: new Date() },
      });
    }
  }
}
