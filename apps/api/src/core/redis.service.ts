import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { env } from '../config/env';
import { tooManyRequests } from '../common/errors';

@Injectable()
export class RedisService implements OnModuleDestroy {
  readonly client = new Redis(env().REDIS_URL, { maxRetriesPerRequest: 3 });

  async onModuleDestroy() {
    await this.client.quit();
  }

  /**
   * Fixed-window rate limit. Throws 429 once `limit` hits within `windowSec` are exceeded.
   * Keys look like "dm:new:<userId>" or "signin:<ip>".
   */
  async rateLimit(key: string, limit: number, windowSec: number, message?: string) {
    const k = `rl:${key}`;
    const n = await this.client.incr(k);
    if (n === 1) await this.client.expire(k, windowSec);
    if (n > limit) throw tooManyRequests(message);
  }
}
