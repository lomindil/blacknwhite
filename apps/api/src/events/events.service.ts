import { cityName, CreateEventInput, EventDetail, EventSummary, RsvpStatus, UpdateEventInput } from '@bnw/shared';
import { Injectable } from '@nestjs/common';
import { Event, Prisma } from '@prisma/client';
import { badRequest, forbidden, notFound } from '../common/errors';
import { AuthUser, Paged } from '../common/http';
import {
  eventSummaryInclude,
  toEventSummary,
  toUserSummary,
  userSummarySelect,
  visibleEventsWhere,
} from '../common/mappers';
import { AccessService } from '../core/access.service';
import { NotificationsService } from '../core/notifications.service';
import { PrismaService } from '../core/prisma.service';
import { QueueService } from '../core/queue.service';

const REMINDER_OFFSETS = { '24h': 24 * 3600 * 1000, '2h': 2 * 3600 * 1000 } as const;
export type ReminderOffset = keyof typeof REMINDER_OFFSETS;

export interface ReminderJob {
  eventId: string;
  offset: ReminderOffset;
  startsAt: string;
}

const formatIst = (d: Date) =>
  d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }) + ' IST';

function icsEscape(s: string) {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}
const icsDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/** Events and RSVPs (docs/architecture.md §7.5). */
@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly queues: QueueService,
    private readonly notifications: NotificationsService,
  ) {}

  private async canManage(e: Event, user: AuthUser | undefined): Promise<boolean> {
    if (!user) return false;
    if (user.isAdmin || e.createdById === user.id) return true;
    if (e.clubId) {
      const m = await this.access.membership(e.clubId, user.id);
      return Boolean(m && m.role !== 'member');
    }
    if (e.bookstoreId) {
      const store = await this.prisma.bookstore.findUnique({ where: { id: e.bookstoreId } });
      return store?.claimedById === user.id;
    }
    return false;
  }

  private async visibleEvent(id: string, userId?: string) {
    const e = await this.prisma.event.findFirst({
      where: { id, ...visibleEventsWhere(userId) },
      include: { ...eventSummaryInclude, createdBy: { select: userSummarySelect } },
    });
    if (!e) throw notFound('Event');
    return e;
  }

  async create(user: AuthUser, input: CreateEventInput): Promise<EventDetail> {
    let city = input.city ?? null;
    if (input.clubId) {
      await this.access.requireAdmin(input.clubId, user.id);
      city ??= (await this.access.club(input.clubId)).city;
    } else {
      const store = await this.prisma.bookstore.findUnique({ where: { id: input.bookstoreId! } });
      if (!store) throw notFound('Bookstore');
      if (store.claimedById !== user.id && !user.isAdmin) throw forbidden('Only the bookstore owner can post its events');
      city ??= store.city;
    }
    if (input.startsAt < new Date()) throw badRequest('The event must start in the future');

    const e = await this.prisma.event.create({
      data: {
        clubId: input.clubId ?? null,
        bookstoreId: input.bookstoreId ?? null,
        createdById: user.id,
        title: input.title,
        description: input.description ?? null,
        startsAt: input.startsAt,
        endsAt: input.endsAt ?? null,
        mode: input.mode,
        venueName: input.venueName ?? null,
        area: input.area ?? null,
        address: input.address ?? null,
        addressRsvpOnly: input.addressRsvpOnly,
        city,
        meetingUrl: input.meetingUrl ?? null,
        capacity: input.capacity ?? null,
        // The host is going by default.
        rsvps: { create: { userId: user.id, status: 'going' } },
      },
    });
    await this.scheduleReminders(e);

    if (e.clubId) {
      const club = await this.access.club(e.clubId);
      const members = await this.prisma.clubMember.findMany({ where: { clubId: e.clubId }, select: { userId: true } });
      await this.notifications.notify(
        members.map((m) => m.userId),
        { type: 'event_new', title: `${club.name}: ${e.title}`, body: formatIst(e.startsAt), url: `/events/${e.id}` },
        { email: { subject: `New event in ${club.name}: ${e.title}`, text: `${e.title}\n${formatIst(e.startsAt)}\n\nRSVP to save your spot.` } },
        user.id,
      );
    }
    return this.get(e.id, user);
  }

  async list(
    q: { city?: string; clubId?: string; bookstoreId?: string; from?: Date; to?: Date; cursor?: string; limit: number },
    userId?: string,
  ): Promise<Paged<EventSummary>> {
    const where: Prisma.EventWhereInput = {
      AND: [
        visibleEventsWhere(userId),
        {
          startsAt: { gte: q.from ?? new Date(Date.now() - 3 * 3600 * 1000), ...(q.to ? { lte: q.to } : {}) },
          ...(q.city ? { city: q.city } : {}),
          ...(q.clubId ? { clubId: q.clubId } : {}),
          ...(q.bookstoreId ? { bookstoreId: q.bookstoreId } : {}),
        },
      ],
    };
    const rows = await this.prisma.event.findMany({
      where,
      include: eventSummaryInclude,
      orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
      take: q.limit + 1,
      ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > q.limit;
    const page = hasMore ? rows.slice(0, q.limit) : rows;
    return { items: page.map(toEventSummary), nextCursor: hasMore ? page[page.length - 1].id : null };
  }

  async get(id: string, user?: AuthUser): Promise<EventDetail> {
    const e = await this.visibleEvent(id, user?.id);
    const [rsvp, waitlistCount, canManage] = await Promise.all([
      user ? this.prisma.eventRsvp.findUnique({ where: { eventId_userId: { eventId: id, userId: user.id } } }) : null,
      this.prisma.eventRsvp.count({ where: { eventId: id, status: 'waitlist' } }),
      this.canManage(e, user),
    ]);
    const attending = rsvp?.status === 'going' || rsvp?.status === 'maybe';
    const showAddress = canManage || !e.addressRsvpOnly || attending;
    return {
      ...toEventSummary(e),
      description: e.description,
      meetingUrl: canManage || attending ? e.meetingUrl : null,
      address: showAddress ? e.address : null,
      addressHidden: Boolean(e.address) && !showAddress,
      myRsvp: rsvp?.status ?? null,
      canManage,
      createdBy: toUserSummary(e.createdBy),
      waitlistCount,
    };
  }

  async update(id: string, user: AuthUser, input: UpdateEventInput): Promise<EventDetail> {
    const e = await this.prisma.event.findUnique({ where: { id } });
    if (!e) throw notFound('Event');
    if (!(await this.canManage(e, user))) throw forbidden('Only the host can edit this event');
    const updated = await this.prisma.event.update({ where: { id }, data: input });
    const moved = input.startsAt && input.startsAt.getTime() !== e.startsAt.getTime();
    if (moved) await this.scheduleReminders(updated);
    if (moved || (input.venueName && input.venueName !== e.venueName) || (input.meetingUrl && input.meetingUrl !== e.meetingUrl)) {
      await this.notifyAttendees(updated, {
        type: 'event_updated',
        title: `Updated: ${updated.title}`,
        body: formatIst(updated.startsAt),
        emailSubject: `Event updated: ${updated.title}`,
      });
    }
    return this.get(id, user);
  }

  async cancel(id: string, user: AuthUser) {
    const e = await this.prisma.event.findUnique({ where: { id } });
    if (!e) throw notFound('Event');
    if (!(await this.canManage(e, user))) throw forbidden('Only the host can cancel this event');
    if (e.cancelledAt) return { ok: true };
    const cancelled = await this.prisma.event.update({ where: { id }, data: { cancelledAt: new Date() } });
    await this.notifyAttendees(cancelled, {
      type: 'event_cancelled',
      title: `Cancelled: ${e.title}`,
      body: `This event on ${formatIst(e.startsAt)} has been cancelled.`,
      emailSubject: `Cancelled: ${e.title}`,
      exclude: user.id,
    });
    return { ok: true };
  }

  private async notifyAttendees(
    e: Event,
    n: { type: string; title: string; body: string; emailSubject: string; exclude?: string },
  ) {
    const rsvps = await this.prisma.eventRsvp.findMany({
      where: { eventId: e.id, status: { in: ['going', 'maybe', 'waitlist'] } },
      select: { userId: true },
    });
    await this.notifications.notify(
      rsvps.map((r) => r.userId),
      { type: n.type, title: n.title, body: n.body, url: `/events/${e.id}` },
      { email: { subject: n.emailSubject, text: `${n.title}\n${n.body}` } },
      n.exclude,
    );
  }

  async rsvp(id: string, user: AuthUser, status: 'going' | 'maybe' | 'no'): Promise<{ status: RsvpStatus }> {
    const e = await this.visibleEvent(id, user.id);
    if (e.cancelledAt) throw badRequest('This event was cancelled');
    if ((e.endsAt ?? e.startsAt) < new Date()) throw badRequest('This event has already happened');

    const result = await this.prisma.$transaction(
      async (tx) => {
        const prev = await tx.eventRsvp.findUnique({ where: { eventId_userId: { eventId: id, userId: user.id } } });
        let next: RsvpStatus = status;
        if (status === 'going' && prev?.status !== 'going' && e.capacity) {
          const going = await tx.eventRsvp.count({ where: { eventId: id, status: 'going' } });
          if (going >= e.capacity) next = 'waitlist';
        }
        await tx.eventRsvp.upsert({
          where: { eventId_userId: { eventId: id, userId: user.id } },
          create: { eventId: id, userId: user.id, status: next },
          update: { status: next },
        });
        // A freed seat goes to the first person on the waitlist.
        let promoted: string | null = null;
        if (prev?.status === 'going' && next !== 'going') {
          const first = await tx.eventRsvp.findFirst({ where: { eventId: id, status: 'waitlist' }, orderBy: { updatedAt: 'asc' } });
          if (first) {
            await tx.eventRsvp.update({ where: { eventId_userId: { eventId: id, userId: first.userId } }, data: { status: 'going' } });
            promoted = first.userId;
          }
        }
        return { next, promoted };
      },
      { isolationLevel: 'Serializable' },
    );

    if (result.promoted) {
      await this.notifications.notify(
        [result.promoted],
        { type: 'event_waitlist', title: `A spot opened up: you're going to ${e.title}`, body: formatIst(e.startsAt), url: `/events/${id}` },
        { email: { subject: `You're in: ${e.title}`, text: `A spot opened up and you've moved off the waitlist for ${e.title} on ${formatIst(e.startsAt)}.` } },
      );
    }
    return { status: result.next };
  }

  /** Attendance list for hosts. */
  async attendees(id: string, user: AuthUser) {
    const e = await this.prisma.event.findUnique({ where: { id } });
    if (!e) throw notFound('Event');
    if (!(await this.canManage(e, user))) throw forbidden('Only hosts can see the attendee list');
    const rows = await this.prisma.eventRsvp.findMany({
      where: { eventId: id, status: { not: 'no' } },
      include: { user: { select: userSummarySelect } },
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map((r) => ({ user: toUserSummary(r.user), status: r.status, rsvpAt: r.createdAt.toISOString() }));
  }

  async ics(id: string, user?: AuthUser): Promise<string> {
    const detail = await this.get(id, user);
    const start = new Date(detail.startsAt);
    const end = detail.endsAt ? new Date(detail.endsAt) : new Date(start.getTime() + 2 * 3600 * 1000);
    const location =
      detail.mode === 'online'
        ? (detail.meetingUrl ?? 'Online')
        : [detail.venueName, detail.address, detail.area, cityName(detail.city)].filter(Boolean).join(', ');
    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//BookClubPlatform//Events//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${detail.id}@bookclub`,
      `DTSTAMP:${icsDate(new Date())}`,
      `DTSTART:${icsDate(start)}`,
      `DTEND:${icsDate(end)}`,
      `SUMMARY:${icsEscape(detail.title)}`,
      `DESCRIPTION:${icsEscape(detail.description ?? '')}`,
      `LOCATION:${icsEscape(location)}`,
      ...(detail.cancelled ? ['STATUS:CANCELLED'] : []),
      'END:VEVENT',
      'END:VCALENDAR',
      '',
    ].join('\r\n');
  }

  // ---------- Reminders (24h and 2h before) ----------

  async scheduleReminders(e: Event) {
    for (const [offset, ms] of Object.entries(REMINDER_OFFSETS) as [ReminderOffset, number][]) {
      const delay = e.startsAt.getTime() - ms - Date.now();
      if (delay <= 0) continue;
      const data: ReminderJob = { eventId: e.id, offset, startsAt: e.startsAt.toISOString() };
      await this.queues.add('reminders', 'event-reminder', data, {
        delay,
        jobId: `rem-${e.id}-${offset}-${e.startsAt.getTime()}`,
      });
    }
  }

  /** Runs in the worker. Skips reminders for cancelled or rescheduled events. */
  async sendReminder(job: ReminderJob) {
    const e = await this.prisma.event.findUnique({ where: { id: job.eventId } });
    if (!e || e.cancelledAt || e.startsAt.toISOString() !== job.startsAt) return;
    const rsvps = await this.prisma.eventRsvp.findMany({
      where: { eventId: e.id, status: { in: ['going', 'maybe'] } },
      select: { userId: true },
    });
    const when = job.offset === '24h' ? 'tomorrow' : 'in 2 hours';
    const where = e.mode === 'online' ? 'Online — the link is on the event page' : [e.venueName, e.area].filter(Boolean).join(', ');
    await this.notifications.notify(
      rsvps.map((r) => r.userId),
      { type: 'event_reminder', title: `${e.title} is ${when}`, body: `${formatIst(e.startsAt)} · ${where}`, url: `/events/${e.id}` },
      {
        email: { subject: `Reminder: ${e.title} is ${when}`, text: `${e.title}\n${formatIst(e.startsAt)}\n${where}` },
        whatsapp: { template: 'event_reminder', params: [e.title, formatIst(e.startsAt), where] },
      },
    );
  }
}

