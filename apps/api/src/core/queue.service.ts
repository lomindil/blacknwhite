import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { JobsOptions, Queue } from 'bullmq';
import Redis from 'ioredis';
import { env } from '../config/env';

export const QUEUES = ['imports', 'deliver', 'search', 'reminders', 'cron'] as const;
export type QueueName = (typeof QUEUES)[number];

export const bullConnection = () => new Redis(env().REDIS_URL, { maxRetriesPerRequest: null });

/** Producer side of the background jobs. The worker (src/jobs) consumes them. */
@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly connection = bullConnection();
  private readonly queues = new Map<QueueName, Queue>();

  queue(name: QueueName): Queue {
    let q = this.queues.get(name);
    if (!q) {
      q = new Queue(name, {
        connection: this.connection,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: 1000,
          removeOnFail: 5000,
        },
      });
      this.queues.set(name, q);
    }
    return q;
  }

  add(name: QueueName, jobName: string, data: unknown, opts?: JobsOptions) {
    return this.queue(name).add(jobName, data, opts);
  }

  async onModuleDestroy() {
    await Promise.all([...this.queues.values()].map((q) => q.close()));
    await this.connection.quit();
  }
}
