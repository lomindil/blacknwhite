import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { SEED_DESCRIPTIONS, SEED_GENRES, subjectsToGenres } from '../books/genres';

/**
 * Fills in genres for books that have none, without touching anything else:
 * pnpm --filter @bnw/api genres:backfill
 * Sample-catalog titles use the seed map; other books ask Open Library for their subjects.
 */
async function main() {
  const prisma = new PrismaClient();
  const books = await prisma.book.findMany({
    where: { genres: { isEmpty: true } },
    select: { id: true, title: true, authors: { include: { author: true }, orderBy: { position: 'asc' }, take: 1 } },
  });
  let updated = 0;
  for (const b of books) {
    let genres = SEED_GENRES[b.title] ?? [];
    if (!genres.length) {
      try {
        const q = new URLSearchParams({ title: b.title, limit: '1', fields: 'subject' });
        if (b.authors[0]) q.set('author', b.authors[0].author.name);
        const res = await fetch(`https://openlibrary.org/search.json?${q}`, {
          signal: AbortSignal.timeout(5000),
          headers: { 'User-Agent': 'BookClubPlatform/0.1 (dev)' },
        });
        if (res.ok) genres = subjectsToGenres(((await res.json()) as { docs: { subject?: string[] }[] }).docs[0]?.subject);
      } catch {
        // Offline or slow: leave this book for the next run.
      }
    }
    if (!genres.length) continue;
    await prisma.book.update({ where: { id: b.id }, data: { genres } });
    updated++;
  }
  console.log(`Genres set on ${updated} of ${books.length} books without genres.`);
  // Sample-catalog descriptions replace missing or poor ones from external sources.
  for (const [title, description] of Object.entries(SEED_DESCRIPTIONS)) {
    await prisma.book.updateMany({ where: { title, source: 'seed' }, data: { description } });
  }
  await prisma.$disconnect();
}

void main();
