import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../core/prisma.service';
import { QueueService } from '../core/queue.service';
import { createBook, findBookByIsbn, NewBook } from './book-factory';
import { subjectsToGenres } from './genres';

// Open Library uses 3-letter language codes.
const UA = { 'User-Agent': 'BookClubPlatform/0.1 (dev)' };

async function getJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url, { signal: AbortSignal.timeout(5000), headers: UA });
  return res.ok ? ((await res.json()) as T) : null;
}

/** Open Library descriptions come as a string or { value }, often with a trailing source note. */
function cleanDescription(d: unknown): string | null {
  const text = typeof d === 'string' ? d : (d as { value?: string } | null)?.value;
  if (!text) return null;
  const cut = text.split(/\n-{3,}|\(\[source\]|\[source\]/i)[0];
  const plain = cut.replace(/<[^>]+>/g, '').replace(/\r/g, '').trim();
  return plain.length >= 40 ? plain.slice(0, 4000) : null;
}

const OL_LANG: Record<string, string> = {
  eng: 'en', hin: 'hi', ben: 'bn', tam: 'ta', tel: 'te', kan: 'kn', mal: 'ml', mar: 'mr',
  guj: 'gu', pan: 'pa', urd: 'ur', ori: 'or', asm: 'as', san: 'sa', kok: 'kok',
};

/**
 * On-demand catalog seeding from Open Library, with Google Books as a fallback.
 * Results are saved into our own books table so we never depend on one source.
 */
@Injectable()
export class CatalogService {
  private readonly logger = new Logger('Catalog');

  constructor(
    private readonly prisma: PrismaService,
    private readonly queues: QueueService,
  ) {}

  /** Look up `q` externally, save new books, return their ids. Never throws. */
  async lookup(q: string): Promise<string[]> {
    try {
      const fromOl = await this.openLibrary(q);
      if (fromOl.length) return fromOl;
      return await this.googleBooks(q);
    } catch (e) {
      this.logger.warn(`External lookup failed for "${q}": ${(e as Error).message}`);
      return [];
    }
  }

  private async openLibrary(q: string): Promise<string[]> {
    const fields = 'key,title,subtitle,author_name,first_publish_year,isbn,cover_i,language,number_of_pages_median,publisher,subject';
    const res = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=8&fields=${fields}`,
      { signal: AbortSignal.timeout(4000), headers: { 'User-Agent': 'BookClubPlatform/0.1 (dev)' } },
    );
    if (!res.ok) return [];
    const json = (await res.json()) as { docs: any[] };
    const ids: string[] = [];
    for (const d of json.docs ?? []) {
      if (!d.title || !d.author_name?.length) continue;
      const isbns: string[] = (d.isbn ?? []).slice(0, 30);
      const lang = OL_LANG[(d.language ?? [])[0]] ?? 'en';
      const id = await this.save({
        title: d.title,
        subtitle: d.subtitle ?? null,
        authors: d.author_name.slice(0, 5),
        language: lang,
        coverUrl: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : null,
        pageCount: d.number_of_pages_median ?? null,
        publishedYear: d.first_publish_year ?? null,
        publisher: d.publisher?.[0] ?? null,
        genres: subjectsToGenres(d.subject),
        isbn13s: isbns.filter((i) => i.length === 13),
        isbn10s: isbns.filter((i) => i.length === 10),
        source: 'openlibrary',
        externalId: `ol:${d.key}`,
      });
      if (id) ids.push(id);
    }
    return ids;
  }

  /**
   * Fills in what search results leave out — description, page count, cover, year, genres —
   * from the Open Library work record, then Google Books. Only empty fields are written.
   * Returns false when the sources couldn't be reached (so it's retried later).
   */
  async enrich(bookId: string): Promise<boolean> {
    const b = await this.prisma.book.findUnique({
      where: { id: bookId },
      include: { authors: { include: { author: true }, orderBy: { position: 'asc' }, take: 1 }, editions: true },
    });
    if (!b) return true;
    const author = b.authors[0]?.author.name;
    const found: { description?: string | null; pageCount?: number | null; coverUrl?: string | null; publishedYear?: number | null; subjects: string[] } = { subjects: [] };
    try {
      // 1. Open Library work: from our external id, or by title + author.
      let workKey = b.externalId?.startsWith('ol:/works/') ? b.externalId.slice(3) : null;
      if (!workKey) {
        const q = new URLSearchParams({ title: b.title, limit: '1', fields: 'key,number_of_pages_median,cover_i,first_publish_year,subject' });
        if (author) q.set('author', author);
        const hit = (await getJson<{ docs: any[] }>(`https://openlibrary.org/search.json?${q}`))?.docs?.[0];
        if (hit) {
          workKey = hit.key;
          found.pageCount = hit.number_of_pages_median ?? null;
          found.coverUrl = hit.cover_i ? `https://covers.openlibrary.org/b/id/${hit.cover_i}-M.jpg` : null;
          found.publishedYear = hit.first_publish_year ?? null;
          found.subjects.push(...(hit.subject ?? []));
        }
      }
      if (workKey) {
        const work = await getJson<{ description?: unknown; subjects?: string[]; covers?: number[] }>(`https://openlibrary.org${workKey}.json`);
        found.description = cleanDescription(work?.description);
        found.subjects.push(...(work?.subjects ?? []));
        if (!found.coverUrl && work?.covers?.[0] && work.covers[0] > 0) found.coverUrl = `https://covers.openlibrary.org/b/id/${work.covers[0]}-M.jpg`;
      }
      // 2. Google Books for whatever is still missing.
      if (!(b.description ?? found.description) || !(b.pageCount ?? found.pageCount)) {
        const isbn = b.editions.map((e) => e.isbn13 ?? e.isbn10).find(Boolean);
        const q = isbn ? `isbn:${isbn}` : `intitle:${b.title}${author ? ` inauthor:${author}` : ''}`;
        const v = (await getJson<{ items?: any[] }>(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=1`))?.items?.[0]?.volumeInfo;
        if (v) {
          found.description ??= cleanDescription(v.description);
          found.pageCount ??= v.pageCount ?? null;
          found.coverUrl ??= v.imageLinks?.thumbnail?.replace('http://', 'https://') ?? null;
          found.subjects.push(...(v.categories ?? []));
        }
      }
    } catch (e) {
      this.logger.warn(`Could not enrich "${b.title}": ${(e as Error).message}`);
      return false;
    }
    const genres = b.genres.length ? b.genres : subjectsToGenres(found.subjects);
    await this.prisma.book.update({
      where: { id: b.id },
      data: {
        enrichedAt: new Date(),
        description: b.description ?? found.description ?? null,
        pageCount: b.pageCount ?? found.pageCount ?? null,
        coverUrl: b.coverUrl ?? found.coverUrl ?? null,
        publishedYear: b.publishedYear ?? found.publishedYear ?? null,
        genres,
      },
    });
    if (genres !== b.genres || !b.coverUrl) await this.queues.add('search', 'book', { id: b.id });
    return true;
  }

  private async googleBooks(q: string): Promise<string[]> {
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=8`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { items?: any[] };
    const ids: string[] = [];
    for (const item of json.items ?? []) {
      const v = item.volumeInfo ?? {};
      if (!v.title || !v.authors?.length) continue;
      const isbn = (type: string) =>
        (v.industryIdentifiers ?? []).filter((i: any) => i.type === type).map((i: any) => i.identifier as string);
      const id = await this.save({
        title: v.title,
        subtitle: v.subtitle ?? null,
        authors: v.authors.slice(0, 5),
        language: (v.language ?? 'en').slice(0, 3),
        description: v.description ?? null,
        coverUrl: v.imageLinks?.thumbnail?.replace('http://', 'https://') ?? null,
        pageCount: v.pageCount ?? null,
        publishedYear: v.publishedDate ? Number(String(v.publishedDate).slice(0, 4)) || null : null,
        publisher: v.publisher ?? null,
        genres: subjectsToGenres(v.categories),
        isbn13s: isbn('ISBN_13'),
        isbn10s: isbn('ISBN_10'),
        source: 'google',
        externalId: `gb:${item.id}`,
      });
      if (id) ids.push(id);
    }
    return ids;
  }

  private async save(d: NewBook): Promise<string | null> {
    try {
      if (d.externalId) {
        const known = await this.prisma.book.findUnique({ where: { externalId: d.externalId }, select: { id: true } });
        if (known) return known.id;
      }
      const byIsbn = await findBookByIsbn(this.prisma, [...(d.isbn13s ?? []), ...(d.isbn10s ?? [])]);
      if (byIsbn) return byIsbn;
      // Same work already in the catalog without matching ISBNs (seeded, imported or user-added).
      const byTitle = await this.prisma.book.findFirst({
        where: {
          title: { equals: d.title.trim(), mode: 'insensitive' },
          authors: { some: { author: { name: { equals: d.authors[0], mode: 'insensitive' } } } },
        },
        select: { id: true },
      });
      if (byTitle) return byTitle.id;
      const id = await this.prisma.$transaction((tx) => createBook(tx, d));
      await this.queues.add('search', 'book', { id });
      await this.queues.add('search', 'enrich', { id }, { jobId: `enrich-${id}` });
      return id;
    } catch (e) {
      this.logger.warn(`Could not save "${d.title}": ${(e as Error).message}`);
      return null;
    }
  }
}
