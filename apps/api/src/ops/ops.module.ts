import { opsBlogReviewSchema, opsListQuery, opsLoginSchema, opsReasonSchema } from '@bnw/shared';
import type { OpsAction, OpsClub, OpsStats, OpsUser } from '@bnw/shared';
import {
  CanActivate,
  Controller,
  ExecutionContext,
  Get,
  HttpCode,
  Injectable,
  Module,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { SessionService } from '../auth/session.service';
import { AppError, badRequest, notFound } from '../common/errors';
import { Paged, Public, ZBody, ZQuery } from '../common/http';
import { toUserSummary, userSummarySelect } from '../common/mappers';
import { env, isProd } from '../config/env';
import { ActivityService } from '../core/activity.service';
import { NotificationsService } from '../core/notifications.service';
import { PrismaService } from '../core/prisma.service';
import { QueueService } from '../core/queue.service';
import { RedisService } from '../core/redis.service';
import { BlogModule, BlogService } from '../blog/blog.module';

const SESSION_HOURS = 8;
const COOKIE = 'osid';
const CSRF_COOKIE = 'ocsrf';
const key = (id: string) => `ops:sess:${id}`;

interface OpsSession {
  email: string;
  csrf: string;
}

type OpsRequest = Request & { ops?: OpsSession };

const sha = (s: string) => createHash('sha256').update(s).digest();
const sameSecret = (a: string, b: string) => timingSafeEqual(sha(a), sha(b));

/**
 * Admin portal sessions. Completely separate from reader sessions (different cookie, store
 * and credentials). Without a valid portal session every /ops route answers 404, so the
 * portal's existence isn't revealed to regular users.
 */
@Injectable()
export class OpsGuard implements CanActivate {
  constructor(private readonly redis: RedisService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<OpsRequest>();
    const sid: string | undefined = req.cookies?.[COOKIE];
    const raw = sid && /^[A-Za-z0-9_-]{20,100}$/.test(sid) ? await this.redis.client.get(key(sid)) : null;
    if (!raw) throw notFound('Route');
    const session = JSON.parse(raw) as OpsSession;
    if (req.method !== 'GET' && req.header('x-csrf-token') !== session.csrf) {
      throw new AppError(403, 'CSRF', 'Session expired. Refresh the page.');
    }
    await this.redis.client.expire(key(sid!), SESSION_HOURS * 3600);
    req.ops = session;
    return true;
  }
}

@Injectable()
export class OpsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
    private readonly sessions: SessionService,
    private readonly notifications: NotificationsService,
    private readonly queues: QueueService,
  ) {}

  private audit(admin: string, action: string, targetType: string, targetId: string, targetName?: string, note?: string) {
    return this.prisma.adminAction.create({ data: { admin, action, targetType, targetId, targetName, note } });
  }

  // ---------- Stats ----------

  private async dailyCounts(table: 'users' | 'posts', days = 30) {
    const since = new Date(Date.now() - days * 86400000);
    const rows =
      table === 'users'
        ? await this.prisma.$queryRaw<{ d: string; n: number }[]>`
            SELECT to_char((created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD') AS d, COUNT(*)::int AS n
            FROM users WHERE created_at >= ${since} AND deleted_at IS NULL GROUP BY 1`
        : await this.prisma.$queryRaw<{ d: string; n: number }[]>`
            SELECT to_char((created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD') AS d, COUNT(*)::int AS n
            FROM posts WHERE created_at >= ${since} AND deleted_at IS NULL GROUP BY 1`;
    const byDay = new Map(rows.map((r) => [r.d, r.n]));
    const series = await this.activity.dailySeries(days);
    return series.map((p) => ({ date: p.date, value: byDay.get(p.date) ?? 0 }));
  }

  async stats(): Promise<OpsStats> {
    const now = Date.now();
    const ago = (d: number) => new Date(now - d * 86400000);
    const today = new Date(new Date(now + 330 * 60000).toISOString().slice(0, 10) + 'T00:00:00+05:30');
    const live: Prisma.UserWhereInput = { deletedAt: null };
    const p = this.prisma;

    const [
      usersTotal, newToday, new7d, new30d, suspended, onboarded,
      dau, wau, mau,
      clubsTotal, clubsPublic, clubsShutdown, clubsNew7d, memberships,
      weeklyActiveRows,
      posts7d, boardPosts7d, comments7d, reactions7d, dms7d, rsvps7d, upcomingEvents, imports7d,
      books, pendingBooks, blogPublished, blogPending, openReports,
      dauSeries, signups, postsSeries, topClubs, topCities,
    ] = await Promise.all([
      p.user.count({ where: live }),
      p.user.count({ where: { ...live, createdAt: { gte: today } } }),
      p.user.count({ where: { ...live, createdAt: { gte: ago(7) } } }),
      p.user.count({ where: { ...live, createdAt: { gte: ago(30) } } }),
      p.user.count({ where: { ...live, suspendedAt: { not: null } } }),
      p.user.count({ where: { ...live, onboardedAt: { not: null } } }),
      this.activity.activeUsers(1),
      this.activity.activeUsers(7),
      this.activity.activeUsers(30),
      p.club.count({ where: { deletedAt: null } }),
      p.club.count({ where: { deletedAt: null, visibility: 'public' } }),
      p.club.count({ where: { deletedAt: { not: null }, shutdownReason: { not: null } } }),
      p.club.count({ where: { deletedAt: null, createdAt: { gte: ago(7) } } }),
      p.clubMember.count({ where: { club: { deletedAt: null } } }),
      // North-star: clubs with at least one post or event in the last 7 days.
      p.$queryRaw<{ n: number }[]>`
        SELECT COUNT(DISTINCT c.id)::int AS n FROM clubs c
        WHERE c.deleted_at IS NULL AND (
          EXISTS (SELECT 1 FROM threads t JOIN posts po ON po.thread_id = t.id WHERE t.club_id = c.id AND po.created_at >= ${ago(7)} AND po.deleted_at IS NULL)
          OR EXISTS (SELECT 1 FROM events e WHERE e.club_id = c.id AND (e.created_at >= ${ago(7)} OR e.starts_at BETWEEN ${ago(7)} AND now()))
        )`,
      p.post.count({ where: { createdAt: { gte: ago(7) }, deletedAt: null, parentId: null, thread: { isBoard: false } } }),
      p.post.count({ where: { createdAt: { gte: ago(7) }, deletedAt: null, parentId: null, thread: { isBoard: true } } }),
      p.post.count({ where: { createdAt: { gte: ago(7) }, deletedAt: null, parentId: { not: null } } }),
      p.postReaction.count({ where: { createdAt: { gte: ago(7) } } }),
      p.dmMessage.count({ where: { createdAt: { gte: ago(7) } } }),
      p.eventRsvp.count({ where: { createdAt: { gte: ago(7) }, status: { in: ['going', 'maybe'] } } }),
      p.event.count({ where: { startsAt: { gte: new Date() }, cancelledAt: null } }),
      p.importJob.count({ where: { createdAt: { gte: ago(7) } } }),
      p.book.count({ where: { status: 'approved' } }),
      p.book.count({ where: { status: 'pending' } }),
      p.blogPost.count({ where: { status: 'published' } }),
      p.blogPost.count({ where: { status: 'pending' } }),
      p.report.count({ where: { status: 'open' } }),
      this.activity.dailySeries(30),
      this.dailyCounts('users'),
      this.dailyCounts('posts'),
      p.$queryRaw<{ id: string; name: string; slug: string; city: string | null; posts7d: number; members: number }[]>`
        SELECT c.id, c.name, c.slug, c.city,
          (SELECT COUNT(*) FROM threads t JOIN posts po ON po.thread_id = t.id WHERE t.club_id = c.id AND po.created_at >= ${ago(7)} AND po.deleted_at IS NULL)::int AS "posts7d",
          (SELECT COUNT(*) FROM club_members m WHERE m.club_id = c.id)::int AS members
        FROM clubs c WHERE c.deleted_at IS NULL
        ORDER BY 5 DESC, 6 DESC LIMIT 8`,
      p.$queryRaw<{ city: string; users: number }[]>`
        SELECT city, COUNT(*)::int AS users FROM users WHERE deleted_at IS NULL AND city IS NOT NULL
        GROUP BY city ORDER BY users DESC LIMIT 8`,
    ]);

    return {
      generatedAt: new Date().toISOString(),
      users: {
        total: usersTotal, newToday, new7d, new30d, suspended, dau, wau, mau,
        onboardedPct: usersTotal ? Math.round((onboarded / usersTotal) * 100) : 0,
      },
      clubs: {
        total: clubsTotal, public: clubsPublic, private: clubsTotal - clubsPublic, shutdown: clubsShutdown, new7d: clubsNew7d,
        weeklyActive: weeklyActiveRows[0]?.n ?? 0,
        avgMembers: clubsTotal ? Math.round((memberships / clubsTotal) * 10) / 10 : 0,
      },
      activity: { posts7d, boardPosts7d, comments7d, reactions7d, dms7d, rsvps7d, upcomingEvents, imports7d },
      content: { books, pendingBooks, blogPublished, blogPending, openReports },
      series: { dau: dauSeries, signups, posts: postsSeries },
      topClubs,
      topCities,
    };
  }

  // ---------- Users ----------

  async users(q: z.infer<typeof opsListQuery>): Promise<Paged<OpsUser>> {
    const where: Prisma.UserWhereInput = {
      ...(q.q ? { OR: [{ displayName: { contains: q.q, mode: 'insensitive' } }, { email: { contains: q.q, mode: 'insensitive' } }] } : {}),
      ...(q.status === 'suspended' ? { suspendedAt: { not: null } } : q.status === 'active' ? { suspendedAt: null, deletedAt: null } : {}),
    };
    const rows = await this.prisma.user.findMany({
      where,
      include: { _count: { select: { memberships: true, posts: { where: { deletedAt: null } } } } },
      orderBy: { id: 'desc' },
      take: q.limit + 1,
      ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > q.limit;
    const page = hasMore ? rows.slice(0, q.limit) : rows;
    return {
      items: page.map((u) => ({
        id: u.id,
        displayName: u.displayName,
        email: u.email,
        avatarUrl: u.avatarUrl,
        city: u.city,
        createdAt: u.createdAt.toISOString(),
        lastActiveAt: u.lastActiveAt?.toISOString() ?? null,
        clubs: u._count.memberships,
        posts: u._count.posts,
        isAdmin: u.isAdmin,
        suspendedAt: u.suspendedAt?.toISOString() ?? null,
        suspendedReason: u.suspendedReason,
        deleted: Boolean(u.deletedAt),
      })),
      nextCursor: hasMore ? page[page.length - 1].id : null,
    };
  }

  async suspend(admin: string, id: string, reason: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || user.deletedAt) throw notFound('User');
    if (user.suspendedAt) throw badRequest('This account is already deactivated');
    await this.prisma.user.update({ where: { id }, data: { suspendedAt: new Date(), suspendedReason: reason } });
    await this.sessions.destroyAll(id);
    await this.audit(admin, 'user.deactivate', 'user', id, `${user.displayName} <${user.email}>`, reason);
    return { ok: true };
  }

  async reactivate(admin: string, id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw notFound('User');
    await this.prisma.user.update({ where: { id }, data: { suspendedAt: null, suspendedReason: null } });
    await this.audit(admin, 'user.reactivate', 'user', id, `${user.displayName} <${user.email}>`);
    return { ok: true };
  }

  // ---------- Clubs ----------

  async clubs(q: z.infer<typeof opsListQuery>): Promise<Paged<OpsClub>> {
    const where: Prisma.ClubWhereInput = {
      ...(q.q ? { OR: [{ name: { contains: q.q, mode: 'insensitive' } }, { slug: { contains: q.q, mode: 'insensitive' } }] } : {}),
      ...(q.status === 'shutdown' ? { deletedAt: { not: null } } : q.status === 'active' ? { deletedAt: null } : {}),
    };
    const rows = await this.prisma.club.findMany({
      where,
      include: { owner: { select: { ...userSummarySelect, email: true } }, _count: { select: { members: true } } },
      orderBy: { id: 'desc' },
      take: q.limit + 1,
      ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > q.limit;
    const page = hasMore ? rows.slice(0, q.limit) : rows;
    const posts = page.length
      ? await this.prisma.$queryRaw<{ club_id: string; n: number }[]>`
          SELECT t.club_id, COUNT(*)::int AS n FROM posts po JOIN threads t ON t.id = po.thread_id
          WHERE t.club_id = ANY(${page.map((c) => c.id)}::uuid[]) AND po.created_at >= ${new Date(Date.now() - 7 * 86400000)} AND po.deleted_at IS NULL
          GROUP BY t.club_id`
      : [];
    const byClub = new Map(posts.map((r) => [r.club_id, r.n]));
    return {
      items: page.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        city: c.city,
        visibility: c.visibility,
        owner: { ...toUserSummary(c.owner), email: c.owner.email },
        members: c._count.members,
        posts7d: byClub.get(c.id) ?? 0,
        createdAt: c.createdAt.toISOString(),
        deletedAt: c.deletedAt?.toISOString() ?? null,
        shutdownReason: c.shutdownReason,
      })),
      nextCursor: hasMore ? page[page.length - 1].id : null,
    };
  }

  async shutdownClub(admin: string, id: string, reason: string) {
    const club = await this.prisma.club.findUnique({ where: { id }, include: { members: { select: { userId: true } } } });
    if (!club) throw notFound('Club');
    if (club.deletedAt) throw badRequest('This club is already closed');
    await this.prisma.club.update({ where: { id }, data: { deletedAt: new Date(), shutdownReason: reason } });
    await this.queues.add('search', 'club', { id });
    await this.notifications.notify(
      club.members.map((m) => m.userId),
      { type: 'club_shutdown', title: `${club.name} has been closed by the moderation team`, body: 'Contact support if you have questions.' },
    );
    await this.audit(admin, 'club.shutdown', 'club', id, club.name, reason);
    return { ok: true };
  }

  async restoreClub(admin: string, id: string) {
    const club = await this.prisma.club.findUnique({ where: { id } });
    if (!club) throw notFound('Club');
    await this.prisma.club.update({ where: { id }, data: { deletedAt: null, shutdownReason: null } });
    await this.queues.add('search', 'club', { id });
    await this.audit(admin, 'club.restore', 'club', id, club.name);
    return { ok: true };
  }

  async actions(): Promise<OpsAction[]> {
    const rows = await this.prisma.adminAction.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
    return rows.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() }));
  }

  audited(admin: string, action: string, targetType: string, targetId: string, targetName?: string, note?: string) {
    return this.audit(admin, action, targetType, targetId, targetName, note);
  }
}

