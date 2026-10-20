import {
  ClubBookInfo,
  ClubDetail,
  ClubMemberInfo,
  ClubSummary,
  CreateClubInput,
  InviteInfo,
  SetClubBookInput,
  slugify,
  UpdateClubInput,
  UpdateScheduleInput,
} from '@bnw/shared';
import { Injectable } from '@nestjs/common';
import { ClubRole, Prisma } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { badRequest, forbidden, notFound } from '../common/errors';
import { AuthUser, iso, Paged, toPage } from '../common/http';
import {
  bookInclude,
  clubSummaryInclude,
  toBookSummary,
  toClubSummary,
  toUserSummary,
  userSummarySelect,
} from '../common/mappers';
import { env } from '../config/env';
import { AccessService } from '../core/access.service';
import { NotificationsService } from '../core/notifications.service';
import { PrismaService } from '../core/prisma.service';
import { QueueService } from '../core/queue.service';
import { SearchService } from '../core/search.service';
import { buildSchedule, ClubSchedule, FINISHED_WEEK, INTRO_WEEK, scheduleEnd, weekThreadTitle } from './schedule';

const clubBookInclude = { book: { include: bookInclude } } satisfies Prisma.ClubBookInclude;
type ClubBookRow = Prisma.ClubBookGetPayload<{ include: typeof clubBookInclude }>;

function toClubBookInfo(cb: ClubBookRow): ClubBookInfo {
  const s = cb.schedule as ClubSchedule | null;
  return {
    id: cb.id,
    book: toBookSummary(cb.book),
    startsOn: cb.startsOn.toISOString().slice(0, 10),
    endsOn: cb.endsOn ? cb.endsOn.toISOString().slice(0, 10) : null,
    isCurrent: cb.isCurrent,
    totalChapters: s?.totalChapters ?? null,
    chaptersPerWeek: s?.chaptersPerWeek ?? null,
    weeks: s?.weeks ?? [],
  };
}

