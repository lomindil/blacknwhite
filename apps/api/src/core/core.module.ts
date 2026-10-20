import { Global, Module } from '@nestjs/common';
import { AccessService } from './access.service';
import { MailerService, WhatsAppService } from './messaging.service';
import { NotificationsService } from './notifications.service';
import { PrismaService } from './prisma.service';
import { QueueService } from './queue.service';
import { RealtimeService } from './realtime.service';
import { RedisService } from './redis.service';
import { SearchService } from './search.service';
import { StorageService } from './storage.service';

const providers = [
  PrismaService,
  RedisService,
  QueueService,
  SearchService,
  MailerService,
  WhatsAppService,
  RealtimeService,
  NotificationsService,
  AccessService,
  StorageService,
];

/** Shared infrastructure used by every feature module, in both the API and the worker. */
@Global()
@Module({ providers, exports: providers })
export class CoreModule {}
