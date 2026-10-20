/**
 * Authorization integration tests against a real Postgres (the bnw_test database) and Redis db 1.
 * Covers the rules the architecture doc calls out: club membership, spoiler gates (thread and
 * per-post), DM eligibility and blocks.
 */
import { execSync } from 'node:child_process';

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgresql://bnw:bnw@localhost:5433/bnw_test?schema=public';
process.env.REDIS_URL = process.env.TEST_REDIS_URL ?? 'redis://localhost:6380/1';
process.env.MEILI_URL = '';
process.env.SMTP_URL = '';

import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { INestApplicationContext } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { BooksModule } from './books/books.controller';
import { BooksService } from './books/books.service';
import { createBook } from './books/book-factory';
import { ClubsModule } from './clubs/clubs.module';
import { ClubsService } from './clubs/clubs.service';
import type { AuthUser } from './common/http';
import { AccessService } from './core/access.service';
import { CoreModule } from './core/core.module';
import { PrismaService } from './core/prisma.service';
import { RedisService } from './core/redis.service';
import { DiscussionModule } from './discussion/discussion.module';
import { DiscussionService } from './discussion/discussion.service';
import { DmsModule } from './dms/dms.module';
import { DmsService } from './dms/dms.service';

@Module({ imports: [CoreModule, AuthModule, BooksModule, ClubsModule, DiscussionModule, DmsModule] })
class TestModule {}

