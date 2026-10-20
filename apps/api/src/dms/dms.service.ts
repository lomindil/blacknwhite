import { DM_LIMITS, DmConversationItem, DmMessageItem } from '@bnw/shared';
import { Injectable } from '@nestjs/common';
import { AppError, badRequest, forbidden, notFound } from '../common/errors';
import { AuthUser, Paged } from '../common/http';
import { toUserSummary, userSummarySelect } from '../common/mappers';
import { AccessService } from '../core/access.service';
import { PrismaService } from '../core/prisma.service';
import { RealtimeService } from '../core/realtime.service';
import { RedisService } from '../core/redis.service';

const LINK_OR_IMAGE = /(https?:\/\/|www\.|!\[[^\]]*\]\()/i;
const DAY = 24 * 60 * 60 * 1000;

const pairKey = (a: string, b: string) => (a < b ? `${a}:${b}` : `${b}:${a}`);

/** Club-scoped DMs (docs/architecture.md §7.4). */
@Injectable()
export class DmsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly redis: RedisService,
    private readonly realtime: RealtimeService,
  ) {}

  private toMessage(m: { id: string; conversationId: string; senderId: string; body: string; createdAt: Date }): DmMessageItem {
    return { id: m.id, conversationId: m.conversationId, senderId: m.senderId, body: m.body, createdAt: m.createdAt.toISOString() };
  }

  private async participant(conversationId: string, userId: string) {
    const p = await this.prisma.dmParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
      include: { conversation: { include: { participants: true } } },
    });
    if (!p) throw notFound('Conversation');
    const otherId = p.conversation.participants.find((x) => x.userId !== userId)!.userId;
    return { p, otherId };
  }

  /** Read-only once the two no longer share a club, or either has blocked the other. */
  private async isReadOnly(userId: string, otherId: string) {
    const eligible = await this.access.dmEligibility(userId, otherId);
    return !eligible.ok;
  }

  async list(userId: string): Promise<DmConversationItem[]> {
    const parts = await this.prisma.dmParticipant.findMany({
      where: { userId },
      include: {
        conversation: {
          include: {
            participants: { include: { user: { select: userSummarySelect } } },
            messages: { where: { deletedAt: null }, orderBy: { id: 'desc' }, take: 1 },
          },
        },
      },
      orderBy: { conversation: { lastMessageAt: 'desc' } },
      take: 100,
    });
    return Promise.all(
      parts.map(async (p) => {
        const other = p.conversation.participants.find((x) => x.userId !== userId)!;
        const last = p.conversation.messages[0] ?? null;
        return {
          id: p.conversationId,
          other: toUserSummary(other.user),
          lastMessage: last ? { body: last.body, senderId: last.senderId, createdAt: last.createdAt.toISOString() } : null,
          unread: Boolean(last && last.senderId !== userId && (!p.lastReadAt || last.createdAt > p.lastReadAt)),
          readOnly: await this.isReadOnly(userId, other.userId),
        };
      }),
    );
  }

  async unreadCount(userId: string): Promise<number> {
    const rows = await this.prisma.$queryRaw<{ n: number }[]>`
      SELECT COUNT(*)::int AS n FROM dm_participants p
      JOIN dm_conversations c ON c.id = p.conversation_id
      WHERE p.user_id = ${userId}::uuid
        AND (p.last_read_at IS NULL OR c.last_message_at > p.last_read_at)
        AND EXISTS (SELECT 1 FROM dm_messages m WHERE m.conversation_id = c.id AND m.sender_id <> ${userId}::uuid
                    AND m.deleted_at IS NULL AND (p.last_read_at IS NULL OR m.created_at > p.last_read_at))`;
    return rows[0]?.n ?? 0;
  }

  async start(user: AuthUser, recipientId: string, body: string): Promise<{ conversationId: string; message: DmMessageItem }> {
    const eligible = await this.access.dmEligibility(user.id, recipientId);
    if (!eligible.ok) throw forbidden(eligible.reason);

    const existing = await this.prisma.dmConversation.findUnique({ where: { pairKey: pairKey(user.id, recipientId) } });
    if (existing) {
      const message = await this.send(existing.id, user, body);
      return { conversationId: existing.id, message };
    }

    const young = Date.now() - user.createdAt.getTime() < DM_LIMITS.youngAccountDays * DAY;
    await this.redis.rateLimit(
      `dm:new:${user.id}`,
      young ? DM_LIMITS.newConversationsPerDayYoungAccount : DM_LIMITS.newConversationsPerDay,
      24 * 3600,
      "You've started a lot of new conversations today. Try again tomorrow.",
    );
    if (LINK_OR_IMAGE.test(body)) {
      throw new AppError(400, 'DM_FIRST_MESSAGE', "Links and images aren't allowed in a first message");
    }

    const conv = await this.prisma.dmConversation.create({
      data: {
        pairKey: pairKey(user.id, recipientId),
        participants: { create: [{ userId: user.id, lastReadAt: new Date() }, { userId: recipientId }] },
        messages: { create: { senderId: user.id, body } },
      },
      include: { messages: true },
    });
    const message = this.toMessage(conv.messages[0]);
    this.realtime.toUser(recipientId, 'dm:new', { conversationId: conv.id });
    return { conversationId: conv.id, message };
  }

  async messages(conversationId: string, userId: string, before: string | undefined, limit: number): Promise<Paged<DmMessageItem>> {
    await this.participant(conversationId, userId);
    const rows = await this.prisma.dmMessage.findMany({
      where: { conversationId, deletedAt: null, ...(before ? { id: { lt: before } } : {}) },
      orderBy: { id: 'desc' },
      take: limit + 1,
    });
    const hasMore = rows.length > limit;
    const page = (hasMore ? rows.slice(0, limit) : rows).reverse();
    if (!before) {
      await this.prisma.dmParticipant.update({
        where: { conversationId_userId: { conversationId, userId } },
        data: { lastReadAt: new Date() },
      });
    }
    return { items: page.map((m) => this.toMessage(m)), nextCursor: hasMore ? page[0].id : null };
  }

  async send(conversationId: string, user: AuthUser, body: string): Promise<DmMessageItem> {
    const { otherId } = await this.participant(conversationId, user.id);
    const eligible = await this.access.dmEligibility(user.id, otherId);
    if (!eligible.ok) throw forbidden(`This conversation is read-only. ${eligible.reason}.`);
    await this.redis.rateLimit(`dm:msg:${user.id}`, 60, 60, "You're sending messages very quickly.");
    if (!body.trim()) throw badRequest('Message is empty');

    const now = new Date();
    const [msg] = await this.prisma.$transaction([
      this.prisma.dmMessage.create({ data: { conversationId, senderId: user.id, body } }),
      this.prisma.dmConversation.update({ where: { id: conversationId }, data: { lastMessageAt: now } }),
      this.prisma.dmParticipant.update({
        where: { conversationId_userId: { conversationId, userId: user.id } },
        data: { lastReadAt: now },
      }),
    ]);
    const item = this.toMessage(msg);
    this.realtime.emit(`dm:${conversationId}`, 'dm:message', item);
    this.realtime.toUser(otherId, 'dm:new', { conversationId });
    return item;
  }

  async markRead(conversationId: string, userId: string) {
    await this.participant(conversationId, userId);
    await this.prisma.dmParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: new Date() },
    });
    return { ok: true };
  }

  async conversation(conversationId: string, userId: string) {
    const { otherId } = await this.participant(conversationId, userId);
    const other = await this.prisma.user.findUniqueOrThrow({ where: { id: otherId }, select: userSummarySelect });
    return { id: conversationId, other: toUserSummary(other), readOnly: await this.isReadOnly(userId, otherId) };
  }
}