@Controller('ops')
@Public() // reader sessions don't apply here; OpsGuard protects everything but login
export class OpsController {
  constructor(
    private readonly ops: OpsService,
    private readonly blog: BlogService,
    private readonly redis: RedisService,
  ) {}

  @Post('login')
  @HttpCode(200)
  async login(@Req() req: Request, @Res({ passthrough: true }) res: Response, @ZBody(opsLoginSchema) body: z.infer<typeof opsLoginSchema>) {
    await this.redis.rateLimit(`ops:login:${req.ip}`, 5, 15 * 60, 'Too many attempts. Try again in 15 minutes.');
    const okEmail = sameSecret(body.email.toLowerCase(), env().OPS_EMAIL.toLowerCase());
    const okPassword = sameSecret(body.password, env().OPS_PASSWORD);
    if (!okEmail || !okPassword) throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
    const id = randomBytes(32).toString('base64url');
    const csrf = randomBytes(24).toString('base64url');
    await this.redis.client.set(key(id), JSON.stringify({ email: env().OPS_EMAIL, csrf } satisfies OpsSession), 'EX', SESSION_HOURS * 3600);
    const base = { secure: isProd(), sameSite: 'strict' as const, path: '/', maxAge: SESSION_HOURS * 3600 * 1000 };
    res.cookie(COOKIE, id, { ...base, httpOnly: true });
    res.cookie(CSRF_COOKIE, csrf, { ...base, httpOnly: false });
    await this.ops.audited(env().OPS_EMAIL, 'login', 'portal', '-', undefined, req.ip);
    return { ok: true };
  }

