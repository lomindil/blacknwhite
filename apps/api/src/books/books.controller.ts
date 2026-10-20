import { bookSearchQuery, createBookSchema, myBooksQuery, readingStatusSchema } from '@bnw/shared';
import type { CreateBookInput, ReadingStatusInput } from '@bnw/shared';
import { Controller, Delete, Get, Module, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { z } from 'zod';
import { AuthUser, CurrentUser, Public, ZBody, ZQuery } from '../common/http';
import { RedisService } from '../core/redis.service';
import { BooksService } from './books.service';
import { CatalogService } from './catalog.service';

@Controller('v1')
export class BooksController {
  constructor(
    private readonly books: BooksService,
    private readonly redis: RedisService,
  ) {}

  @Public()
  @Get('books/search')
  search(@ZQuery(bookSearchQuery) q: z.infer<typeof bookSearchQuery>) {
    return this.books.searchBooks(q.q, q.language, q.limit);
  }

  @Public()
  @Get('books/:id')
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user?: AuthUser) {
    return this.books.get(id, user);
  }

  @Public()
  @Get('books/:id/stats')
  stats(@Param('id', ParseUUIDPipe) id: string, @Query('city') city?: string, @CurrentUser() user?: AuthUser) {
    return this.books.stats(id, city || undefined, user?.id);
  }

  @Public()
  @Get('books/:id/buy-links')
  buyLinks(@Param('id', ParseUUIDPipe) id: string) {
    return this.books.buyLinks(id);
  }

  @Post('books')
  async create(@CurrentUser() user: AuthUser, @ZBody(createBookSchema) body: CreateBookInput) {
    await this.redis.rateLimit(`book:add:${user.id}`, 20, 24 * 3600, "You've added a lot of books today. Try again tomorrow.");
    return this.books.create(user, body);
  }

  @Put('me/books/:bookId')
  setStatus(
    @CurrentUser() user: AuthUser,
    @Param('bookId', ParseUUIDPipe) bookId: string,
    @ZBody(readingStatusSchema) body: ReadingStatusInput,
  ) {
    return this.books.setStatus(user.id, bookId, body);
  }

  @Delete('me/books/:bookId')
  removeStatus(@CurrentUser() user: AuthUser, @Param('bookId', ParseUUIDPipe) bookId: string) {
    return this.books.removeStatus(user.id, bookId);
  }

  @Get('me/books')
  shelf(@CurrentUser() user: AuthUser, @ZQuery(myBooksQuery) q: z.infer<typeof myBooksQuery>) {
    return this.books.shelf(user.id, q.status);
  }
}

@Module({
  controllers: [BooksController],
  providers: [BooksService, CatalogService],
  exports: [BooksService, CatalogService],
})
export class BooksModule {}
