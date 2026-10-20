import { Controller, DynamicModule, Get, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './auth/auth.guard';
import { AuthModule } from './auth/auth.module';
import { BooksModule } from './books/books.controller';
import { BookstoresModule } from './bookstores/bookstores.module';
import { ClubsModule } from './clubs/clubs.module';
import { Public } from './common/http';
import { CoreModule } from './core/core.module';
import { PrismaService } from './core/prisma.service';
import { RedisService } from './core/redis.service';
import { DiscussionModule } from './discussion/discussion.module';
import { DmsModule } from './dms/dms.module';
import { EventsModule } from './events/events.module';
import { ImportsModule } from './imports/imports.module';
import { JobsModule } from './jobs/jobs.module';
import { MediaModule } from './media/media.module';
import { RealtimeModule } from './realtime/realtime.gateway';
import { SafetyModule } from './safety/safety.module';
import { UsersModule } from './users/users.module';

@Controller('health')
class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Public()
  @Get()
  async health() {
    const [db, redis] = await Promise.all([
      this.prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
      this.redis.client.ping().then(() => true).catch(() => false),
    ]);
    return { ok: db && redis, db, redis };
  }
}

export const featureModules = [
  AuthModule,
  UsersModule,
  BooksModule,
  ImportsModule,
  ClubsModule,
  DiscussionModule,
  DmsModule,
  EventsModule,
  BookstoresModule,
  SafetyModule,
  MediaModule,
];

@Module({})
export class AppModule {
  static register(opts: { worker: boolean }): DynamicModule {
    return {
      module: AppModule,
      imports: [CoreModule, ...featureModules, RealtimeModule, ...(opts.worker ? [JobsModule] : [])],
      controllers: [HealthController],
      providers: [{ provide: APP_GUARD, useClass: AuthGuard }],
    };
  }
}

/** The standalone worker process: no HTTP, just jobs. */
@Module({ imports: [CoreModule, AuthModule, JobsModule] })
export class WorkerAppModule {}
