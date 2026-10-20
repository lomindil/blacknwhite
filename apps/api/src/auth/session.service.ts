import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { CookieOptions, Response } from 'express';
import { env, isProd } from '../config/env';
import { RedisService } from '../core/redis.service';

export interface SessionData {
  userId: string;
  csrf: string;
  createdAt: number;
}

const ttlSeconds = () => env().SESSION_TTL_DAYS * 24 * 60 * 60;
const key = (id: string) => `sess:${id}`;
const userKey = (userId: string) => `usess:${userId}`;

/**
 * Server-side sessions in Redis: random 256-bit id, 30-day sliding expiry.
 * The browser only ever holds the HttpOnly `sid` cookie plus a readable `csrf` cookie.
 */
@Injectable()
export class SessionService {
  constructor(private readonly redis: RedisService) {}

  async create(userId: string): Promise<{ id: string; csrf: string }> {
    const id = randomBytes(32).toString('base64url');
    const csrf = randomBytes(24).toString('base64url');
    const data: SessionData = { userId, csrf, createdAt: Date.now() };
    await this.redis.client
      .multi()
      .set(key(id), JSON.stringify(data), 'EX', ttlSeconds())
      .sadd(userKey(userId), id)
      .expire(userKey(userId), ttlSeconds())
      .exec();
    return { id, csrf };
  }

  async get(id: string): Promise<SessionData | null> {
    if (!/^[A-Za-z0-9_-]{20,100}$/.test(id)) return null;
    const raw = await this.redis.client.get(key(id));
    return raw ? (JSON.parse(raw) as SessionData) : null;
  }

  /** Sliding expiry. */
  async touch(id: string, userId: string) {
    await this.redis.client.multi().expire(key(id), ttlSeconds()).expire(userKey(userId), ttlSeconds()).exec();
  }

  async destroy(id: string, userId: string) {
    await this.redis.client.multi().del(key(id)).srem(userKey(userId), id).exec();
  }

  /** "Log out everywhere". */
  async destroyAll(userId: string) {
    const ids = await this.redis.client.smembers(userKey(userId));
    const multi = this.redis.client.multi();
    for (const id of ids) multi.del(key(id));
    multi.del(userKey(userId));
    await multi.exec();
  }

  setCookies(res: Response, session: { id: string; csrf: string }) {
    const base: CookieOptions = { secure: isProd(), sameSite: 'lax', path: '/', maxAge: ttlSeconds() * 1000 };
    res.cookie('sid', session.id, { ...base, httpOnly: true });
    res.cookie('csrf', session.csrf, { ...base, httpOnly: false });
  }

  clearCookies(res: Response) {
    res.clearCookie('sid', { path: '/' });
    res.clearCookie('csrf', { path: '/' });
  }
}
