import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../core/prisma.service';
import { QueueService } from '../core/queue.service';
import { createBook, findBookByIsbn, NewBook } from './book-factory';

// Open Library uses 3-letter language codes.
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
    const fields = 'key,title,subtitle,author_name,first_publish_year,isbn,cover_i,language,number_of_pages_median,publisher';
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
        isbn13s: isbns.filter((i) => i.length === 13),
        isbn10s: isbns.filter((i) => i.length === 10),
        source: 'openlibrary',
        externalId: `ol:${d.key}`,
      });
      if (id) ids.push(id);
    }
    return ids;
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
      return id;
    } catch (e) {
      this.logger.warn(`Could not save "${d.title}": ${(e as Error).message}`);
      return null;
    }
  }
}
