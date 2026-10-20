import { bookstoreListQuery, createBookstoreSchema, slugify } from '@bnw/shared';
import type { BookstoreDetail, BookstoreSummary, CreateBookstoreInput } from '@bnw/shared';
import { Controller, Get, Injectable, Module, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { Bookstore } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { forbidden, notFound } from '../common/errors';
import { AdminOnly, AuthUser, CurrentUser, Public, ZBody, ZQuery } from '../common/http';
import { eventSummaryInclude, toEventSummary, visibleEventsWhere } from '../common/mappers';
import { PrismaService } from '../core/prisma.service';

const updateBookstoreSchema = createBookstoreSchema.partial().extend({
  claimedByEmail: z.string().email().nullable().optional(),
});

function toSummary(b: Bookstore): BookstoreSummary {
  return { id: b.id, name: b.name, slug: b.slug, area: b.area, city: b.city, secondhand: b.secondhand, languages: b.languages };
}

/** Bookstore directory: basic listings, no stock data in Phase 1. */
@Injectable()
export class BookstoresService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: z.infer<typeof bookstoreListQuery>): Promise<BookstoreSummary[]> {
    const rows = await this.prisma.bookstore.findMany({
      where: {
        ...(q.city ? { city: q.city } : {}),
        ...(q.area ? { area: { contains: q.area, mode: 'insensitive' } } : {}),
        ...(q.q ? { name: { contains: q.q, mode: 'insensitive' } } : {}),
      },
      orderBy: [{ city: 'asc' }, { name: 'asc' }],
      take: 200,
    });
    return rows.map(toSummary);
  }

  async mine(userId: string): Promise<BookstoreSummary[]> {
    const rows = await this.prisma.bookstore.findMany({ where: { claimedById: userId }, orderBy: { name: 'asc' } });
    return rows.map(toSummary);
  }

  async get(slugOrId: string, user?: AuthUser): Promise<BookstoreDetail> {
    const isUuid = /^[0-9a-f-]{36}$/i.test(slugOrId);
    const b = await this.prisma.bookstore.findFirst({ where: isUuid ? { id: slugOrId } : { slug: slugOrId } });
    if (!b) throw notFound('Bookstore');
    const events = await this.prisma.event.findMany({
      where: { AND: [visibleEventsWhere(user?.id), { bookstoreId: b.id, startsAt: { gte: new Date() }, cancelledAt: null }] },
      include: eventSummaryInclude,
      orderBy: { startsAt: 'asc' },
      take: 10,
    });
    return {
      ...toSummary(b),
      description: b.description,
      address: b.address,
      lat: b.lat,
      lng: b.lng,
      phone: b.phone,
      website: b.website,
      hours: b.hours,
      upcomingEvents: events.map(toEventSummary),
      canManage: Boolean(user && (user.isAdmin || b.claimedById === user.id)),
    };
  }

  async create(input: CreateBookstoreInput, user: AuthUser): Promise<BookstoreDetail> {
    let slug = slugify(`${input.name}-${input.city}`);
    if (await this.prisma.bookstore.findUnique({ where: { slug } })) slug = `${slug}-${randomBytes(2).toString('hex')}`;
    const b = await this.prisma.bookstore.create({ data: { ...input, languages: input.languages ?? [], slug } });
    return this.get(b.id, user);
  }

  async update(id: string, input: z.infer<typeof updateBookstoreSchema>, user: AuthUser): Promise<BookstoreDetail> {
    const b = await this.prisma.bookstore.findUnique({ where: { id } });
    if (!b) throw notFound('Bookstore');
    if (!user.isAdmin && b.claimedById !== user.id) throw forbidden('Only the bookstore owner can edit this listing');
    const { claimedByEmail, ...data } = input;
    let claimedById: string | null | undefined;
    if (claimedByEmail !== undefined) {
      if (!user.isAdmin) throw forbidden('Only admins can assign a bookstore owner');
      claimedById = claimedByEmail
        ? ((await this.prisma.user.findUnique({ where: { email: claimedByEmail.toLowerCase() } }))?.id ?? null)
        : null;
      if (claimedByEmail && !claimedById) throw notFound('User with that email');
    }
    await this.prisma.bookstore.update({ where: { id }, data: { ...data, ...(claimedById !== undefined ? { claimedById } : {}) } });
    return this.get(id, user);
  }
}

@Controller('v1')
export class BookstoresController {
  constructor(private readonly bookstores: BookstoresService) {}

  @Get('me/bookstores')
  mine(@CurrentUser() user: AuthUser) {
    return this.bookstores.mine(user.id);
  }

  @Public()
  @Get('bookstores')
  list(@ZQuery(bookstoreListQuery) q: z.infer<typeof bookstoreListQuery>) {
    return this.bookstores.list(q);
  }

  @Public()
  @Get('bookstores/:slug')
  get(@Param('slug') slug: string, @CurrentUser() user?: AuthUser) {
    return this.bookstores.get(slug, user);
  }

  @AdminOnly()
  @Post('bookstores')
  create(@ZBody(createBookstoreSchema) body: CreateBookstoreInput, @CurrentUser() user: AuthUser) {
    return this.bookstores.create(body, user);
  }

  @Patch('bookstores/:id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @ZBody(updateBookstoreSchema) body: z.infer<typeof updateBookstoreSchema>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.bookstores.update(id, body, user);
  }
}

@Module({ controllers: [BookstoresController], providers: [BookstoresService], exports: [BookstoresService] })
export class BookstoresModule {}