describe('authorization (integration)', () => {
  let app: INestApplicationContext;
  let prisma: PrismaService;
  let clubs: ClubsService;
  let discussion: DiscussionService;
  let dms: DmsService;
  let books: BooksService;
  let access: AccessService;
  const users: Record<string, AuthUser> = {};
  let clubId: string;
  let bookId: string;

  const mkUser = async (key: string, daysOld = 30): Promise<AuthUser> => {
    const createdAt = new Date(Date.now() - daysOld * 86400000);
    const u = await prisma.user.create({
      data: { email: `${key}@test.local`, displayName: key, onboardedAt: new Date(), createdAt, settings: { create: {} } },
    });
    return { id: u.id, email: u.email, displayName: key, isAdmin: false, city: null, createdAt, sessionId: 'test' };
  };

  beforeAll(async () => {
    execSync('npx prisma migrate deploy', { env: process.env, stdio: 'ignore' });
    const moduleRef = await Test.createTestingModule({ imports: [TestModule] }).compile();
    app = await moduleRef.init();
    prisma = app.get(PrismaService);
    clubs = app.get(ClubsService);
    discussion = app.get(DiscussionService);
    dms = app.get(DmsService);
    books = app.get(BooksService);
    access = app.get(AccessService);
    await app.get(RedisService).client.flushdb();
    await prisma.$executeRawUnsafe(`TRUNCATE users, books, authors CASCADE`);

    for (const k of ['owner', 'early', 'late', 'outsider', 'blocker']) users[k] = await mkUser(k);
    users.fresh = await mkUser('fresh', 1);
    bookId = await createBook(prisma, { title: 'Test Book', authors: ['Author'], source: 'seed', chapterCount: 12 });

    const club = await clubs.create(users.owner, { name: 'Test Club', language: 'en', visibility: 'public' });
    clubId = club.id;
    for (const k of ['early', 'late', 'blocker', 'fresh']) await clubs.join(clubId, users[k]);
    await clubs.setBook(clubId, users.owner, { bookId, startsOn: new Date(), totalChapters: 12, chaptersPerWeek: 4 });

    await books.setStatus(users.owner.id, bookId, { status: 'read' });
    await books.setStatus(users.early.id, bookId, { status: 'reading', currentChapter: 2 });
    await books.setStatus(users.late.id, bookId, { status: 'reading', currentChapter: 8 });
  });

  afterAll(async () => {
    await app?.close();
  });

  const weekThread = (week: number) =>
    prisma.thread.findFirstOrThrow({ where: { clubId, scheduleWeek: week } });

  describe('spoiler gates', () => {
    it('creates intro, weekly and finished threads with the right gates', async () => {
      const threads = await prisma.thread.findMany({ where: { clubId }, orderBy: { chapterGate: 'asc' } });
      expect(threads.map((t) => t.chapterGate)).toEqual([0, 4, 8, 12, 12]);
    });

    it('hides locked thread titles from readers below the gate', async () => {
      const list = await discussion.listThreads(clubId, users.early.id);
      const locked = list.filter((t) => t.locked);
      expect(locked).toHaveLength(4);
      for (const t of locked) expect(t).not.toHaveProperty('title');
      const open = list.filter((t) => !t.locked);
      expect(open).toHaveLength(1);
    });

    it('opens threads as the reader progresses', async () => {
      const list = await discussion.listThreads(clubId, users.late.id);
      expect(list.filter((t) => !t.locked)).toHaveLength(3); // intro, week 1 (4), week 2 (8)
    });

    it('readers who finished see everything', async () => {
      const list = await discussion.listThreads(clubId, users.owner.id);
      expect(list.every((t) => !t.locked)).toBe(true);
    });

    it('rejects reading or posting in a locked thread', async () => {
      const w2 = await weekThread(2);
      await expect(discussion.getThread(w2.id, users.early.id)).rejects.toMatchObject({ code: 'SPOILER_LOCKED' });
      await expect(discussion.createPost(w2.id, users.early, { body: 'hi' })).rejects.toMatchObject({ code: 'SPOILER_LOCKED' });
    });

    it('hides a reply about a later chapter, without sending its body', async () => {
      const w1 = await weekThread(1);
      await discussion.createPost(w1.id, users.owner, { body: 'Ending reveal!', chapterRef: 11 });
      await discussion.createPost(w1.id, users.owner, { body: 'Safe reply', chapterRef: 3 });
      const forLate = await discussion.listPosts(w1.id, users.late.id, undefined, 50);
      const locked = forLate.items.find((p) => p.locked);
      expect(locked).toMatchObject({ locked: true, chapterRef: 11 });
      expect(JSON.stringify(forLate)).not.toContain('Ending reveal');
      expect(JSON.stringify(forLate)).toContain('Safe reply');
      const forOwner = await discussion.listPosts(w1.id, users.owner.id, undefined, 50);
      expect(JSON.stringify(forOwner)).toContain('Ending reveal');
    });

    it('treats a chapterRef at or below the thread gate as inheriting the gate', async () => {
      const w2 = await weekThread(2);
      const post = await discussion.createPost(w2.id, users.late, { body: 'ok', chapterRef: 5 });
      expect(post).toMatchObject({ chapterRef: null });
    });

    it('blocks non-members from club discussion', async () => {
      await expect(discussion.listThreads(clubId, users.outsider.id)).rejects.toMatchObject({ status: 403 });
    });
  });

  describe('club-scoped DMs', () => {
    it('allows members who share a club', async () => {
      expect(await access.dmEligibility(users.early.id, users.late.id)).toEqual({ ok: true });
    });

    it('rejects people who share no club', async () => {
      await expect(dms.start(users.early, users.outsider.id, 'hello')).rejects.toMatchObject({ status: 403 });
    });

    it('rejects links in a first message', async () => {
      await expect(dms.start(users.late, users.early.id, 'see https://example.com')).rejects.toMatchObject({ code: 'DM_FIRST_MESSAGE' });
    });

    it('limits new conversations for young accounts', async () => {
      // fresh is 1 day old: 5 new conversations a day.
      const targets: AuthUser[] = [];
      for (let i = 0; i < 6; i++) {
        const u = await mkUser(`peer${i}`);
        await clubs.join(clubId, u);
        targets.push(u);
      }
      for (let i = 0; i < 5; i++) await dms.start(users.fresh, targets[i].id, 'hi');
      await expect(dms.start(users.fresh, targets[5].id, 'hi')).rejects.toMatchObject({ code: 'RATE_LIMITED' });
    });

    it('makes a conversation read-only after a block', async () => {
      const { conversationId } = await dms.start(users.blocker, users.early.id, 'hello there');
      await prisma.block.create({ data: { blockerId: users.blocker.id, blockedId: users.early.id } });
      await expect(dms.send(conversationId, users.early, 'reply')).rejects.toMatchObject({ status: 403 });
      const conv = await dms.conversation(conversationId, users.early.id);
      expect(conv.readOnly).toBe(true);
    });

    it('makes a conversation read-only once they stop sharing a club', async () => {
      const { conversationId } = await dms.start(users.late, users.owner.id, 'hey');
      await clubs.leave(clubId, users.late);
      await expect(dms.send(conversationId, users.late, 'still there?')).rejects.toMatchObject({ status: 403 });
    });

    it('hides posts by blocked readers', async () => {
      const intro = await weekThread(0);
      await discussion.createPost(intro.id, users.early, { body: 'from early' });
      const page = await discussion.listPosts(intro.id, users.blocker.id, undefined, 50);
      expect(page.items.find((p) => !p.locked && p.hidden && p.reason === 'blocked')).toBeDefined();
      expect(JSON.stringify(page)).not.toContain('from early');
    });
  });

  describe('roles', () => {
    it('only admins can set the book', async () => {
      await expect(
        clubs.setBook(clubId, users.early, { bookId, startsOn: new Date(), totalChapters: 12, chaptersPerWeek: 4 }),
      ).rejects.toMatchObject({ status: 403 });
    });

    it('the owner cannot leave while others remain', async () => {
      await expect(clubs.leave(clubId, users.owner)).rejects.toMatchObject({ status: 400 });
    });
  });

  describe('message board', () => {
    let postId: string;
    let commentId: string;

    it('shows posts in the feed with a comment count, not the comments', async () => {
      const post = await discussion.postToBoard(clubId, users.owner, { title: 'Meetup photos', body: 'Thanks all!', mediaIds: [] });
      postId = post.id;
      const c = await discussion.reply(postId, users.early, 'Lovely morning');
      commentId = c.id;
      const feed = await discussion.board(clubId, users.early.id, undefined, 10);
      const item = feed.items.find((p) => p.id === postId)!;
      expect(item.title).toBe('Meetup photos');
      expect(item.commentCount).toBe(1);
      expect(item.replies).toEqual([]);
    });

    it('nests replies to comments and returns the whole tree on the post page', async () => {
      const r = await discussion.reply(commentId, users.owner, 'Agreed!');
      await discussion.reply(r.id, users.early, 'Same time next week?');
      const detail = await discussion.boardPost(postId, users.early.id);
      expect(detail.commentCount).toBe(3);
      expect(detail.replies).toHaveLength(1);
      expect(detail.replies[0].replies[0].body).toBe('Agreed!');
      expect(detail.replies[0].replies[0].replies[0].body).toBe('Same time next week?');
      const feed = await discussion.board(clubId, users.early.id, undefined, 10);
      expect(feed.items.find((p) => p.id === postId)!.commentCount).toBe(3);
    });

    it('toggles 👍 and ❤️ reactions on posts and comments', async () => {
      expect(await discussion.react(postId, users.early, 'like')).toEqual({ like: 1, love: 0, mine: ['like'] });
      expect(await discussion.react(postId, users.early, 'love')).toMatchObject({ like: 1, love: 1 });
      expect(await discussion.react(postId, users.early, 'like')).toEqual({ like: 0, love: 1, mine: ['love'] });
      expect(await discussion.react(commentId, users.owner, 'love')).toEqual({ like: 0, love: 1, mine: ['love'] });
      const detail = await discussion.boardPost(postId, users.owner.id);
      expect(detail.reactions).toEqual({ like: 0, love: 1, mine: [] });
      expect(detail.replies[0].reactions).toEqual({ like: 0, love: 1, mine: ['love'] });
    });

    it('keeps non-members out', async () => {
      await expect(discussion.board(clubId, users.outsider.id, undefined, 10)).rejects.toMatchObject({ status: 403 });
      await expect(discussion.boardPost(postId, users.outsider.id)).rejects.toMatchObject({ status: 403 });
      await expect(discussion.react(postId, users.outsider, 'like')).rejects.toMatchObject({ status: 403 });
    });
  });
});
