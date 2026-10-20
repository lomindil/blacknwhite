import { Injectable } from '@nestjs/common';
import type { Club, ClubMember } from '@prisma/client';
import { forbidden, notFound } from '../common/errors';
import { PrismaService } from './prisma.service';

/** "Finished the book" — sees every chapter gate. */
export const FINISHED = 100000;

/**
 * Authorization checks in one place (docs/architecture.md §8): club role, membership,
 * spoiler gates and DM eligibility. Covered by access.service.spec.ts.
 */
@Injectable()
export class AccessService {
  constructor(private readonly prisma: PrismaService) {}

  async club(clubId: string): Promise<Club> {
    const club = await this.prisma.club.findFirst({ where: { id: clubId, deletedAt: null } });
    if (!club) throw notFound('Club');
    return club;
  }

  membership(clubId: string, userId: string | undefined): Promise<ClubMember | null> {
    if (!userId) return Promise.resolve(null);
    return this.prisma.clubMember.findUnique({ where: { clubId_userId: { clubId, userId } } });
  }

  async requireMember(clubId: string, userId: string): Promise<ClubMember> {
    await this.club(clubId);
    const m = await this.membership(clubId, userId);
    if (!m) throw forbidden('Join this club to see and take part in its discussions');
    return m;
  }

  async requireAdmin(clubId: string, userId: string): Promise<ClubMember> {
    const m = await this.requireMember(clubId, userId);
    if (m.role === 'member') throw forbidden('Only club admins can do this');
    return m;
  }

  /** The last chapter this reader has finished. Readers who marked the book "read" see everything. */
  async chapterFor(userId: string, bookId: string): Promise<number> {
    const rs = await this.prisma.readingStatus.findUnique({ where: { userId_bookId: { userId, bookId } } });
    if (!rs) return 0;
    if (rs.status === 'read') return FINISHED;
    return rs.currentChapter;
  }

  async sharesClub(a: string, b: string): Promise<boolean> {
    if (a === b) return false;
    const shared = await this.prisma.clubMember.findFirst({
      where: { userId: a, club: { deletedAt: null, members: { some: { userId: b } } } },
      select: { clubId: true },
    });
    return Boolean(shared);
  }

  async blockedEither(a: string, b: string): Promise<boolean> {
    const block = await this.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: a, blockedId: b },
          { blockerId: b, blockedId: a },
        ],
      },
    });
    return Boolean(block);
  }

  /** Can `from` start or continue a DM with `to`? Returns the reason when not. */
  async dmEligibility(from: string, to: string): Promise<{ ok: true } | { ok: false; reason: string }> {
    if (from === to) return { ok: false, reason: "You can't message yourself" };
    const recipient = await this.prisma.user.findUnique({ where: { id: to }, include: { settings: true } });
    if (!recipient || recipient.deletedAt) return { ok: false, reason: 'This reader is no longer on the platform' };
    if (await this.blockedEither(from, to)) return { ok: false, reason: "You can't message this reader" };
    if (!(await this.sharesClub(from, to))) {
      return { ok: false, reason: 'You can only message people who share a club with you' };
    }
    if (recipient.settings?.dmPolicy === 'nobody') return { ok: false, reason: "This reader isn't accepting messages" };
    return { ok: true };
  }
}
