import { blogListQuery, blogPostSchema, slugify } from '@bnw/shared';
import type { BlogDetail, BlogPostInput, BlogSummary } from '@bnw/shared';
import { Controller, Delete, Get, HttpCode, Injectable, Module, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import { BlogStatus, Prisma } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { forbidden, notFound } from '../common/errors';
import { AuthUser, CurrentUser, Paged, Public, ZBody, ZQuery } from '../common/http';
import { toUserSummary, userSummarySelect } from '../common/mappers';
import { env } from '../config/env';
import { NotificationsService } from '../core/notifications.service';
import { PrismaService } from '../core/prisma.service';
import { RedisService } from '../core/redis.service';
import { toMediaInfo } from '../media/media.module';

/** Accounts younger than this publish into the review queue instead of going live. */
export const NEW_ACCOUNT_REVIEW_DAYS = 7;

const blogInclude = {
  author: { select: userSummarySelect },
  cover: true,
} satisfies Prisma.BlogPostInclude;
type BlogRow = Prisma.BlogPostGetPayload<{ include: typeof blogInclude }>;

function excerptOf(body: string, max = 220) {
  const plain = body
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`|~-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > max ? `${plain.slice(0, max - 1).trimEnd()}…` : plain;
}

export function toBlogSummary(b: BlogRow): BlogSummary {
  return {
    id: b.id,
    slug: b.slug,
    title: b.title,
    excerpt: b.excerpt || excerptOf(b.body),
    tags: b.tags,
    cover: b.cover ? toMediaInfo(b.cover) : null,
    author: toUserSummary(b.author),
    status: b.status,
    publishedAt: b.publishedAt?.toISOString() ?? null,
    updatedAt: b.updatedAt.toISOString(),
    likeCount: b.likeCount,
    readMinutes: b.readMinutes,
  };
}

/** Community blog (business plan: "anyone can write; best posts surface"). */
@Injectable()
export class BlogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly notifications: NotificationsService,
  ) {}

  private needsReview(user: AuthUser) {
    return !user.isAdmin && Date.now() - user.createdAt.getTime() < NEW_ACCOUNT_REVIEW_DAYS * 86400000;
  }

  /** Cover + photos referenced in the body (by /media/ key) are attached to the post. */
  private async attachMedia(tx: Prisma.TransactionClient, postId: string, user: AuthUser, input: BlogPostInput) {
    const base = env().MEDIA_BASE_URL.replace(/\/$/, '');
    const keys = [...input.body.matchAll(/\/media\/([\w/.-]+\.webp)/g)].map((m) => m[1]);
    if (base !== '/media') keys.push(...[...input.body.matchAll(new RegExp(`${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/([\\w/.-]+\\.webp)`, 'g'))].map((m) => m[1]));
    if (keys.length) {
      await tx.media.updateMany({ where: { key: { in: keys }, ownerId: user.id, postId: null }, data: { blogPostId: postId } });
    }
    if (input.coverMediaId) {
      const cover = await tx.media.findFirst({ where: { id: input.coverMediaId, ownerId: user.id, postId: null } });
      if (!cover) throw notFound('Cover photo');
      await tx.media.update({ where: { id: cover.id }, data: { blogPostId: postId } });
    }
  }

  private fields(input: BlogPostInput) {
    const words = input.body.split(/\s+/).filter(Boolean).length;
    return {
      title: input.title,
      excerpt: input.excerpt || null,
      body: input.body,
      tags: [...new Set(input.tags)],
      coverMediaId: input.coverMediaId ?? null,
      readMinutes: Math.max(1, Math.round(words / 200)),
    };
  }

  private nextStatus(user: AuthUser, publish: boolean, current?: BlogStatus): { status: BlogStatus; publishedAt?: Date } {
    if (!publish) return { status: current === 'published' ? 'published' : 'draft' };
    if (current === 'published') return { status: 'published' };
    if (this.needsReview(user)) return { status: 'pending' };
    return { status: 'published', publishedAt: new Date() };
  }

  async create(user: AuthUser, input: BlogPostInput): Promise<BlogDetail> {
    await this.redis.rateLimit(`blog:${user.id}`, 10, 24 * 3600, "You've written a lot today. Try again tomorrow.");
    const slug = `${slugify(input.title) || 'post'}-${randomBytes(3).toString('hex')}`;
    const { status, publishedAt } = this.nextStatus(user, input.publish);
    const post = await this.prisma.$transaction(async (tx) => {
      const p = await tx.blogPost.create({ data: { ...this.fields({ ...input, coverMediaId: null }), slug, authorId: user.id, status, publishedAt } });
      await this.attachMedia(tx, p.id, user, input);
      if (input.coverMediaId) await tx.blogPost.update({ where: { id: p.id }, data: { coverMediaId: input.coverMediaId } });
      return p;
    });
    return this.get(post.slug, user);
  }

  async update(id: string, user: AuthUser, input: BlogPostInput): Promise<BlogDetail> {
    const post = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!post || post.status === 'removed') throw notFound('Post');
    if (post.authorId !== user.id) throw forbidden('Only the author can edit this post');
    const { status, publishedAt } = this.nextStatus(user, input.publish, post.status);
    await this.prisma.$transaction(async (tx) => {
      await this.attachMedia(tx, id, user, input);
      await tx.blogPost.update({ where: { id }, data: { ...this.fields(input), status, ...(publishedAt ? { publishedAt } : {}) } });
    });
    return this.get(post.slug, user);
  }

  async remove(id: string, user: AuthUser) {
    const post = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!post) throw notFound('Post');
    if (post.authorId !== user.id) throw forbidden('Only the author can delete this post');
    await this.prisma.blogPost.delete({ where: { id } });
    return { ok: true };
  }

  async list(q: z.infer<typeof blogListQuery>): Promise<Paged<BlogSummary>> {
    const rows = await this.prisma.blogPost.findMany({
      where: { status: 'published', ...(q.tag ? { tags: { has: q.tag } } : {}) },
      include: blogInclude,
      orderBy: q.sort === 'top' ? [{ likeCount: 'desc' }, { publishedAt: 'desc' }, { id: 'desc' }] : [{ publishedAt: 'desc' }, { id: 'desc' }],
      take: q.limit + 1,
      ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > q.limit;
    const page = hasMore ? rows.slice(0, q.limit) : rows;
    return { items: page.map(toBlogSummary), nextCursor: hasMore ? page[page.length - 1].id : null };
  }

  async tags(): Promise<{ tag: string; count: number }[]> {
    return this.prisma.$queryRaw<{ tag: string; count: number }[]>`
      SELECT tag, COUNT(*)::int AS count FROM blog_posts, unnest(tags) AS tag
      WHERE status = 'published' GROUP BY tag ORDER BY count DESC, tag LIMIT 20`;
  }

  async get(slug: string, user?: AuthUser): Promise<BlogDetail> {
    const post = await this.prisma.blogPost.findUnique({ where: { slug }, include: blogInclude });
    const mine = Boolean(user && post?.authorId === user.id);
    if (!post || (post.status !== 'published' && !mine)) throw notFound('Post');
    const liked = user ? await this.prisma.blogLike.findUnique({ where: { postId_userId: { postId: post.id, userId: user.id } } }) : null;
    return { ...toBlogSummary(post), body: post.body, likedByMe: Boolean(liked), mine };
  }

  async mine(userId: string): Promise<BlogSummary[]> {
    const rows = await this.prisma.blogPost.findMany({
      where: { authorId: userId, status: { not: 'removed' } },
      include: blogInclude,
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map(toBlogSummary);
  }

  async toggleLike(id: string, user: AuthUser) {
    const post = await this.prisma.blogPost.findFirst({ where: { id, status: 'published' } });
    if (!post) throw notFound('Post');
    await this.redis.rateLimit(`blog:like:${user.id}`, 120, 60);
    const key = { postId_userId: { postId: id, userId: user.id } };
    const existing = await this.prisma.blogLike.findUnique({ where: key });
    const updated = await this.prisma.$transaction(async (tx) => {
      if (existing) await tx.blogLike.delete({ where: key });
      else await tx.blogLike.create({ data: { postId: id, userId: user.id } });
      return tx.blogPost.update({ where: { id }, data: { likeCount: { increment: existing ? -1 : 1 } } });
    });
    return { liked: !existing, likeCount: updated.likeCount };
  }

  /** Admin portal review queue. */
  async pending(): Promise<BlogSummary[]> {
    const rows = await this.prisma.blogPost.findMany({ where: { status: 'pending' }, include: blogInclude, orderBy: { updatedAt: 'asc' } });
    return rows.map(toBlogSummary);
  }

  async review(id: string, decision: 'approve' | 'remove') {
    const post = await this.prisma.blogPost.update({
      where: { id },
      data: decision === 'approve' ? { status: 'published', publishedAt: new Date() } : { status: 'removed' },
    });
    await this.notifications.notify([post.authorId], {
      type: 'blog_review',
      title: decision === 'approve' ? `Your post “${post.title}” is live` : `Your post “${post.title}” wasn't published`,
      url: decision === 'approve' ? `/blog/${post.slug}` : '/blog/new',
    });
    return post;
  }
}

