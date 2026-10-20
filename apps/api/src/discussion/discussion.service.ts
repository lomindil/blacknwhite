import type { BoardEntry, BoardPostInput, CreatePostInput, ReactionKind, Reactions, CreateThreadInput, PostItem, ThreadDetail, ThreadListItem } from '@bnw/shared';
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
import { toMediaInfo } from '../media/media.module';

type BoardRow = Prisma.PostGetPayload<{ include: { author: { select: typeof userSummarySelect } } }> & {
  media?: { id: string; key: string; width: number; height: number }[];
};

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
      isBoard: false,
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
        where: { clubId, deletedAt: null, isBoard: false, bookId: { not: null }, NOT: unlockedWhere },
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
        group: { key: `thread:${threadId}`, actor: { id: user.id, name: user.displayName }, title: (who) => `${who} replied in "${thread.title}"` },
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

  // ---------- Message board ----------

  /** Each club has one board thread, created on first use. */
  private async boardThread(clubId: string) {
    const existing = await this.prisma.thread.findFirst({ where: { clubId, isBoard: true, deletedAt: null } });
    if (existing) return existing;
    return this.prisma.thread.create({ data: { clubId, title: 'Message board', isBoard: true, isSystem: true, postCount: 0 } });
  }

  private async blockedBy(userId: string) {
    const rows = await this.prisma.block.findMany({ where: { blockerId: userId }, select: { blockedId: true } });
    return new Set(rows.map((r) => r.blockedId));
  }

  /** 👍/❤️ counts per post, plus which ones this reader gave. */
  private async reactionsFor(postIds: string[], userId: string): Promise<Map<string, Reactions>> {
    const map = new Map<string, Reactions>(postIds.map((id) => [id, { like: 0, love: 0, mine: [] }]));
    if (!postIds.length) return map;
    const [counts, mine] = await Promise.all([
      this.prisma.postReaction.groupBy({ by: ['postId', 'kind'], where: { postId: { in: postIds } }, _count: { _all: true } }),
      this.prisma.postReaction.findMany({ where: { postId: { in: postIds }, userId }, select: { postId: true, kind: true } }),
    ]);
    for (const c of counts) map.get(c.postId)![c.kind] = c._count._all;
    for (const m of mine) map.get(m.postId)!.mine.push(m.kind);
    return map;
  }

  private toEntry(
    p: BoardRow,
    userId: string,
    blocked: Set<string>,
    reactions: Map<string, Reactions>,
    extra: { commentCount?: number; replies?: BoardEntry[] } = {},
  ): BoardEntry {
    const hidden = p.deletedAt ? 'deleted' : blocked.has(p.authorId) ? 'blocked' : null;
    return {
      id: p.id,
      parentId: p.parentId,
      title: hidden ? null : (p.title ?? null),
      body: hidden ? null : p.body,
      images: hidden ? [] : (p.media ?? []).map(toMediaInfo),
      hiddenReason: hidden,
      author: toUserSummary(p.author),
      createdAt: p.createdAt.toISOString(),
      editedAt: p.editedAt?.toISOString() ?? null,
      mine: p.authorId === userId,
      commentCount: extra.commentCount ?? 0,
      reactions: reactions.get(p.id) ?? { like: 0, love: 0, mine: [] },
      replies: extra.replies ?? [],
    };
  }

  /** The feed: newest posts first, with comment counts and reactions (comments load on the post page). */
  async board(clubId: string, userId: string, cursor: string | undefined, limit: number): Promise<Paged<BoardEntry>> {
    await this.access.requireMember(clubId, userId);
    const thread = await this.boardThread(clubId);
    const blocked = await this.blockedBy(userId);
    const rows = await this.prisma.post.findMany({
      where: {
        threadId: thread.id,
        parentId: null,
        // Removed posts disappear, unless people had already commented on them.
        OR: [{ deletedAt: null }, { descendants: { some: { deletedAt: null } } }],
        ...(cursor ? { id: { lt: cursor } } : {}),
      },
      include: {
        author: { select: userSummarySelect },
        media: { orderBy: { position: 'asc' } },
        _count: { select: { descendants: { where: { deletedAt: null } } } },
      },
      orderBy: { id: 'desc' },
      take: limit + 1,
    });
    const reactions = await this.reactionsFor(rows.map((r) => r.id), userId);
    return toPage(rows, limit, (p) => this.toEntry(p, userId, blocked, reactions, { commentCount: p._count.descendants }));
  }

  /** One post with its whole comment tree. */
  async boardPost(postId: string, userId: string): Promise<BoardEntry & { clubId: string }> {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, parentId: null, thread: { isBoard: true } },
      include: { author: { select: userSummarySelect }, media: { orderBy: { position: 'asc' } }, thread: true },
    });
    if (!post) throw notFound('Post');
    await this.access.requireMember(post.thread.clubId, userId);
    const [comments, blocked] = await Promise.all([
      this.prisma.post.findMany({ where: { rootId: post.id }, include: { author: { select: userSummarySelect } }, orderBy: { id: 'asc' } }),
      this.blockedBy(userId),
    ]);
    const reactions = await this.reactionsFor([post.id, ...comments.map((c) => c.id)], userId);

    // Build the tree. Removed comments stay as placeholders only if someone replied to them.
    const children = new Map<string, typeof comments>();
    for (const c of comments) children.set(c.parentId!, [...(children.get(c.parentId!) ?? []), c]);
    const build = (parentId: string): BoardEntry[] =>
      (children.get(parentId) ?? []).flatMap((c) => {
        const replies = build(c.id);
        if (c.deletedAt && !replies.length) return [];
        return [this.toEntry(c, userId, blocked, reactions, { replies, commentCount: replies.length })];
      });
    const tree = build(post.id);
    const live = comments.filter((c) => !c.deletedAt).length;
    if (post.deletedAt && !live) throw notFound('Post');
    return { ...this.toEntry(post, userId, blocked, reactions, { commentCount: live, replies: tree }), clubId: post.thread.clubId };
  }

  async postToBoard(clubId: string, user: AuthUser, input: BoardPostInput): Promise<BoardEntry> {
    await this.access.requireMember(clubId, user.id);
    await this.redis.rateLimit(`board:${user.id}`, 20, 600, "You're posting very quickly. Take a breath and try again.");
    const thread = await this.boardThread(clubId);
    const mediaIds = [...new Set(input.mediaIds)];
    if (mediaIds.length) {
      const owned = await this.prisma.media.count({ where: { id: { in: mediaIds }, ownerId: user.id, postId: null } });
      if (owned !== mediaIds.length) throw notFound('Photo');
    }
    const post = await this.prisma.$transaction(async (tx) => {
      const p = await tx.post.create({ data: { threadId: thread.id, authorId: user.id, title: input.title, body: input.body } });
      for (let i = 0; i < mediaIds.length; i++) {
        await tx.media.update({ where: { id: mediaIds[i] }, data: { postId: p.id, position: i } });
      }
      await tx.thread.update({ where: { id: thread.id }, data: { postCount: { increment: 1 }, lastPostAt: p.createdAt } });
      return tx.post.findUniqueOrThrow({
        where: { id: p.id },
        include: { author: { select: userSummarySelect }, media: { orderBy: { position: 'asc' } } },
      });
    });
    this.realtime.emit(`club:${clubId}`, 'board:new', { clubId });
    return this.toEntry(post, user.id, new Set(), new Map());
  }

  /** Comment on a post, or reply to a comment (any depth). Same membership, spoiler and block rules as posting. */
  async reply(postId: string, user: AuthUser, body: string): Promise<BoardEntry> {
    const parent = await this.prisma.post.findFirst({ where: { id: postId, deletedAt: null }, include: { thread: true } });
    if (!parent) throw notFound('Post');
    const { thread, chapter } = await this.viewableThread(parent.threadId, user.id);
    if (parent.chapterRef && parent.chapterRef > chapter) throw spoilerLocked(parent.chapterRef);
    if (await this.access.blockedEither(user.id, parent.authorId)) throw forbidden("You can't reply to this reader");
    await this.redis.rateLimit(`post:${user.id}`, 30, 600, "You're posting very quickly. Take a breath and try again.");
    const rootId = parent.rootId ?? parent.id;

    const reply = await this.prisma.$transaction(async (tx) => {
      const r = await tx.post.create({
        data: { threadId: thread.id, authorId: user.id, body, parentId: parent.id, rootId, chapterRef: parent.chapterRef },
        include: { author: { select: userSummarySelect } },
      });
      await tx.thread.update({ where: { id: thread.id }, data: { postCount: { increment: 1 }, lastPostAt: r.createdAt } });
      return r;
    });

    const club = await this.access.club(thread.clubId);
    if (thread.isBoard) this.realtime.emit(`club:${thread.clubId}`, 'board:new', { clubId: thread.clubId, postId: rootId });
    else this.realtime.emit(`thread:${thread.id}`, 'post:new', { threadId: thread.id, postId: reply.id });

    const root = rootId === parent.id ? parent : await this.prisma.post.findUnique({ where: { id: rootId } });
    const url = thread.isBoard ? `/clubs/${club.slug}/board/${rootId}` : `/clubs/${club.slug}/threads/${thread.id}`;
    const excerpt = parent.chapterRef ? `Mentions chapter ${parent.chapterRef}` : body.slice(0, 140);
    await this.notifications.notify(
      [parent.authorId],
      {
        type: 'reply',
        title: `${user.displayName} replied to your ${parent.parentId ? 'comment' : 'post'} in ${club.name}`,
        body: excerpt,
        url,
        group: { key: `reply:${parent.id}`, actor: { id: user.id, name: user.displayName }, title: (who) => `${who} replied to your ${parent.parentId ? 'comment' : 'post'} in ${club.name}` },
      },
      {},
      user.id,
    );
    if (root && root.authorId !== parent.authorId) {
      await this.notifications.notify(
        [root.authorId],
        {
          type: 'reply',
          title: `${user.displayName} commented on your post${root.title ? ` “${root.title}”` : ''}`,
          body: excerpt,
          url,
          group: { key: `post:${root.id}`, actor: { id: user.id, name: user.displayName }, title: (who) => `${who} commented on your post${root.title ? ` “${root.title}”` : ''}` },
        },
        {},
        user.id,
      );
    }
    return this.toEntry(reply, user.id, new Set(), new Map());
  }

  /** Toggle 👍 or ❤️ on a post or comment. */
  async react(postId: string, user: AuthUser, kind: ReactionKind): Promise<Reactions> {
    const post = await this.prisma.post.findFirst({ where: { id: postId, deletedAt: null } });
    if (!post) throw notFound('Post');
    const { chapter } = await this.viewableThread(post.threadId, user.id);
    if (post.chapterRef && post.chapterRef > chapter) throw spoilerLocked(post.chapterRef);
    await this.redis.rateLimit(`react:${user.id}`, 120, 60);
    const key = { postId_userId_kind: { postId, userId: user.id, kind } };
    const existing = await this.prisma.postReaction.findUnique({ where: key });
    if (existing) await this.prisma.postReaction.delete({ where: key });
    else await this.prisma.postReaction.create({ data: { postId, userId: user.id, kind } });
    const thread = await this.prisma.thread.findUniqueOrThrow({ where: { id: post.threadId } });
    if (thread.isBoard) this.realtime.emit(`club:${thread.clubId}`, 'board:reaction', { postId });
    return (await this.reactionsFor([postId], user.id)).get(postId)!;
  }
}
