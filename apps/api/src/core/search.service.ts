import { Injectable, Logger } from '@nestjs/common';
import { env } from '../config/env';
import { PrismaService } from './prisma.service';

/**
 * Meilisearch over its REST API. Every search method returns null when Meilisearch is
 * unavailable, and callers fall back to Postgres (see docs/architecture.md §7.1).
 */
@Injectable()
export class SearchService {
  private readonly logger = new Logger('Search');

  constructor(private readonly prisma: PrismaService) {}

  get enabled() {
    return Boolean(env().MEILI_URL);
  }

  private async request<T = any>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${env().MEILI_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(env().MEILI_KEY ? { Authorization: `Bearer ${env().MEILI_KEY}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok && res.status !== 404) {
      throw new Error(`Meilisearch ${method} ${path} → ${res.status} ${await res.text()}`);
    }
    return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
  }

  async setup() {
    if (!this.enabled) return;
    try {
      await this.request('POST', '/indexes', { uid: 'books', primaryKey: 'id' }).catch(() => undefined);
      await this.request('POST', '/indexes', { uid: 'clubs', primaryKey: 'id' }).catch(() => undefined);
      await this.request('PATCH', '/indexes/books/settings', {
        searchableAttributes: ['title', 'authors', 'authorsNative', 'subtitle', 'isbns'],
        filterableAttributes: ['language'],
      });
      await this.request('PATCH', '/indexes/clubs/settings', {
        searchableAttributes: ['name', 'description', 'bookTitle'],
        filterableAttributes: ['city', 'language'],
      });
    } catch (e) {
      this.logger.warn(`Search setup failed: ${(e as Error).message}`);
    }
  }

  async indexBook(id: string) {
    if (!this.enabled) return;
    const b = await this.prisma.book.findUnique({
      where: { id },
      include: { authors: { include: { author: true } }, editions: true },
    });
    if (!b || b.status !== 'approved') {
      await this.request('DELETE', `/indexes/books/documents/${id}`);
      return;
    }
    await this.request('POST', '/indexes/books/documents', [
      {
        id: b.id,
        title: b.title,
        subtitle: b.subtitle,
        language: b.language,
        authors: b.authors.map((a) => a.author.name),
        authorsNative: b.authors.map((a) => a.author.nameNative).filter(Boolean),
        isbns: b.editions.flatMap((e) => [e.isbn13, e.isbn10]).filter(Boolean),
      },
    ]);
  }

  async indexClub(id: string) {
    if (!this.enabled) return;
    const c = await this.prisma.club.findUnique({ where: { id }, include: { currentBook: true } });
    if (!c || c.deletedAt || c.visibility !== 'public') {
      await this.request('DELETE', `/indexes/clubs/documents/${id}`);
      return;
    }
    await this.request('POST', '/indexes/clubs/documents', [
      {
        id: c.id,
        name: c.name,
        description: c.description,
        city: c.city,
        language: c.language,
        bookTitle: c.currentBook?.title ?? null,
      },
    ]);
  }

  async searchBooks(q: string, opts: { language?: string; limit: number }): Promise<string[] | null> {
    if (!this.enabled) return null;
    try {
      const res = await this.request<{ hits: { id: string }[] }>('POST', '/indexes/books/search', {
        q,
        limit: opts.limit,
        filter: opts.language ? [`language = "${opts.language}"`] : undefined,
        attributesToRetrieve: ['id'],
      });
      return res.hits.map((h) => h.id);
    } catch (e) {
      this.logger.warn(`Book search fell back to Postgres: ${(e as Error).message}`);
      return null;
    }
  }

  async searchClubs(q: string, opts: { city?: string; language?: string; limit: number }): Promise<string[] | null> {
    if (!this.enabled) return null;
    try {
      const filter = [opts.city && `city = "${opts.city}"`, opts.language && `language = "${opts.language}"`].filter(
        Boolean,
      );
      const res = await this.request<{ hits: { id: string }[] }>('POST', '/indexes/clubs/search', {
        q,
        limit: opts.limit,
        filter: filter.length ? filter : undefined,
        attributesToRetrieve: ['id'],
      });
      return res.hits.map((h) => h.id);
    } catch (e) {
      this.logger.warn(`Club search fell back to Postgres: ${(e as Error).message}`);
      return null;
    }
  }

  async reindexAll() {
    if (!this.enabled) return;
    await this.setup();
    const books = await this.prisma.book.findMany({ where: { status: 'approved' }, select: { id: true } });
    for (const b of books) await this.indexBook(b.id);
    const clubs = await this.prisma.club.findMany({ select: { id: true } });
    for (const c of clubs) await this.indexClub(c.id);
    this.logger.log(`Reindexed ${books.length} books and ${clubs.length} clubs`);
  }
}