@Controller('v1')
export class BlogController {
  constructor(private readonly blog: BlogService) {}

  @Public()
  @Get('blog')
  list(@ZQuery(blogListQuery) q: z.infer<typeof blogListQuery>) {
    return this.blog.list(q);
  }

  @Public()
  @Get('blog-tags')
  tags() {
    return this.blog.tags();
  }

  @Get('me/blog')
  mine(@CurrentUser() user: AuthUser) {
    return this.blog.mine(user.id);
  }

  @Public()
  @Get('blog/:slug')
  get(@Param('slug') slug: string, @CurrentUser() user?: AuthUser) {
    return this.blog.get(slug, user);
  }

  @Post('blog')
  create(@CurrentUser() user: AuthUser, @ZBody(blogPostSchema) body: BlogPostInput) {
    return this.blog.create(user, body);
  }

  @Put('blog/:id')
  update(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser, @ZBody(blogPostSchema) body: BlogPostInput) {
    return this.blog.update(id, user, body);
  }

  @Delete('blog/:id')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.blog.remove(id, user);
  }

  @Post('blog/:id/like')
  @HttpCode(200)
  like(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.blog.toggleLike(id, user);
  }
}

@Module({ controllers: [BlogController], providers: [BlogService], exports: [BlogService] })
export class BlogModule {}
