import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import type { Server } from 'socket.io';
import { env } from '../config/env';

const CHANNEL = 'bnw:realtime';

/**
 * Pushes events to Socket.IO rooms. Inside the API process it emits directly (the Redis
 * adapter fans out across instances). In a standalone worker there is no Socket.IO server,
 * so it publishes to Redis and each API instance re-emits to its own local sockets.
 */
@Injectable()
export class RealtimeService implements OnModuleInit, OnModuleDestroy {
  private server: Server | null = null;
  private publisher: Redis | null = null;
  private subscriber: Redis | null = null;

  attach(server: Server) {
    this.server = server;
  }

  async onModuleInit() {
    this.subscriber = new Redis(env().REDIS_URL);
    await this.subscriber.subscribe(CHANNEL);
    this.subscriber.on('message', (_channel, raw) => {
      if (!this.server) return;
      const { room, event, data } = JSON.parse(raw);
      this.server.local.to(room).emit(event, data);
    });
  }

  async onModuleDestroy() {
    await this.subscriber?.quit();
    await this.publisher?.quit();
  }

  emit(room: string, event: string, data: unknown) {
    if (this.server) {
      this.server.to(room).emit(event, data);
      return;
    }
    this.publisher ??= new Redis(env().REDIS_URL);
    void this.publisher.publish(CHANNEL, JSON.stringify({ room, event, data }));
  }

  toUser(userId: string, event: string, data: unknown) {
    this.emit(`user:${userId}`, event, data);
  }
}