@Injectable()
export class ClubsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly search: SearchService,
    private readonly queues: QueueService,
    private readonly notifications: NotificationsService,
  ) {}

  private async uniqueSlug(name: string): Promise<string> {
    const base = slugify(name) || 'club';
    for (let i = 0; i < 5; i++) {
      const slug = i === 0 ? base : `${base}-${randomBytes(2).toString('hex')}`;
      if (!(await this.prisma.club.findUnique({ where: { slug } }))) return slug;
    }
    return `${base}-${randomBytes(4).toString('hex')}`;
  }

  private reindex(clubId: string) {
    return this.queues.add('search', 'club', { id: clubId });
  }

  private async adminIds(clubId: string, exclude?: string) {
    const admins = await this.prisma.clubMember.findMany({
      where: { clubId, role: { in: ['owner', 'admin'] } },
      select: { userId: true },
    });
    return admins.map((a) => a.userId).filter((id) => id !== exclude);
  }

  async memberIds(clubId: string) {
    const rows = await this.prisma.clubMember.findMany({ where: { clubId }, select: { userId: true } });
    return rows.map((r) => r.userId);
  }

  async create(user: AuthUser, input: CreateClubInput): Promise<ClubDetail> {
    const club = await this.prisma.club.create({
      data: {
        name: input.name,
        slug: await this.uniqueSlug(input.name),
        description: input.description ?? null,
        city: input.city ?? user.city,
        language: input.language,
        visibility: input.visibility,
        ownerId: user.id,
        members: { create: { userId: user.id, role: 'owner' } },
      },
    });
    await this.reindex(club.id);
    return this.detail(club.slug, user.id);
  }

  async list(q: { city?: string; language?: string; q?: string; cursor?: string; limit: number }): Promise<Paged<ClubSummary>> {
    if (q.q) {
      const ids = await this.search.searchClubs(q.q, { city: q.city, language: q.language, limit: q.limit });
      if (ids) {
        const rows = await this.prisma.club.findMany({
          where: { id: { in: ids }, deletedAt: null, visibility: 'public' },
          include: clubSummaryInclude,
        });
        const byId = new Map(rows.map((r) => [r.id, r]));
        return { items: ids.map((id) => byId.get(id)).filter(Boolean).map((c) => toClubSummary(c!)), nextCursor: null };
      }
    }
    const rows = await this.prisma.club.findMany({
      where: {
        deletedAt: null,
        visibility: 'public',
        ...(q.city ? { city: q.city } : {}),
        ...(q.language ? { language: q.language } : {}),
        ...(q.q
          ? {
              OR: [
                { name: { contains: q.q, mode: 'insensitive' } },
                { description: { contains: q.q, mode: 'insensitive' } },
              ],
            }
          : {}),
        ...(q.cursor ? { id: { lt: q.cursor } } : {}),
      },
      include: clubSummaryInclude,
      orderBy: { id: 'desc' },
      take: q.limit + 1,
    });
    return toPage(rows, q.limit, toClubSummary);
  }

  async mine(userId: string): Promise<(ClubSummary & { myRole: ClubRole })[]> {
    const rows = await this.prisma.club.findMany({
      where: { deletedAt: null, members: { some: { userId } } },
      include: { ...clubSummaryInclude, members: { where: { userId }, select: { role: true } } },
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map((c) => ({ ...toClubSummary(c), myRole: c.members[0].role }));
  }

  async detail(slugOrId: string, userId?: string): Promise<ClubDetail> {
    const isUuid = /^[0-9a-f-]{36}$/i.test(slugOrId);
    const club = await this.prisma.club.findFirst({
      where: { deletedAt: null, ...(isUuid ? { id: slugOrId } : { slug: slugOrId }) },
      include: {
        ...clubSummaryInclude,
        owner: { select: userSummarySelect },
        clubBooks: { include: clubBookInclude, orderBy: { startsOn: 'desc' } },
      },
    });
    if (!club) throw notFound('Club');
    const membership = await this.access.membership(club.id, userId);
    const current = club.clubBooks.find((cb) => cb.isCurrent) ?? null;
    return {
      ...toClubSummary(club),
      description: club.description,
      owner: toUserSummary(club.owner),
      createdAt: club.createdAt.toISOString(),
      myRole: membership?.role ?? null,
      currentClubBook: current ? toClubBookInfo(current) : null,
      // Private clubs show their reading history only to members.
      history: club.visibility === 'public' || membership ? club.clubBooks.map(toClubBookInfo) : [],
    };
  }

  async update(clubId: string, user: AuthUser, input: UpdateClubInput): Promise<ClubDetail> {
    await this.access.requireAdmin(clubId, user.id);
    const club = await this.prisma.club.update({
      where: { id: clubId },
      data: {
        name: input.name,
        description: input.description,
        city: input.city,
        language: input.language,
        visibility: input.visibility,
      },
    });
    await this.reindex(clubId);
    return this.detail(club.id, user.id);
  }

  async remove(clubId: string, user: AuthUser) {
    const m = await this.access.requireMember(clubId, user.id);
    if (m.role !== 'owner') throw forbidden('Only the owner can delete the club');
    await this.prisma.club.update({ where: { id: clubId }, data: { deletedAt: new Date() } });
    await this.reindex(clubId);
    return { ok: true };
  }

  // ---------- Membership ----------

  async join(clubId: string, user: AuthUser) {
    const club = await this.access.club(clubId);
    if (await this.access.membership(clubId, user.id)) return { ok: true, role: 'member' };
    if (club.visibility !== 'public') throw forbidden('This club is invite-only. Ask an organizer for an invite link.');
    await this.addMember(clubId, user);
    return { ok: true, role: 'member' };
  }

  private async addMember(clubId: string, user: AuthUser) {
    await this.prisma.clubMember.create({ data: { clubId, userId: user.id, role: 'member' } });
    const club = await this.access.club(clubId);
    await this.notifications.notify(await this.adminIds(clubId, user.id), {
      type: 'club_join',
      title: `${user.displayName} joined ${club.name}`,
      url: `/clubs/${club.slug}/members`,
      group: { key: `club-join:${clubId}`, actor: { id: user.id, name: user.displayName }, title: (who) => `${who} joined ${club.name}` },
    });
  }

  async leave(clubId: string, user: AuthUser) {
    const m = await this.access.requireMember(clubId, user.id);
    if (m.role === 'owner') {
      const others = await this.prisma.clubMember.count({ where: { clubId, userId: { not: user.id } } });
      if (others > 0) throw badRequest('Make another member the owner before you leave');
      await this.prisma.club.update({ where: { id: clubId }, data: { deletedAt: new Date() } });
      await this.reindex(clubId);
    }
    await this.prisma.clubMember.delete({ where: { clubId_userId: { clubId, userId: user.id } } });
    return { ok: true };
  }

  async members(clubId: string, userId: string): Promise<ClubMemberInfo[]> {
    await this.access.requireMember(clubId, userId);
    const rows = await this.prisma.clubMember.findMany({
      where: { clubId, user: { deletedAt: null } },
      include: { user: { select: userSummarySelect } },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
    });
    return rows.map((r) => ({ user: toUserSummary(r.user), role: r.role, joinedAt: r.joinedAt.toISOString() }));
  }

  /** Owners change roles and can hand over ownership. */
  async updateMember(clubId: string, actor: AuthUser, targetId: string, role: ClubRole) {
    const me = await this.access.requireMember(clubId, actor.id);
    if (me.role !== 'owner') throw forbidden('Only the owner can change roles');
    if (targetId === actor.id) throw badRequest("You can't change your own role");
    const target = await this.access.membership(clubId, targetId);
    if (!target) throw notFound('Member');

    if (role === 'owner') {
      await this.prisma.$transaction([
        this.prisma.clubMember.update({ where: { clubId_userId: { clubId, userId: targetId } }, data: { role: 'owner' } }),
        this.prisma.clubMember.update({ where: { clubId_userId: { clubId, userId: actor.id } }, data: { role: 'admin' } }),
        this.prisma.club.update({ where: { id: clubId }, data: { ownerId: targetId } }),
      ]);
    } else {
      await this.prisma.clubMember.update({ where: { clubId_userId: { clubId, userId: targetId } }, data: { role } });
    }
    const club = await this.access.club(clubId);
    await this.notifications.notify([targetId], {
      type: 'club_role',
      title: `You're now ${role === 'admin' ? 'an admin' : `the ${role}`} of ${club.name}`,
      url: `/clubs/${club.slug}`,
    });
    return { ok: true };
  }

  async removeMember(clubId: string, actor: AuthUser, targetId: string) {
    if (targetId === actor.id) return this.leave(clubId, actor);
    const me = await this.access.requireAdmin(clubId, actor.id);
    const target = await this.access.membership(clubId, targetId);
    if (!target) throw notFound('Member');
    if (target.role === 'owner') throw forbidden("The owner can't be removed");
    if (target.role === 'admin' && me.role !== 'owner') throw forbidden('Only the owner can remove an admin');
    await this.prisma.clubMember.delete({ where: { clubId_userId: { clubId, userId: targetId } } });
    return { ok: true };
  }

  // ---------- Invites ----------

  private toInvite(i: { code: string; expiresAt: Date | null; maxUses: number | null; uses: number; createdAt: Date }): InviteInfo {
    return {
      code: i.code,
      url: `${env().WEB_ORIGIN}/invite/${i.code}`,
      expiresAt: iso(i.expiresAt),
      maxUses: i.maxUses,
      uses: i.uses,
      createdAt: i.createdAt.toISOString(),
    };
  }

  async createInvite(clubId: string, user: AuthUser, opts: { expiresInDays?: number; maxUses?: number }) {
    await this.access.requireAdmin(clubId, user.id);
    const invite = await this.prisma.clubInvite.create({
      data: {
        clubId,
        code: randomBytes(9).toString('base64url'),
        createdById: user.id,
        expiresAt: opts.expiresInDays ? new Date(Date.now() + opts.expiresInDays * 86400000) : null,
        maxUses: opts.maxUses ?? null,
      },
    });
    return this.toInvite(invite);
  }

  async listInvites(clubId: string, user: AuthUser) {
    await this.access.requireAdmin(clubId, user.id);
    const rows = await this.prisma.clubInvite.findMany({
      where: { clubId, revokedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.toInvite(r));
  }

  async revokeInvite(clubId: string, user: AuthUser, code: string) {
    await this.access.requireAdmin(clubId, user.id);
    await this.prisma.clubInvite.updateMany({ where: { clubId, code }, data: { revokedAt: new Date() } });
    return { ok: true };
  }

  private async validInvite(code: string) {
    const invite = await this.prisma.clubInvite.findUnique({
      where: { code },
      include: { club: { include: clubSummaryInclude } },
    });
    if (!invite || invite.revokedAt || invite.club.deletedAt) throw notFound('Invite');
    if (invite.expiresAt && invite.expiresAt < new Date()) throw badRequest('This invite has expired');
    if (invite.maxUses !== null && invite.uses >= invite.maxUses) throw badRequest('This invite has been used up');
    return invite;
  }

  async previewInvite(code: string, userId?: string) {
    const invite = await this.validInvite(code);
    const member = await this.access.membership(invite.clubId, userId);
    return { club: toClubSummary(invite.club), description: invite.club.description, alreadyMember: Boolean(member) };
  }

  async acceptInvite(code: string, user: AuthUser) {
    const invite = await this.validInvite(code);
    if (!(await this.access.membership(invite.clubId, user.id))) {
      await this.prisma.clubInvite.update({ where: { id: invite.id }, data: { uses: { increment: 1 } } });
      await this.addMember(invite.clubId, user);
    }
    return { ok: true, slug: invite.club.slug };
  }

  // ---------- Books and schedule ----------

  /**
   * Sets the club's current book with a weekly schedule, and creates the default threads:
   * a spoiler-free introductions thread, one per week gated at that week's last chapter,
   * and a "finished the book" thread.
   */
  async setBook(clubId: string, user: AuthUser, input: SetClubBookInput): Promise<ClubBookInfo> {
    await this.access.requireAdmin(clubId, user.id);
    const book = await this.prisma.book.findUnique({ where: { id: input.bookId } });
    if (!book || book.status !== 'approved') throw notFound('Book');
    const schedule = buildSchedule(input.startsOn, input.totalChapters, input.chaptersPerWeek);

    const clubBook = await this.prisma.$transaction(async (tx) => {
      await tx.clubBook.updateMany({
        where: { clubId, isCurrent: true },
        data: { isCurrent: false, endsOn: new Date() },
      });
      const cb = await tx.clubBook.create({
        data: {
          clubId,
          bookId: book.id,
          startsOn: input.startsOn,
          endsOn: scheduleEnd(schedule),
          schedule: schedule as unknown as Prisma.InputJsonValue,
          isCurrent: true,
        },
      });
      await tx.club.update({ where: { id: clubId }, data: { currentBookId: book.id } });
      if (!book.chapterCount) await tx.book.update({ where: { id: book.id }, data: { chapterCount: input.totalChapters } });
      await tx.thread.createMany({
        data: [
          {
            clubId,
            bookId: book.id,
            clubBookId: cb.id,
            scheduleWeek: INTRO_WEEK,
            title: `Starting ${book.title} — first impressions (no spoilers)`,
            chapterGate: 0,
            isSystem: true,
          },
          ...schedule.weeks.map((w) => ({
            clubId,
            bookId: book.id,
            clubBookId: cb.id,
            scheduleWeek: w.week,
            title: weekThreadTitle(w),
            chapterGate: w.toChapter,
            isSystem: true,
          })),
          {
            clubId,
            bookId: book.id,
            clubBookId: cb.id,
            scheduleWeek: FINISHED_WEEK,
            title: `Finished ${book.title} — full discussion`,
            chapterGate: input.totalChapters,
            isSystem: true,
          },
        ],
      });
      return tx.clubBook.findUniqueOrThrow({ where: { id: cb.id }, include: clubBookInclude });
    });

    const club = await this.access.club(clubId);
    await this.reindex(clubId);
    await this.notifications.notify(
      await this.memberIds(clubId),
      {
        type: 'club_book',
        title: `${club.name} is reading ${book.title}`,
        body: `Starts ${schedule.weeks[0].startsOn} · ${schedule.chaptersPerWeek} chapters a week`,
        url: `/clubs/${club.slug}`,
      },
      {},
      user.id,
    );
    return toClubBookInfo(clubBook);
  }

  async updateSchedule(clubId: string, clubBookId: string, user: AuthUser, input: UpdateScheduleInput) {
    await this.access.requireAdmin(clubId, user.id);
    const cb = await this.prisma.clubBook.findFirst({ where: { id: clubBookId, clubId }, include: { book: true } });
    if (!cb) throw notFound('Club book');
    const schedule = buildSchedule(input.startsOn, input.totalChapters, input.chaptersPerWeek);

    const updated = await this.prisma.$transaction(async (tx) => {
      for (const w of schedule.weeks) {
        await tx.thread.upsert({
          where: { clubBookId_scheduleWeek: { clubBookId, scheduleWeek: w.week } },
          create: {
            clubId,
            bookId: cb.bookId,
            clubBookId,
            scheduleWeek: w.week,
            title: weekThreadTitle(w),
            chapterGate: w.toChapter,
            isSystem: true,
          },
          update: { title: weekThreadTitle(w), chapterGate: w.toChapter },
        });
      }
      // Weeks beyond the new schedule: remove if nobody posted yet.
      await tx.thread.deleteMany({
        where: { clubBookId, scheduleWeek: { gt: schedule.weeks.length }, postCount: 0 },
      });
      await tx.thread.updateMany({
        where: { clubBookId, scheduleWeek: FINISHED_WEEK },
        data: { chapterGate: input.totalChapters },
      });
      return tx.clubBook.update({
        where: { id: clubBookId },
        data: {
          startsOn: input.startsOn,
          endsOn: scheduleEnd(schedule),
          schedule: schedule as unknown as Prisma.InputJsonValue,
        },
        include: clubBookInclude,
      });
    });
    return toClubBookInfo(updated);
  }

  /** Daily job: nudge members when a new schedule week starts today. */
  async sendScheduleNudges() {
    const today = new Date().toISOString().slice(0, 10);
    const current = await this.prisma.clubBook.findMany({
      where: { isCurrent: true, club: { deletedAt: null } },
      include: { club: true, book: true },
    });
    for (const cb of current) {
      const s = cb.schedule as ClubSchedule | null;
      const week = s?.weeks.find((w) => w.startsOn === today);
      if (!week) continue;
      const chapters = week.fromChapter === week.toChapter ? `chapter ${week.fromChapter}` : `chapters ${week.fromChapter}–${week.toChapter}`;
      await this.notifications.notify(
        await this.memberIds(cb.clubId),
        {
          type: 'schedule_week',
          title: `${cb.club.name}: this week, ${chapters} of ${cb.book.title}`,
          url: `/clubs/${cb.club.slug}`,
        },
        {
          email: {
            subject: `This week in ${cb.club.name}: ${chapters}`,
            text: `This week ${cb.club.name} reads ${chapters} of ${cb.book.title}. The discussion thread unlocks once you mark those chapters done.`,
          },
          whatsapp: { template: 'weekly_schedule_nudge', params: [cb.club.name, cb.book.title, chapters] },
        },
      );
    }
  }
}
