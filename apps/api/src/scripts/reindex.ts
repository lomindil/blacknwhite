import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { CoreModule } from '../core/core.module';
import { SearchService } from '../core/search.service';

/** Rebuilds the Meilisearch indexes from Postgres: pnpm --filter @bnw/api search:reindex */
async function main() {
  const app = await NestFactory.createApplicationContext(CoreModule, { logger: ['log', 'warn', 'error'] });
  await app.get(SearchService).reindexAll();
  await app.close();
}

void main();
