import { createBlockSchema, createReportSchema, resolveReportSchema, reviewBookSchema } from '@bnw/shared';
import type { CreateReportInput, ReportItem } from '@bnw/shared';
import { Controller, Delete, Get, HttpCode, Injectable, Module, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { Report, ReportStatus } from '@prisma/client';
import { z } from 'zod';
import { badRequest, notFound } from '../common/errors';
import { AdminOnly, AuthUser, CurrentUser, ZBody } from '../common/http';
import { bookInclude, toBookSummary, toUserSummary, userSummarySelect } from '../common/mappers';
import { NotificationsService } from '../core/notifications.service';
import { PrismaService } from '../core/prisma.service';
import { QueueService } from '../core/queue.service';
import { RedisService } from '../core/redis.service';

@Injectable()
export class SafetyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly queues: QueueService,
    private readonly notifications: NotificationsService,
  ) {}

  private async targetExists(type: CreateReportInput['targetType'], id: string): Promise<boolean> {
    const where = { where: { id }, select: { id: true } } as const;
    switch (type) {
      case 'post': return Boolean(await this.prisma.post.findUnique(where));
      case 'thread': return Boolean(await this.prisma.thread.findUnique(where));
      case 'dm_message': return Boolean(await this.prisma.dmMessage.findUnique(where));
      case 'user': return Boolean(await this.prisma.user.findUnique(where));
      case 'club': return Boolean(await this.prisma.club.findUnique(where));
      case 'event': return Boolean(await this.prisma.event.findUnique(where));
      case 'book': return Boolean(await this.prisma.book.findUnique(where));
      case 'blog': return Boolean(await this.prisma.blogPost.findUnique(where));
      default: return false;
    }
  }

  async report(user: AuthUser, input: CreateReportInput) {
    await this.redis.rateLimit(`report:${user.id}`, 10, 3600, "You've sent a lot of reports. Our team will review them.");
    if (!(await this.targetExists(input.targetType, input.targetId))) throw notFound('Reported item');
    // DM reports only from a participant of that conversation.
    if (input.targetType === 'dm_message') {
      const msg = await this.prisma.dmMessage.findUnique({ where: { id: input.targetId } });
      const part = msg && (await this.prisma.dmParticipant.findUnique({
        where: { conversationId_userId: { conversationId: msg.conversationId, userId: user.id } },
      }));
      if (!part) throw notFound('Reported item');
    }
    await this.prisma.report.create({
      data: { reporterId: user.id, targetType: input.targetType, targetId: input.targetId, reason: input.reason, details: input.details ?? null },
    });
    const admins = await this.prisma.user.findMany({ where: { isAdmin: true, deletedAt: null }, select: { id: true } });
    await this.notifications.notify(admins.map((a) => a.id), { type: 'report', title: `New report: ${input.reason} (${input.targetType})`, url: '/admin' });
    return { ok: true };
  }

  async block(user: AuthUser, targetId: string) {
    if (targetId === user.id) throw badRequest("You can't block yourself");
    const target = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!target) throw notFound('Reader');
    await this.prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId: user.id, blockedId: targetId } },
      create: { blockerId: user.id, blockedId: targetId },
      update: {},
    });
    return { ok: true };
  }

  async unblock(user: AuthUser, targetId: string) {
    await this.prisma.block.deleteMany({ where: { blockerId: user.id, blockedId: targetId } });
    return { ok: true };
  }

  // ---------- Admin moderation ----------

  private async context(r: Report): Promise<ReportItem['context']> {
    switch (r.targetType) {
      case 'post': {
        const p = await this.prisma.post.findUnique({
          where: { id: r.targetId },
          include: { author: { select: userSummarySelect }, thread: { include: { club: true } } },
        });
        return p
          ? { excerpt: p.body.slice(0, 400), author: toUserSummary(p.author), url: `/clubs/${p.thread.club.slug}/threads/${p.threadId}` }
          : { excerpt: null, author: null, url: null };
      }
      case 'thread': {
        const t = await this.prisma.thread.findUnique({ where: { id: r.targetId }, include: { author: { select: userSummarySelect }, club: true } });
        return t
          ? { excerpt: t.title, author: t.author ? toUserSummary(t.author) : null, url: `/clubs/${t.club.slug}/threads/${t.id}` }
          : { excerpt: null, author: null, url: null };
      }
      case 'dm_message': {
        const m = await this.prisma.dmMessage.findUnique({ where: { id: r.targetId }, include: { sender: { select: userSummarySelect } } });
        // Context for reported DMs: the message plus the few before it.
        const prior = m
          ? await this.prisma.dmMessage.findMany({ where: { conversationId: m.conversationId, id: { lte: m.id } }, orderBy: { id: 'desc' }, take: 5 })
          : [];
        return m
          ? { excerpt: prior.reverse().map((x) => `${x.senderId === m.senderId ? '▶' : '◀'} ${x.body}`).join('\n').slice(0, 1200), author: toUserSummary(m.sender), url: null }
          : { excerpt: null, author: null, url: null };
      }
      case 'user': {
        const u = await this.prisma.user.findUnique({ where: { id: r.targetId }, select: { ...userSummarySelect, bio: true } });
        return u ? { excerpt: u.bio, author: toUserSummary(u), url: `/readers/${u.id}` } : { excerpt: null, author: null, url: null };
      }
      case 'club': {
        const c = await this.prisma.club.findUnique({ where: { id: r.targetId } });
        return c ? { excerpt: `${c.name}\n${c.description ?? ''}`, author: null, url: `/clubs/${c.slug}` } : { excerpt: null, author: null, url: null };
      }
      case 'event': {
        const e = await this.prisma.event.findUnique({ where: { id: r.targetId } });
        return e ? { excerpt: `${e.title}\n${e.description ?? ''}`, author: null, url: `/events/${e.id}` } : { excerpt: null, author: null, url: null };
      }
      case 'book': {
        const b = await this.prisma.book.findUnique({ where: { id: r.targetId } });
        return b ? { excerpt: b.title, author: null, url: `/books/${b.id}` } : { excerpt: null, author: null, url: null };
      }
      case 'blog': {
        const b = await this.prisma.blogPost.findUnique({ where: { id: r.targetId }, include: { author: { select: userSummarySelect } } });
        return b ? { excerpt: `${b.title}\n${b.body.slice(0, 400)}`, author: toUserSummary(b.author), url: `/blog/${b.slug}` } : { excerpt: null, author: null, url: null };
      }
    }
  }

  async listReports(status: ReportStatus): Promise<ReportItem[]> {
    const rows = await this.prisma.report.findMany({
      where: { status },
      include: { reporter: { select: userSummarySelect } },
      orderBy: { createdAt: status === 'open' ? 'asc' : 'desc' },
      take: 100,
    });
    return Promise.all(
      rows.map(async (r) => ({
        id: r.id,
        targetType: r.targetType,
        targetId: r.targetId,
        reason: r.reason,
        details: r.details,
        status: r.status,
        reporter: toUserSummary(r.reporter),
        createdAt: r.createdAt.toISOString(),
        context: await this.context(r),
      })),
    );
  }

  async resolve(admin: AuthUser, id: string, action: 'dismiss' | 'remove_content', note?: string) {
    const r = await this.prisma.report.findUnique({ where: { id } });
    if (!r) throw notFound('Report');
    if (action === 'remove_content') {
      const now = new Date();
      switch (r.targetType) {
        case 'post': await this.prisma.post.updateMany({ where: { id: r.targetId }, data: { deletedAt: now } }); break;
        case 'thread': await this.prisma.thread.updateMany({ where: { id: r.targetId }, data: { deletedAt: now } }); break;
        case 'dm_message': await this.prisma.dmMessage.updateMany({ where: { id: r.targetId }, data: { deletedAt: now } }); break;
        case 'club':
          await this.prisma.club.updateMany({ where: { id: r.targetId }, data: { deletedAt: now } });
          await this.queues.add('search', 'club', { id: r.targetId });
          break;
        case 'event': await this.prisma.event.updateMany({ where: { id: r.targetId }, data: { cancelledAt: now } }); break;
        case 'book':
          await this.prisma.book.updateMany({ where: { id: r.targetId }, data: { status: 'rejected' } });
          await this.queues.add('search', 'book', { id: r.targetId });
          break;
        case 'blog':
          await this.prisma.blogPost.updateMany({ where: { id: r.targetId }, data: { status: 'removed' } });
          break;
        case 'user':
          // Accounts are deactivated from the admin portal; here, clear the profile text that was reported.
          await this.prisma.user.updateMany({ where: { id: r.targetId }, data: { bio: null } });
          break;
      }
    }
    // Resolve every open report about the same item together.
    await this.prisma.report.updateMany({
      where: { targetType: r.targetType, targetId: r.targetId, status: 'open' },
      data: { status: action === 'dismiss' ? 'dismissed' : 'actioned', resolvedById: admin.id, resolvedAt: new Date(), resolution: note ?? null },
    });
    return { ok: true };
  }

  async pendingBooks() {
    const rows = await this.prisma.book.findMany({
      where: { status: 'pending' },
      include: { ...bookInclude, createdBy: { select: userSummarySelect }, editions: true },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
    return rows.map((b) => ({
      ...toBookSummary(b),
      description: b.description,
      isbns: b.editions.flatMap((e) => [e.isbn13, e.isbn10]).filter(Boolean),
      addedBy: b.createdBy ? toUserSummary(b.createdBy) : null,
      createdAt: b.createdAt.toISOString(),
    }));
  }

  async reviewBook(id: string, decision: 'approve' | 'reject') {
    const b = await this.prisma.book.update({ where: { id }, data: { status: decision === 'approve' ? 'approved' : 'rejected' } });
    await this.queues.add('search', 'book', { id });
    if (b.createdById) {
      await this.notifications.notify([b.createdById], {
        type: 'book_review',
        title: decision === 'approve' ? `"${b.title}" was added to the catalog` : `"${b.title}" wasn't added to the catalog`,
        url: decision === 'approve' ? `/books/${b.id}` : undefined,
      });
    }
    return { ok: true };
  }
}

@Controller('v1')
export class SafetyController {
  constructor(private readonly safety: SafetyService) {}

  @Post('reports')
  report(@CurrentUser() user: AuthUser, @ZBody(createReportSchema) body: CreateReportInput) {
    return this.safety.report(user, body);
  }

  @Post('blocks')
  block(@CurrentUser() user: AuthUser, @ZBody(createBlockSchema) body: z.infer<typeof createBlockSchema>) {
    return this.safety.block(user, body.userId);
  }

  @Delete('blocks/:userId')
  unblock(@CurrentUser() user: AuthUser, @Param('userId', ParseUUIDPipe) userId: string) {
    return this.safety.unblock(user, userId);
  }

  @AdminOnly()
  @Get('admin/reports')
  reports(@Query('status') status?: string) {
    const s = (['open', 'actioned', 'dismissed'] as const).find((x) => x === status) ?? 'open';
    return this.safety.listReports(s);
  }

  @AdminOnly()
  @Post('admin/reports/:id/resolve')
  @HttpCode(200)
  resolve(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @ZBody(resolveReportSchema) body: z.infer<typeof resolveReportSchema>,
  ) {
    return this.safety.resolve(user, id, body.action, body.note);
  }

  @AdminOnly()
  @Get('admin/books/pending')
  pendingBooks() {
    return this.safety.pendingBooks();
  }

  @AdminOnly()
  @Post('admin/books/:id/review')
  @HttpCode(200)
  reviewBook(@Param('id', ParseUUIDPipe) id: string, @ZBody(reviewBookSchema) body: z.infer<typeof reviewBookSchema>) {
    return this.safety.reviewBook(id, body.decision);
  }
}

@Module({ controllers: [SafetyController], providers: [SafetyService] })
export class SafetyModule {}
