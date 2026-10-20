import { Module } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import type { Server, ServerOptions, Socket } from 'socket.io';
import { SessionService } from '../auth/session.service';
import { env } from '../config/env';
import { AccessService } from '../core/access.service';
import { RealtimeService } from '../core/realtime.service';
import { DiscussionModule } from '../discussion/discussion.module';
import { DiscussionService } from '../discussion/discussion.service';
import { PrismaService } from '../core/prisma.service';

/** Socket.IO adapter backed by Redis so rooms work across API instances. */
export class RedisIoAdapter extends IoAdapter {
  private adapterCtor: ReturnType<typeof createAdapter> | null = null;

  connectToRedis(url: string) {
    const pub = new Redis(url);
    const sub = pub.duplicate();
    this.adapterCtor = createAdapter(pub, sub);
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    const server: Server = super.createIOServer(port, options);
    if (this.adapterCtor) server.adapter(this.adapterCtor);
    return server;
  }
}

function cookieValue(header: string | undefined, name: string): string | undefined {
  for (const part of (header ?? '').split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return undefined;
}

/**
 * One WebSocket channel at /ws. Clients authenticate with the session cookie and join rooms
 * (thread:<id>, dm:<id>, club:<id>) only after the same permission checks as the REST API.
 */
@WebSocketGateway({ path: '/ws', cors: { origin: env().WEB_ORIGIN, credentials: true } })
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection {
  constructor(
    private readonly realtime: RealtimeService,
    private readonly sessions: SessionService,
    private readonly access: AccessService,
    private readonly discussion: DiscussionService,
    private readonly prisma: PrismaService,
  ) {}

  afterInit(server: Server) {
    this.realtime.attach(server);
    // Authenticate during the handshake so no message is handled before we know the user.
    server.use(async (socket, next) => {
      const sid = cookieValue(socket.handshake.headers.cookie, 'sid');
      const session = sid ? await this.sessions.get(sid) : null;
      if (!session) return next(new Error('unauthenticated'));
      const user = await this.prisma.user.findUnique({ where: { id: session.userId }, select: { suspendedAt: true, deletedAt: true } });
      if (!user || user.suspendedAt || user.deletedAt) return next(new Error('unauthenticated'));
      socket.data.userId = session.userId;
      next();
    });
  }

  async handleConnection(socket: Socket) {
    if (!socket.data.userId) {
      socket.disconnect(true);
      return;
    }
    await socket.join(`user:${socket.data.userId}`);
  }

  private async canJoin(userId: string, room: string): Promise<boolean> {
    const [kind, id] = room.split(':');
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return false;
    if (kind === 'thread') return this.discussion.canView(id, userId);
    if (kind === 'club') return Boolean(await this.access.membership(id, userId));
    if (kind === 'dm') {
      const p = await this.prisma.dmParticipant.findUnique({ where: { conversationId_userId: { conversationId: id, userId } } });
      return Boolean(p);
    }
    return false;
  }

  @SubscribeMessage('join')
  async join(@ConnectedSocket() socket: Socket, @MessageBody() body: { room?: string }) {
    const userId = socket.data.userId as string | undefined;
    if (!userId || typeof body?.room !== 'string') return { ok: false };
    const ok = await this.canJoin(userId, body.room);
    if (ok) await socket.join(body.room);
    return { ok };
  }

  @SubscribeMessage('leave')
  async leave(@ConnectedSocket() socket: Socket, @MessageBody() body: { room?: string }) {
    if (typeof body?.room === 'string') await socket.leave(body.room);
    return { ok: true };
  }

  @SubscribeMessage('typing')
  typing(@ConnectedSocket() socket: Socket, @MessageBody() body: { room?: string }) {
    const room = body?.room;
    if (typeof room === 'string' && socket.rooms.has(room) && (room.startsWith('dm:') || room.startsWith('thread:'))) {
      socket.to(room).emit('typing', { room, userId: socket.data.userId });
    }
  }
}

@Module({ imports: [DiscussionModule], providers: [RealtimeGateway] })
export class RealtimeModule {}
