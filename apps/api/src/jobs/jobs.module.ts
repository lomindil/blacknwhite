import { Injectable, Logger, Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import { BooksModule } from '../books/books.controller';
import { BooksService } from '../books/books.service';
import { ClubsModule } from '../clubs/clubs.module';
import { ClubsService } from '../clubs/clubs.service';
import { MailerService, WhatsAppService } from '../core/messaging.service';
import { DeliverJob } from '../core/notifications.service';
import { PrismaService } from '../core/prisma.service';
import { bullConnection, QueueName, QueueService } from '../core/queue.service';
import { SearchService } from '../core/search.service';
import { EventsModule } from '../events/events.module';
import { EventsService, ReminderJob } from '../events/events.service';
import { ImportsModule } from '../imports/imports.module';
import { ImportJobData, ImportsService } from '../imports/imports.service';
import { MediaModule, MediaService } from '../media/media.module';

/**
 * Background jobs (docs/architecture.md §2): imports, aggregate counters, notification
 * delivery, event reminders, schedule nudges, the daily email digest and search indexing.
 * Runs in its own process in production (dist/worker.js) or inside the API in dev.
 */
@Injectable()
export class JobsRunner implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('Jobs');
  private readonly workers: Worker[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly queues: QueueService,
    private readonly search: SearchService,
    private readonly mailer: MailerService,
    private readonly whatsapp: WhatsAppService,
    private readonly books: BooksService,
    private readonly clubs: ClubsService,
    private readonly events: EventsService,
    private readonly imports: ImportsService,
    private readonly media: MediaService,
  ) {}

  async onModuleInit() {
    const handlers: Record<QueueName, (job: Job) => Promise<unknown>> = {
      imports: (job) => this.imports.process(job.data as ImportJobData),
      deliver: (job) => this.deliver(job.data as DeliverJob),
      search: (job) => (job.name === 'club' ? this.search.indexClub(job.data.id) : this.search.indexBook(job.data.id)),
      reminders: (job) => this.events.sendReminder(job.data as ReminderJob),
      cron: (job) => this.cron(job.name),
    };
    for (const [name, handler] of Object.entries(handlers) as [QueueName, (job: Job) => Promise<unknown>][]) {
      const worker = new Worker(name, handler, {
        connection: bullConnection(),
        concurrency: name === 'imports' ? 1 : 5,
      });
      worker.on('failed', (job, err) => this.logger.warn(`${name}/${job?.name} failed: ${err.message}`));
      this.workers.push(worker);
    }

    const cron = this.queues.queue('cron');
    await cron.upsertJobScheduler('stats', { every: 15 * 60 * 1000 }, { name: 'stats' });
    // Times in UTC: 08:00 IST digest, 09:00 IST schedule nudges.
    await cron.upsertJobScheduler('digest', { pattern: '30 2 * * *' }, { name: 'digest' });
    await cron.upsertJobScheduler('schedule-nudges', { pattern: '30 3 * * *' }, { name: 'schedule-nudges' });
    await cron.upsertJobScheduler('media-cleanup', { pattern: '0 22 * * *' }, { name: 'media-cleanup' });

    await this.search.setup();
    await this.books.recomputeStats().catch((e) => this.logger.warn(`Initial stats failed: ${e.message}`));
    this.logger.log('Worker started');
  }

  async onModuleDestroy() {
    await Promise.all(this.workers.map((w) => w.close()));
  }

  private async cron(name: string) {
    if (name === 'stats') return this.books.recomputeStats();
    if (name === 'digest') return this.sendDigests();
    if (name === 'schedule-nudges') return this.clubs.sendScheduleNudges();
    if (name === 'media-cleanup') return this.media.cleanupUnattached();
  }

  private async deliver(job: DeliverJob) {
    const user = await this.prisma.user.findUnique({ where: { id: job.userId }, include: { settings: true } });
    if (!user || user.deletedAt) return;
    const s = user.settings;
    if (job.channel === 'email') {
      if (s && !s.notifyEmail) return;
      await this.mailer.send(user.email, job.subject!, job.text!, job.url);
    } else if (s?.notifyWhatsapp && s.whatsappNumber && s.whatsappOptInAt) {
      await this.whatsapp.sendTemplate(s.whatsappNumber, job.template!, job.params ?? []);
    }
  }

  /** A daily email digest replaces per-post emails. */
  private async sendDigests() {
    const users = await this.prisma.user.findMany({
      where: { deletedAt: null, settings: { notifyEmail: true, emailDigest: true } },
      include: { settings: true },
    });
    for (const u of users) {
      const since = u.settings?.lastDigestAt ?? new Date(Date.now() - 24 * 3600 * 1000);
      const items = await this.prisma.notification.findMany({
        where: { userId: u.id, readAt: null, emailedAt: null, createdAt: { gt: since } },
        orderBy: { createdAt: 'desc' },
        take: 30,
      });
      if (items.length) {
        const lines = items.map((n) => `• ${(n.payload as { title?: string }).title ?? n.type}`).join('\n');
        await this.mailer.send(u.email, `Your daily digest: ${items.length} update${items.length > 1 ? 's' : ''}`, `Here's what you missed:\n\n${lines}`, '/notifications');
        await this.prisma.notification.updateMany({ where: { id: { in: items.map((i) => i.id) } }, data: { emailedAt: new Date() } });
      }
      await this.prisma.userSettings.update({ where: { userId: u.id }, data: { lastDigestAt: new Date() } });
    }
  }
}

@Module({
  imports: [BooksModule, ClubsModule, EventsModule, ImportsModule, MediaModule],
  providers: [JobsRunner],
})
export class JobsModule {}
