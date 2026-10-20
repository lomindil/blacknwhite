import type { CityPage, HomeFeed, Me, NotificationItem, PublicProfile, UpdateMeInput, UpdateSettingsInput } from '@bnw/shared';
import { cityName } from '@bnw/shared';
import { Injectable } from '@nestjs/common';
import { notFound } from '../common/errors';
import { AuthUser, iso, Paged, toPage } from '../common/http';
import { clubSummaryInclude, eventSummaryInclude, toClubSummary, toEventSummary, visibleEventsWhere } from '../common/mappers';
import { BooksService } from '../books/books.service';
import { AccessService } from '../core/access.service';
import { PrismaService } from '../core/prisma.service';
import { QueueService } from '../core/queue.service';
import { SessionService } from '../auth/session.service';
import { DmsService } from '../dms/dms.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly books: BooksService,
    private readonly dms: DmsService,
    private readonly sessions: SessionService,
    private readonly queues: QueueService,
  ) {}

  async me(userId: string): Promise<Me> {
    const u = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { settings: true } });
    const settings = u.settings ?? (await this.prisma.userSettings.create({ data: { userId } }));
    const [unreadNotifications, unreadMessages] = await Promise.all([
      this.prisma.notification.count({ where: { userId, readAt: null } }),
      this.dms.unreadCount(userId),
    ]);
    return {
      id: u.id,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      email: u.email,
      bio: u.bio,
      city: u.city,
      languages: u.languages,
      genres: u.genres,
      isAdmin: u.isAdmin,
      onboarded: Boolean(u.onboardedAt),
      createdAt: u.createdAt.toISOString(),
      settings: {
        notifyEmail: settings.notifyEmail,
        emailDigest: settings.emailDigest,
        notifyWhatsapp: settings.notifyWhatsapp,
        whatsappNumber: settings.whatsappNumber,
        dmPolicy: settings.dmPolicy,
      },
      unreadNotifications,
      unreadMessages,
    };
  }

  async updateMe(user: AuthUser, input: UpdateMeInput): Promise<Me> {
    const now = new Date();
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        displayName: input.displayName,
        bio: input.bio,
        city: input.city,
        languages: input.languages,
        genres: input.genres,
        ...(input.acceptTerms ? { termsAcceptedAt: now, onboardedAt: now } : {}),
      },
    });
    return this.me(user.id);
  }

  async updateSettings(user: AuthUser, input: UpdateSettingsInput): Promise<Me> {
    const current = await this.prisma.userSettings.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} });
    const number = input.whatsappNumber === undefined ? current.whatsappNumber : input.whatsappNumber;
    const wantsWhatsapp = input.notifyWhatsapp ?? current.notifyWhatsapp;
    await this.prisma.userSettings.update({
      where: { userId: user.id },
      data: {
        notifyEmail: input.notifyEmail,
        emailDigest: input.emailDigest,
        dmPolicy: input.dmPolicy,
        whatsappNumber: number,
        // WhatsApp only with explicit opt-in and a number; removing the number turns it off.
        notifyWhatsapp: Boolean(wantsWhatsapp && number),
        whatsappOptInAt: wantsWhatsapp && number ? (current.whatsappOptInAt ?? new Date()) : null,
      },
    });
    return this.me(user.id);
  }

  async profile(id: string, viewer?: AuthUser): Promise<PublicProfile> {
    const u = await this.prisma.user.findUnique({ where: { id } });
    if (!u || u.deletedAt) throw notFound('Reader');
    const clubs = await this.prisma.club.findMany({
      where: { deletedAt: null, members: { some: { userId: id } } },
      include: clubSummaryInclude,
    });
    const viewerClubIds = viewer
      ? new Set((await this.prisma.clubMember.findMany({ where: { userId: viewer.id }, select: { clubId: true } })).map((m) => m.clubId))
      : new Set<string>();
    const shared = clubs.filter((c) => viewerClubIds.has(c.id));
    const blockedByMe = viewer
      ? Boolean(await this.prisma.block.findUnique({ where: { blockerId_blockedId: { blockerId: viewer.id, blockedId: id } } }))
      : false;
    const canMessage = viewer ? (await this.access.dmEligibility(viewer.id, id)).ok : false;
    return {
      id: u.id,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      bio: u.bio,
      city: u.city,
      joinedAt: u.createdAt.toISOString(),
      clubs: clubs.filter((c) => c.visibility === 'public').map(toClubSummary),
      sharedClubs: shared.map(toClubSummary),
      canMessage,
      blockedByMe,
    };
  }

  /**
   * Self-serve deletion (DPDP Act): personal data removed, posts kept but anonymised,
   * memberships and shelves deleted, owned clubs handed to the next admin or member.
   */
  async deleteMe(user: AuthUser) {
    const owned = await this.prisma.club.findMany({ where: { ownerId: user.id, deletedAt: null } });
    for (const club of owned) {
      const heir = await this.prisma.clubMember.findFirst({
        where: { clubId: club.id, userId: { not: user.id } },
        orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
      });
      if (heir) {
        await this.prisma.$transaction([
          this.prisma.clubMember.update({ where: { clubId_userId: { clubId: club.id, userId: heir.userId } }, data: { role: 'owner' } }),
          this.prisma.club.update({ where: { id: club.id }, data: { ownerId: heir.userId } }),
        ]);
      } else {
        await this.prisma.club.update({ where: { id: club.id }, data: { deletedAt: new Date() } });
      }
      await this.queues.add('search', 'club', { id: club.id });
    }

    await this.prisma.$transaction([
      this.prisma.userIdentity.deleteMany({ where: { userId: user.id } }),
      this.prisma.readingStatus.deleteMany({ where: { userId: user.id } }),
      this.prisma.clubMember.deleteMany({ where: { userId: user.id } }),
      this.prisma.eventRsvp.deleteMany({ where: { userId: user.id } }),
      this.prisma.notification.deleteMany({ where: { userId: user.id } }),
      this.prisma.pollVote.deleteMany({ where: { userId: user.id } }),
      this.prisma.importJob.deleteMany({ where: { userId: user.id } }),
      this.prisma.block.deleteMany({ where: { OR: [{ blockerId: user.id }, { blockedId: user.id }] } }),
      this.prisma.userSettings.deleteMany({ where: { userId: user.id } }),
      this.prisma.dmMessage.updateMany({ where: { senderId: user.id }, data: { body: '', deletedAt: new Date() } }),
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          displayName: 'Deleted user',
          email: `deleted+${user.id}@invalid.local`,
          avatarUrl: null,
          bio: null,
          city: null,
          languages: [],
          genres: [],
          isAdmin: false,
          deletedAt: new Date(),
        },
      }),
    ]);
    await this.sessions.destroyAll(user.id);
    return { ok: true };
  }

  /** Data export on request: profile, shelves, posts, memberships. */
  async exportData(userId: string) {
    const [user, shelves, posts, memberships, rsvps] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { settings: true } }),
      this.prisma.readingStatus.findMany({ where: { userId }, include: { book: { select: { title: true } } } }),
      this.prisma.post.findMany({ where: { authorId: userId, deletedAt: null }, select: { id: true, body: true, createdAt: true, threadId: true } }),
      this.prisma.clubMember.findMany({ where: { userId }, include: { club: { select: { name: true, slug: true } } } }),
      this.prisma.eventRsvp.findMany({ where: { userId }, include: { event: { select: { title: true, startsAt: true } } } }),
    ]);
    return {
      exportedAt: new Date().toISOString(),
      profile: {
        displayName: user.displayName,
        email: user.email,
        city: user.city,
        languages: user.languages,
        genres: user.genres,
        bio: user.bio,
        createdAt: user.createdAt,
        settings: user.settings,
      },
      shelves: shelves.map((s) => ({ book: s.book.title, status: s.status, progressPct: s.progressPct, rating: s.rating, finishedAt: s.finishedAt })),
      posts,
      clubs: memberships.map((m) => ({ club: m.club.name, slug: m.club.slug, role: m.role, joinedAt: m.joinedAt })),
      rsvps: rsvps.map((r) => ({ event: r.event.title, startsAt: r.event.startsAt, status: r.status })),
    };
  }

  async blocks(userId: string) {
    const rows = await this.prisma.block.findMany({
      where: { blockerId: userId },
      include: { blocked: { select: { id: true, displayName: true, avatarUrl: true, deletedAt: true } } },
    });
    return rows.map((r) => ({ id: r.blocked.id, displayName: r.blocked.displayName, avatarUrl: r.blocked.avatarUrl, blockedAt: r.createdAt.toISOString() }));
  }

  // ---------- Home and city pages ----------

  async home(user: AuthUser): Promise<HomeFeed> {
    const me = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    const [clubs, reading, events, popular, suggested] = await Promise.all([
      this.prisma.club.findMany({
        where: { deletedAt: null, members: { some: { userId: user.id } } },
        include: clubSummaryInclude,
        orderBy: { updatedAt: 'desc' },
      }),
      this.books.shelf(user.id, 'reading'),
      this.prisma.event.findMany({
        where: {
          AND: [
            visibleEventsWhere(user.id),
            { startsAt: { gte: new Date() }, cancelledAt: null },
            {
              OR: [
                { club: { members: { some: { userId: user.id } } } },
                { rsvps: { some: { userId: user.id, status: { in: ['going', 'maybe', 'waitlist'] } } } },
                ...(me.city ? [{ city: me.city }] : []),
              ],
            },
          ],
        },
        include: eventSummaryInclude,
        orderBy: { startsAt: 'asc' },
        take: 6,
      }),
      this.books.popularIn(me.city, 6),
      this.prisma.club.findMany({
        where: {
          deletedAt: null,
          visibility: 'public',
          members: { none: { userId: user.id } },
          ...(me.city ? { city: me.city } : {}),
          ...(me.languages.length ? { language: { in: me.languages } } : {}),
        },
        include: clubSummaryInclude,
        orderBy: { members: { _count: 'desc' } },
        take: 6,
      }),
    ]);
    return {
      clubs: clubs.map(toClubSummary),
      reading,
      upcomingEvents: events.map(toEventSummary),
      popularInCity: popular,
      suggestedClubs: suggested.map(toClubSummary),
    };
  }

  async city(slug: string, userId?: string): Promise<CityPage> {
    const [clubs, events, bookstores, popularBooks] = await Promise.all([
      this.prisma.club.findMany({
        where: { city: slug, deletedAt: null, visibility: 'public' },
        include: clubSummaryInclude,
        orderBy: { members: { _count: 'desc' } },
        take: 24,
      }),
      this.prisma.event.findMany({
        where: { AND: [visibleEventsWhere(userId), { city: slug, startsAt: { gte: new Date() }, cancelledAt: null }] },
        include: eventSummaryInclude,
        orderBy: { startsAt: 'asc' },
        take: 12,
      }),
      this.prisma.bookstore.findMany({ where: { city: slug }, orderBy: { name: 'asc' }, take: 24 }),
      this.books.popularIn(slug, 8),
    ]);
    return {
      city: slug,
      name: cityName(slug),
      clubs: clubs.map(toClubSummary),
      events: events.map(toEventSummary),
      bookstores: bookstores.map((b) => ({ id: b.id, name: b.name, slug: b.slug, area: b.area, city: b.city, secondhand: b.secondhand, languages: b.languages })),
      popularBooks,
    };
  }

  /** Cities that have at least one public club, event or bookstore — for the city index. */
  async activeCities() {
    const rows = await this.prisma.$queryRaw<{ city: string; clubs: number; bookstores: number }[]>`
      SELECT city, SUM(clubs)::int AS clubs, SUM(bookstores)::int AS bookstores FROM (
        SELECT city, COUNT(*) AS clubs, 0 AS bookstores FROM clubs
          WHERE city IS NOT NULL AND deleted_at IS NULL AND visibility = 'public' GROUP BY city
        UNION ALL
        SELECT city, 0, COUNT(*) FROM bookstores GROUP BY city
      ) t GROUP BY city ORDER BY SUM(clubs) DESC, city`;
    return rows.map((r) => ({ city: r.city, name: cityName(r.city), clubs: r.clubs, bookstores: r.bookstores }));
  }

  // ---------- Notifications ----------

  async notifications(userId: string, cursor: string | undefined, limit: number): Promise<Paged<NotificationItem>> {
    const rows = await this.prisma.notification.findMany({
      where: { userId, ...(cursor ? { id: { lt: cursor } } : {}) },
      orderBy: { id: 'desc' },
      take: limit + 1,
    });
    return toPage(rows, limit, (n) => ({
      id: n.id,
      type: n.type,
      payload: n.payload as NotificationItem['payload'],
      readAt: iso(n.readAt),
      createdAt: n.createdAt.toISOString(),
    }));
  }

  async markNotificationsRead(userId: string, ids?: string[]) {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null, ...(ids?.length ? { id: { in: ids } } : {}) },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }
}
