import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { RedisService } from './redis.service';

const TOUCH_EVERY_SEC = 5 * 60;
const KEEP_DAYS = 400;

/** Calendar day in India (YYYY-MM-DD), which is what "daily active" means for us. */
export function istDay(d = new Date()): string {
  return new Date(d.getTime() + 330 * 60 * 1000).toISOString().slice(0, 10);
}

/**
 * Cheap activity tracking for the admin portal: at most one write per user every 5 minutes.
 * Unique daily users go into a Redis HyperLogLog per day (≈12 KB each, any number of users),
 * so DAU/WAU/MAU are a PFCOUNT over 1, 7 or 30 day keys.
 */
@Injectable()
export class ActivityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async touch(userId: string) {
    const fresh = await this.redis.client.set(`act:${userId}`, '1', 'EX', TOUCH_EVERY_SEC, 'NX');
    if (!fresh) return;
    const key = `dau:${istDay()}`;
    await this.redis.client.multi().pfadd(key, userId).expire(key, KEEP_DAYS * 86400).exec();
    await this.prisma.user.update({ where: { id: userId }, data: { lastActiveAt: new Date() } });
  }

  private days(n: number): string[] {
    return Array.from({ length: n }, (_, i) => istDay(new Date(Date.now() - i * 86400000)));
  }

  /** Unique active users over the last n days (n = 1 → today). */
  async activeUsers(n: number): Promise<number> {
    return this.redis.client.pfcount(...this.days(n).map((d) => `dau:${d}`));
  }

  /** Daily active users for each of the last n days, oldest first. */
  async dailySeries(n: number): Promise<{ date: string; value: number }[]> {
    const days = this.days(n).reverse();
    const counts = await Promise.all(days.map((d) => this.redis.client.pfcount(`dau:${d}`)));
    return days.map((date, i) => ({ date, value: counts[i] }));
  }
}
