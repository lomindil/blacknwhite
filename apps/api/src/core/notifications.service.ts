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
  /**
   * Merge into the recipient's unread notification with the same key instead of adding a row:
   * "Arjun, Meera and 3 others replied in Week 2". `title` receives the names, already joined.
   */
  group?: { key: string; actor: { id: string; name: string }; title: (who: string) => string };
}

/** Names kept in a grouped notification's payload, newest first. */
const MAX_ACTORS = 20;

/** "Arjun", "Arjun and Meera", "Arjun, Meera and 3 others". */
export function joinActors(names: string[], total: number): string {
  if (total <= 1) return names[0];
  if (total === 2) return `${names[0]} and ${names[1]}`;
  const others = total - 2;
  return `${names[0]}, ${names[1]} and ${others} other${others === 1 ? '' : 's'}`;
}

type Actor = { id: string; name: string };

/** Read notifications are deleted after this; unread ones after a year. */
export const NOTIFICATION_RETENTION_DAYS = { read: 90, unread: 365 };

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

    const base = { body: content.body, url: content.url, ...(content.data ?? {}) };
    const group = content.group;
    // Unread notifications in the same group are replaced by one merged row (new id, so it moves to the top).
    const previous = group
      ? await this.prisma.notification.findMany({
          where: { userId: { in: active.map((u) => u.id) }, groupKey: group.key, readAt: null },
        })
      : [];
    const prevByUser = new Map(previous.map((n) => [n.userId, n]));

    const data = active.map((u) => {
      if (!group) return { userId: u.id, type: content.type, payload: { title: content.title, ...base } as Prisma.InputJsonValue };
      const old = prevByUser.get(u.id)?.payload as { actors?: Actor[]; actorCount?: number } | undefined;
      const oldActors = old?.actors ?? [];
      const isNew = !oldActors.some((a) => a.id === group.actor.id);
      const actors = [group.actor, ...oldActors.filter((a) => a.id !== group.actor.id)].slice(0, MAX_ACTORS);
      const actorCount = (old?.actorCount ?? oldActors.length) + (isNew ? 1 : 0);
      const who = joinActors(actors.map((a) => a.name), actorCount);
      return {
        userId: u.id,
        type: content.type,
        groupKey: group.key,
        payload: { title: group.title(who), ...base, actors, actorCount } as Prisma.InputJsonValue,
      };
    });

    const rows = await this.prisma.$transaction(async (tx) => {
      if (previous.length) await tx.notification.deleteMany({ where: { id: { in: previous.map((n) => n.id) } } });
      // skipDuplicates: if a concurrent post already wrote the merged row, keep that one.
      return tx.notification.createManyAndReturn({ data, skipDuplicates: true });
    });
    for (const n of rows) {
      this.realtime.toUser(n.userId, 'notification', {
        id: n.id,
        type: n.type,
        payload: n.payload,
        readAt: null,
        createdAt: n.createdAt.toISOString(),
        // Lets the client keep its unread badge steady when a grouped notification is updated.
        replaces: prevByUser.get(n.userId)?.id ?? null,
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

  /** Deletes read notifications after 90 days and unread ones after a year. Runs daily. */
  async cleanup(): Promise<number> {
    const day = 86400_000;
    const { count } = await this.prisma.notification.deleteMany({
      where: {
        OR: [
          { readAt: { not: null }, createdAt: { lt: new Date(Date.now() - NOTIFICATION_RETENTION_DAYS.read * day) } },
          { createdAt: { lt: new Date(Date.now() - NOTIFICATION_RETENTION_DAYS.unread * day) } },
        ],
      },
    });
    return count;
  }
}