  @UseGuards(OpsGuard)
  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: OpsRequest, @Res({ passthrough: true }) res: Response) {
    await this.redis.client.del(key(req.cookies[COOKIE]));
    res.clearCookie(COOKIE, { path: '/' });
    res.clearCookie(CSRF_COOKIE, { path: '/' });
    return { ok: true };
  }

  @UseGuards(OpsGuard)
  @Get('me')
  me(@Req() req: OpsRequest) {
    return { email: req.ops!.email, usingDefaultPassword: env().OPS_PASSWORD === 'ChangeMe-ops-2026' };
  }

  @UseGuards(OpsGuard)
  @Get('stats')
  stats() {
    return this.ops.stats();
  }

  @UseGuards(OpsGuard)
  @Get('users')
  users(@ZQuery(opsListQuery) q: z.infer<typeof opsListQuery>) {
    return this.ops.users(q);
  }

  @UseGuards(OpsGuard)
  @Post('users/:id/deactivate')
  @HttpCode(200)
  deactivate(@Req() req: OpsRequest, @Param('id', ParseUUIDPipe) id: string, @ZBody(opsReasonSchema) body: z.infer<typeof opsReasonSchema>) {
    return this.ops.suspend(req.ops!.email, id, body.reason);
  }

  @UseGuards(OpsGuard)
  @Post('users/:id/reactivate')
  @HttpCode(200)
  reactivate(@Req() req: OpsRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.ops.reactivate(req.ops!.email, id);
  }

  @UseGuards(OpsGuard)
  @Get('clubs')
  clubs(@ZQuery(opsListQuery) q: z.infer<typeof opsListQuery>) {
    return this.ops.clubs(q);
  }

  @UseGuards(OpsGuard)
  @Post('clubs/:id/shutdown')
  @HttpCode(200)
  shutdown(@Req() req: OpsRequest, @Param('id', ParseUUIDPipe) id: string, @ZBody(opsReasonSchema) body: z.infer<typeof opsReasonSchema>) {
    return this.ops.shutdownClub(req.ops!.email, id, body.reason);
  }

  @UseGuards(OpsGuard)
  @Post('clubs/:id/restore')
  @HttpCode(200)
  restore(@Req() req: OpsRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.ops.restoreClub(req.ops!.email, id);
  }

  @UseGuards(OpsGuard)
  @Get('blog/pending')
  pendingBlog() {
    return this.blog.pending();
  }

  @UseGuards(OpsGuard)
  @Post('blog/:id/review')
  @HttpCode(200)
  async reviewBlog(@Req() req: OpsRequest, @Param('id', ParseUUIDPipe) id: string, @ZBody(opsBlogReviewSchema) body: z.infer<typeof opsBlogReviewSchema>) {
    const post = await this.blog.review(id, body.decision);
    await this.ops.audited(req.ops!.email, `blog.${body.decision}`, 'blog', id, post.title, body.note);
    return { ok: true };
  }

  @UseGuards(OpsGuard)
  @Get('actions')
  actions() {
    return this.ops.actions();
  }
}

@Module({ imports: [BlogModule], controllers: [OpsController], providers: [OpsService, OpsGuard] })
export class OpsModule {}
