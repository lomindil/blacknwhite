// Prisma includes and the functions that turn rows into API response shapes.
import type { BookSummary, ClubSummary, EventSummary, UserSummary } from '@bnw/shared';
import { Prisma } from '@prisma/client';
import { iso } from './http';

export const userSummarySelect = {
  id: true,
  displayName: true,
  avatarUrl: true,
  deletedAt: true,
} satisfies Prisma.UserSelect;

type UserSummaryRow = Prisma.UserGetPayload<{ select: typeof userSummarySelect }>;

export function toUserSummary(u: UserSummaryRow): UserSummary {
  if (u.deletedAt) return { id: u.id, displayName: 'Deleted user', avatarUrl: null };
  return { id: u.id, displayName: u.displayName, avatarUrl: u.avatarUrl };
}

export const bookInclude = {
  authors: { include: { author: true }, orderBy: { position: 'asc' } },
} satisfies Prisma.BookInclude;

export type BookRow = Prisma.BookGetPayload<{ include: typeof bookInclude }>;

export function toBookSummary(b: BookRow): BookSummary {
  return {
    id: b.id,
    title: b.title,
    subtitle: b.subtitle,
    authors: b.authors.map((a) => a.author.name),
    coverUrl: b.coverUrl,
    language: b.language,
    publishedYear: b.publishedYear,
  };
}

export const clubSummaryInclude = {
  currentBook: { include: bookInclude },
  _count: { select: { members: true } },
} satisfies Prisma.ClubInclude;

export type ClubSummaryRow = Prisma.ClubGetPayload<{ include: typeof clubSummaryInclude }>;

export function toClubSummary(c: ClubSummaryRow): ClubSummary {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    city: c.city,
    language: c.language,
    visibility: c.visibility,
    memberCount: c._count.members,
    currentBook: c.currentBook ? toBookSummary(c.currentBook) : null,
  };
}

export const eventSummaryInclude = {
  club: { select: { id: true, name: true, slug: true } },
  bookstore: { select: { id: true, name: true, slug: true } },
  _count: { select: { rsvps: { where: { status: 'going' } } } },
} satisfies Prisma.EventInclude;

export type EventSummaryRow = Prisma.EventGetPayload<{ include: typeof eventSummaryInclude }>;

export function toEventSummary(e: EventSummaryRow): EventSummary {
  return {
    id: e.id,
    title: e.title,
    startsAt: e.startsAt.toISOString(),
    endsAt: iso(e.endsAt),
    mode: e.mode,
    venueName: e.venueName,
    area: e.area,
    city: e.city,
    club: e.club,
    bookstore: e.bookstore,
    goingCount: e._count.rsvps,
    capacity: e.capacity,
    cancelled: Boolean(e.cancelledAt),
  };
}

/** Visibility filter for events: bookstore events and public-club events, plus clubs the user belongs to. */
export function visibleEventsWhere(userId?: string): Prisma.EventWhereInput {
  const or: Prisma.EventWhereInput[] = [
    { clubId: null },
    { club: { visibility: 'public', deletedAt: null } },
  ];
  if (userId) or.push({ club: { deletedAt: null, members: { some: { userId } } } });
  return { OR: or };
}
