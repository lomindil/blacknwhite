import type { CreatePostInput, CreateThreadInput, PostItem, ThreadDetail, ThreadListItem } from '@bnw/shared';
import { Injectable } from '@nestjs/common';
import { Prisma, Thread } from '@prisma/client';
import { AppError, forbidden, notFound } from '../common/errors';
import { AuthUser, Paged, toPage } from '../common/http';
import { bookInclude, toBookSummary, toUserSummary, userSummarySelect } from '../common/mappers';
import { AccessService, FINISHED } from '../core/access.service';
import { NotificationsService } from '../core/notifications.service';
import { PrismaService } from '../core/prisma.service';
import { RealtimeService } from '../core/realtime.service';
import { RedisService } from '../core/redis.service';

export const spoilerLocked = (gate: number) =>
  new AppError(403, 'SPOILER_LOCKED', `Unlocks at chapter ${gate}`, { chapterGate: gate });

/**
 * Spoiler-safe discussion (docs/architecture.md §7.2). Gates are applied in the database
 * query — locked thread titles and post bodies are never selected for readers below the gate.
 */
@Injectable()
export class DiscussionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly redis: RedisService,
    private readonly realtime: RealtimeService,
    private readonly notifications: NotificationsService,
  ) {}

  /** The reader's finished chapter for every book this club has threads about. */
  private async chaptersByBook(clubId: string, userId: string): Promise<Map<string, number>> {
    const books = await this.prisma.thread.findMany({
      where: { clubId, deletedAt: null, bookId: { not: null } },
      distinct: ['bookId'],
      select: { bookId: true },
    });
    const bookIds = books.map((b) => b.bookId!);
    const statuses = await this.prisma.readingStatus.findMany({ where: { userId, bookId: { in: bookIds } } });
    const map = new Map<string, number>(bookIds.map((id) => [id, 0]));
    for (const s of statuses) map.set(s.bookId, s.status === 'read' ? FINISHED : s.currentChapter);
    return map;
  }

  async listThreads(clubId: string, userId: string): Promise<ThreadListItem[]> {
    await this.access.requireMember(clubId, userId);
    const chapters = await this.chaptersByBook(clubId, userId);

    const unlockedWhere: Prisma.ThreadWhereInput = {
      clubId,
      deletedAt: null,
      OR: [{ bookId: null }, ...[...chapters].map(([bookId, ch]) => ({ bookId, chapterGate: { lte: ch } }))],
    };
    const [unlocked, locked] = await Promise.all([
      this.prisma.thread.findMany({
        where: unlockedWhere,
        include: { author: { select: userSummarySelect } },
        orderBy: { lastPostAt: 'desc' },
        take: 300,
      }),
      // Locked threads: only id, gate and book — never the title.
      this.prisma.thread.findMany({
        where: { clubId, deletedAt: null, bookId: { not: null }, NOT: unlockedWhere },
        select: { id: true, chapterGate: true, bookId: true },
        orderBy: { chapterGate: 'asc' },
        take: 300,
      }),
    ]);

    return [
      ...unlocked.map(
        (t): ThreadListItem => ({
          id: t.id,
          locked: false,
          title: t.title,
          chapterGate: t.chapterGate,
          bookId: t.bookId,
          isSystem: t.isSystem,
          author: t.author ? toUserSummary(t.author) : null,
          postCount: t.postCount,
          lastPostAt: t.lastPostAt.toISOString(),
          createdAt: t.createdAt.toISOString(),
        }),
      ),
      ...locked.map((t): ThreadListItem => ({ id: t.id, locked: true, chapterGate: t.chapterGate, bookId: t.bookId })),
    ];
  }

  /** Loads a thread the user may read, or throws (not a member / spoiler-locked). */
  async viewableThread(threadId: string, userId: string): Promise<{ thread: Thread; chapter: number }> {
    const thread = await this.prisma.thread.findFirst({ where: { id: threadId, deletedAt: null } });
    if (!thread) throw notFound('Thread');
    await this.access.requireMember(thread.clubId, userId);
    const chapter = thread.bookId ? await this.access.chapterFor(userId, thread.bookId) : FINISHED;
    if (thread.chapterGate > chapter) throw spoilerLocked(thread.chapterGate);
    return { thread, chapter };
  }

  async canView(threadId: string, userId: string): Promise<boolean> {
    try {
      await this.viewableThread(threadId, userId);
      return true;
    } catch {
      return false;
    }
  }

  async getThread(threadId: string, userId: string): Promise<ThreadDetail> {
    const { thread, chapter } = await this.viewableThread(threadId, userId);
    const full = await this.prisma.thread.findUniqueOrThrow({
      where: { id: thread.id },
      include: { author: { select: userSummarySelect }, book: { include: bookInclude } },
    });
    return {
      id: full.id,
      clubId: full.clubId,
      title: full.title,
      chapterGate: full.chapterGate,
      book: full.book ? toBookSummary(full.book) : null,
      isSystem: full.isSystem,
      author: full.author ? toUserSummary(full.author) : null,
      createdAt: full.createdAt.toISOString(),
      myChapter: thread.bookId ? (chapter >= FINISHED ? null : chapter) : null,
    };
  }

  async createThread(clubId: string, user: AuthUser, input: CreateThreadInput): Promise<ThreadDetail> {
    await this.access.requireMember(clubId, user.id);
    await this.redis.rateLimit(`thread:${user.id}`, 10, 3600, "You've started a lot of threads. Try again later.");
    const club = await this.access.club(clubId);
    const bookId = input.bookId === undefined ? club.currentBookId : input.bookId;
    const thread = await this.prisma.thread.create({
      data: {
        clubId,
        bookId,
        title: input.title,
        chapterGate: bookId ? input.chapterGate : 0,
        authorId: user.id,
        postCount: 1,
        posts: { create: { authorId: user.id, body: input.body } },
      },
    });
    this.realtime.emit(`club:${clubId}`, 'thread:new', { clubId, threadId: thread.id });
    return this.getThread(thread.id, user.id);
  }

  async listPosts(threadId: string, userId: string, cursor: string | undefined, limit: number): Promise<Paged<PostItem>> {
    const { thread, chapter } = await this.viewableThread(threadId, userId);
    const blocks = await this.prisma.block.findMany({ where: { blockerId: userId }, select: { blockedId: true } });
    const blocked = new Set(blocks.map((b) => b.blockedId));

    const page = { threadId: thread.id, ...(cursor ? { id: { gt: cursor } } : {}) };
    const [visible, locked] = await Promise.all([
      this.prisma.post.findMany({
        where: { ...page, OR: [{ chapterRef: null }, { chapterRef: { lte: chapter } }] },
        include: { author: { select: userSummarySelect } },
        orderBy: { id: 'asc' },
        take: limit + 1,
      }),
      // Replies about later chapters: placeholder only, body never selected.
      this.prisma.post.findMany({
        where: { ...page, chapterRef: { gt: chapter } },
        select: { id: true, chapterRef: true, createdAt: true },
        orderBy: { id: 'asc' },
        take: limit + 1,
      }),
    ]);

    type Row = { id: string; item: PostItem };
    const rows: Row[] = [
      ...visible.map((p): Row => {
        if (p.deletedAt) return { id: p.id, item: { id: p.id, locked: false, hidden: true, reason: 'deleted', createdAt: p.createdAt.toISOString() } };
        if (blocked.has(p.authorId)) return { id: p.id, item: { id: p.id, locked: false, hidden: true, reason: 'blocked', createdAt: p.createdAt.toISOString() } };
        return {
          id: p.id,
          item: {
            id: p.id,
            locked: false,
            hidden: false,
            body: p.body,
            chapterRef: p.chapterRef,
            author: toUserSummary(p.author),
            createdAt: p.createdAt.toISOString(),
            editedAt: p.editedAt?.toISOString() ?? null,
            mine: p.authorId === userId,
          },
        };
      }),
      ...locked.map((p): Row => ({ id: p.id, item: { id: p.id, locked: true, chapterRef: p.chapterRef!, createdAt: p.createdAt.toISOString() } })),
    ].sort((a, b) => (a.id < b.id ? -1 : 1));
    return toPage(rows, limit, (r) => r.item);
  }

  async createPost(threadId: string, user: AuthUser, input: CreatePostInput): Promise<PostItem> {
    const { thread } = await this.viewableThread(threadId, user.id);
    await this.redis.rateLimit(`post:${user.id}`, 30, 600, "You're posting very quickly. Take a breath and try again.");
    // A reply inherits the thread's gate unless it names a higher chapter.
    const chapterRef = thread.bookId && input.chapterRef && input.chapterRef > thread.chapterGate ? input.chapterRef : null;
    const post = await this.prisma.$transaction(async (tx) => {
      const p = await tx.post.create({
        data: { threadId, authorId: user.id, body: input.body, chapterRef },
        include: { author: { select: userSummarySelect } },
      });
      await tx.thread.update({ where: { id: threadId }, data: { postCount: { increment: 1 }, lastPostAt: p.createdAt } });
      return p;
    });

    // Clients refetch over REST on this event, so per-post gates apply to everyone.
    this.realtime.emit(`thread:${threadId}`, 'post:new', { threadId, postId: post.id });

    const participants = await this.prisma.post.findMany({
      where: { threadId, deletedAt: null },
      distinct: ['authorId'],
      select: { authorId: true },
      take: 100,
    });
    const club = await this.access.club(thread.clubId);
    await this.notifications.notify(
      participants.map((p) => p.authorId),
      {
        type: 'reply',
        title: `${user.displayName} replied in "${thread.title}"`,
        body: chapterRef ? `Mentions chapter ${chapterRef}` : input.body.slice(0, 140),
        url: `/clubs/${club.slug}/threads/${threadId}`,
      },
      {},
      user.id,
    );

    return {
      id: post.id,
      locked: false,
      hidden: false,
      body: post.body,
      chapterRef: post.chapterRef,
      author: toUserSummary(post.author),
      createdAt: post.createdAt.toISOString(),
      editedAt: null,
      mine: true,
    };
  }

  async editPost(postId: string, user: AuthUser, body: string) {
    const post = await this.prisma.post.findFirst({ where: { id: postId, deletedAt: null } });
    if (!post) throw notFound('Post');
    if (post.authorId !== user.id) throw forbidden('You can only edit your own posts');
    await this.viewableThread(post.threadId, user.id);
    await this.prisma.post.update({ where: { id: postId }, data: { body, editedAt: new Date() } });
    this.realtime.emit(`thread:${post.threadId}`, 'post:updated', { threadId: post.threadId, postId });
    return { ok: true };
  }

  async deletePost(postId: string, user: AuthUser) {
    const post = await this.prisma.post.findFirst({ where: { id: postId, deletedAt: null }, include: { thread: true } });
    if (!post) throw notFound('Post');
    if (post.authorId !== user.id) await this.access.requireAdmin(post.thread.clubId, user.id);
    await this.prisma.post.update({ where: { id: postId }, data: { deletedAt: new Date() } });
    this.realtime.emit(`thread:${post.threadId}`, 'post:updated', { threadId: post.threadId, postId });
    return { ok: true };
  }

  async deleteThread(threadId: string, user: AuthUser) {
    const thread = await this.prisma.thread.findFirst({ where: { id: threadId, deletedAt: null } });
    if (!thread) throw notFound('Thread');
    if (thread.authorId !== user.id) await this.access.requireAdmin(thread.clubId, user.id);
    await this.prisma.thread.update({ where: { id: threadId }, data: { deletedAt: new Date() } });
    return { ok: true };
  }
}
