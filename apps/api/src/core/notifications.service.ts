import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma.service';
import { QueueService } from './queue.service';
import { RealtimeService } from './realtime.service';

export interface NotificationContent {
  type: string;
  title: string;
  body?: string;
  url?: string;
  data?: Record<string, unknown>;
}

export interface DeliveryChannels {
  /** Send an email right away (reminders, invites). Everything else goes into the daily digest. */
  email?: { subject: string; text: string };
  /** WhatsApp template; only delivered to users who opted in. */
  whatsapp?: { template: string; params: string[] };
}

export interface DeliverJob {
  userId: string;
  channel: 'email' | 'whatsapp';
  subject?: string;
  text?: string;
  url?: string;
  template?: string;
  params?: string[];
}

/**
 * One notification service (docs/architecture.md §7.7): writes the in-app feed, pushes it
 * live, then fans out to email and WhatsApp through the "deliver" queue based on user settings.
 */
@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queues: QueueService,
    private readonly realtime: RealtimeService,
  ) {}

  async notify(userIds: string[], content: NotificationContent, channels: DeliveryChannels = {}, exclude?: string) {
    const ids = [...new Set(userIds)].filter((id) => id !== exclude);
    if (!ids.length) return;
    const active = await this.prisma.user.findMany({
      where: { id: { in: ids }, deletedAt: null },
      select: { id: true },
    });
    if (!active.length) return;

    const payload = {
      title: content.title,
      body: content.body,
      url: content.url,
      ...(content.data ?? {}),
    } as Prisma.InputJsonValue;

    const rows = await this.prisma.notification.createManyAndReturn({
      data: active.map((u) => ({ userId: u.id, type: content.type, payload })),
    });
    for (const n of rows) {
      this.realtime.toUser(n.userId, 'notification', {
        id: n.id,
        type: n.type,
        payload: n.payload,
        readAt: null,
        createdAt: n.createdAt.toISOString(),
      });
    }

    const jobs: DeliverJob[] = [];
    for (const u of active) {
      if (channels.email) {
        jobs.push({ userId: u.id, channel: 'email', subject: channels.email.subject, text: channels.email.text, url: content.url });
      }
      if (channels.whatsapp) {
        jobs.push({ userId: u.id, channel: 'whatsapp', template: channels.whatsapp.template, params: channels.whatsapp.params });
      }
    }
    if (jobs.length) {
      await this.queues.queue('deliver').addBulk(jobs.map((data) => ({ name: data.channel, data })));
      if (channels.email) {
        // Already emailed directly; keep these out of the digest.
        await this.prisma.notification.updateMany({
          where: { id: { in: rows.map((r) => r.id) } },
          data: { emailedAt: new Date() },
        });
      }
    }
  }
}
