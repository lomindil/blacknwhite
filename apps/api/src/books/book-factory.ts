import { BookSource, BookStatus, Prisma, PrismaClient } from '@prisma/client';

type Db = PrismaClient | Prisma.TransactionClient;

export interface NewBook {
  title: string;
  subtitle?: string | null;
  authors: string[];
  authorsNative?: string[];
  language?: string;
  description?: string | null;
  coverUrl?: string | null;
  pageCount?: number | null;
  chapterCount?: number | null;
  publishedYear?: number | null;
  publisher?: string | null;
  isbn13s?: string[];
  isbn10s?: string[];
  source: BookSource;
  externalId?: string | null;
  status?: BookStatus;
  createdById?: string | null;
}

export function normalizeIsbn(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.replace(/[^0-9Xx]/g, '').toUpperCase();
  return s.length === 10 || s.length === 13 ? s : null;
}

export function isbn13to10(isbn13: string): string | null {
  if (!/^978\d{10}$/.test(isbn13)) return null;
  const core = isbn13.slice(3, 12);
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += (10 - i) * Number(core[i]);
  const check = (11 - (sum % 11)) % 11;
  return core + (check === 10 ? 'X' : String(check));
}

export async function findBookByIsbn(db: Db, isbns: (string | null | undefined)[]): Promise<string | null> {
  const list = isbns.map(normalizeIsbn).filter((s): s is string => Boolean(s));
  if (!list.length) return null;
  const ed = await db.bookEdition.findFirst({
    where: { OR: [{ isbn13: { in: list } }, { isbn10: { in: list } }] },
    select: { bookId: true },
  });
  return ed?.bookId ?? null;
}

async function authorId(db: Db, name: string, nameNative?: string): Promise<string> {
  const existing = await db.author.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } });
  if (existing) {
    if (nameNative && !existing.nameNative) await db.author.update({ where: { id: existing.id }, data: { nameNative } });
    return existing.id;
  }
  return (await db.author.create({ data: { name, nameNative: nameNative || null } })).id;
}

/** Creates a book with its authors and editions, skipping ISBNs another book already owns. */
export async function createBook(db: Db, d: NewBook): Promise<string> {
  const book = await db.book.create({
    data: {
      title: d.title.slice(0, 300),
      subtitle: d.subtitle?.slice(0, 300) || null,
      language: d.language ?? 'en',
      description: d.description ?? null,
      coverUrl: d.coverUrl ?? null,
      pageCount: d.pageCount ?? null,
      chapterCount: d.chapterCount ?? null,
      publishedYear: d.publishedYear ?? null,
      source: d.source,
      externalId: d.externalId ?? null,
      status: d.status ?? 'approved',
      createdById: d.createdById ?? null,
    },
  });

  const names = d.authors.filter(Boolean).slice(0, 10);
  // No try/catch inside a transaction: a failed statement aborts it, so dedupe up front.
  const linked = new Set<string>();
  for (let i = 0; i < names.length; i++) {
    const id = await authorId(db, names[i], d.authorsNative?.[i]);
    if (linked.has(id)) continue;
    linked.add(id);
    await db.bookAuthor.create({ data: { bookId: book.id, authorId: id, position: i } });
  }

  const isbn13s = [...new Set((d.isbn13s ?? []).map(normalizeIsbn).filter((s): s is string => s?.length === 13))].slice(0, 3);
  const isbn10s = [...new Set((d.isbn10s ?? []).map(normalizeIsbn).filter((s): s is string => s?.length === 10))];
  for (const i13 of isbn13s) {
    const i10 = isbn13to10(i13);
    const taken = await db.bookEdition.findFirst({
      where: { OR: [{ isbn13: i13 }, ...(i10 ? [{ isbn10: i10 }] : [])] },
    });
    if (taken) continue;
    await db.bookEdition.create({
      data: { bookId: book.id, isbn13: i13, isbn10: i10, publisher: d.publisher ?? null, language: d.language ?? null },
    });
  }
  if (!isbn13s.length) {
    for (const i10 of isbn10s.slice(0, 2)) {
      const taken = await db.bookEdition.findFirst({ where: { isbn10: i10 } });
      if (taken) continue;
      await db.bookEdition.create({ data: { bookId: book.id, isbn10: i10, publisher: d.publisher ?? null } });
    }
  }
  return book.id;
}
