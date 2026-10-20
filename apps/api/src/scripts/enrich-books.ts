import 'dotenv/config';
import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { CatalogService } from '../books/catalog.service';
import { CoreModule } from '../core/core.module';
import { PrismaService } from '../core/prisma.service';

@Module({ imports: [CoreModule], providers: [CatalogService] })
class EnrichModule {}

/**
 * Fetches descriptions, page counts, covers and genres for books that were never enriched:
 * pnpm --filter @bnw/api books:enrich
 * Only empty fields are filled; books added by hand are left alone.
 */
async function main() {
  const app = await NestFactory.createApplicationContext(EnrichModule, { logger: ['warn', 'error'] });
  const prisma = app.get(PrismaService);
  const catalog = app.get(CatalogService);
  const books = await prisma.book.findMany({ where: { enrichedAt: null, source: { not: 'user' } }, select: { id: true, title: true } });
  let done = 0;
  for (const b of books) {
    if (await catalog.enrich(b.id)) done++;
    // Be polite to Open Library.
    await new Promise((r) => setTimeout(r, 300));
  }
  const missing = await prisma.book.count({ where: { description: null } });
  console.log(`Enriched ${done} of ${books.length} books. ${missing} still have no description.`);
  await app.close();
}

void main();
