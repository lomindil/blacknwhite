import type { CreatePollInput, PollInfo } from '@bnw/shared';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { badRequest, forbidden, notFound } from '../common/errors';
import { AuthUser, iso } from '../common/http';
import { bookInclude, toBookSummary, toUserSummary, userSummarySelect } from '../common/mappers';
import { AccessService } from '../core/access.service';
import { NotificationsService } from '../core/notifications.service';
import { PrismaService } from '../core/prisma.service';

const pollInclude = {
  createdBy: { select: userSummarySelect },
  options: { include: { book: { include: bookInclude }, _count: { select: { votes: true } } }, orderBy: { position: 'asc' } },
} satisfies Prisma.PollInclude;

type PollRow = Prisma.PollGetPayload<{ include: typeof pollInclude }>;

const isClosed = (p: { closedAt: Date | null; closesAt: Date | null }) =>
  Boolean(p.closedAt) || Boolean(p.closesAt && p.closesAt < new Date());

@Injectable()
export class PollsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly notifications: NotificationsService,
  ) {}

  private toInfo(p: PollRow, myVote: string | null): PollInfo {
    return {
      id: p.id,
      question: p.question,
      kind: p.kind,
      closesAt: iso(p.closesAt),
      closed: isClosed(p),
      createdBy: toUserSummary(p.createdBy),
      createdAt: p.createdAt.toISOString(),
      totalVotes: p.options.reduce((n, o) => n + o._count.votes, 0),
      myVote,
      options: p.options.map((o) => ({
        id: o.id,
        label: o.label,
        votes: o._count.votes,
        book: o.book ? toBookSummary(o.book) : null,
      })),
    };
  }

  async create(clubId: string, user: AuthUser, input: CreatePollInput): Promise<PollInfo> {
    await this.access.requireMember(clubId, user.id);
    if (input.closesAt && input.closesAt < new Date()) throw badRequest('Closing time must be in the future');
    const poll = await this.prisma.poll.create({
      data: {
        clubId,
        createdById: user.id,
        question: input.question,
        kind: input.kind,
        closesAt: input.closesAt ?? null,
        options: { create: input.options.map((o, i) => ({ label: o.label, bookId: o.bookId ?? null, position: i })) },
      },
      include: pollInclude,
    });
    const club = await this.access.club(clubId);
    const members = await this.prisma.clubMember.findMany({ where: { clubId }, select: { userId: true } });
    await this.notifications.notify(
      members.map((m) => m.userId),
      { type: 'poll', title: `New poll in ${club.name}: ${input.question}`, url: `/clubs/${club.slug}/polls` },
      {},
      user.id,
    );
    return this.toInfo(poll, null);
  }

  async list(clubId: string, userId: string): Promise<PollInfo[]> {
    await this.access.requireMember(clubId, userId);
    const polls = await this.prisma.poll.findMany({
      where: { clubId },
      include: pollInclude,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const votes = await this.prisma.pollVote.findMany({
      where: { userId, pollId: { in: polls.map((p) => p.id) } },
    });
    const mine = new Map(votes.map((v) => [v.pollId, v.optionId]));
    return polls.map((p) => this.toInfo(p, mine.get(p.id) ?? null));
  }

  async vote(pollId: string, user: AuthUser, optionId: string): Promise<PollInfo> {
    const poll = await this.prisma.poll.findUnique({ where: { id: pollId }, include: pollInclude });
    if (!poll) throw notFound('Poll');
    await this.access.requireMember(poll.clubId, user.id);
    if (isClosed(poll)) throw badRequest('This poll is closed');
    if (!poll.options.some((o) => o.id === optionId)) throw badRequest('That option is not part of this poll');
    await this.prisma.pollVote.upsert({
      where: { pollId_userId: { pollId, userId: user.id } },
      create: { pollId, userId: user.id, optionId },
      update: { optionId },
    });
    const fresh = await this.prisma.poll.findUniqueOrThrow({ where: { id: pollId }, include: pollInclude });
    return this.toInfo(fresh, optionId);
  }

  async close(pollId: string, user: AuthUser): Promise<PollInfo> {
    const poll = await this.prisma.poll.findUnique({ where: { id: pollId } });
    if (!poll) throw notFound('Poll');
    const m = await this.access.requireMember(poll.clubId, user.id);
    if (m.role === 'member' && poll.createdById !== user.id) throw forbidden('Only admins or the poll creator can close it');
    const closed = await this.prisma.poll.update({ where: { id: pollId }, data: { closedAt: new Date() }, include: pollInclude });
    const myVote = await this.prisma.pollVote.findUnique({ where: { pollId_userId: { pollId, userId: user.id } } });
    return this.toInfo(closed, myVote?.optionId ?? null);
  }
}
