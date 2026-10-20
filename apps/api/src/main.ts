import 'dotenv/config';
import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/errors';
import { env } from './config/env';
import { RedisIoAdapter } from './realtime/realtime.gateway';
import { uploadDir } from './core/storage.service';

async function bootstrap() {
  const config = env();
  const app = await NestFactory.create<NestExpressApplication>(AppModule.register({ worker: config.RUN_WORKER_IN_API }));

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({ origin: [config.WEB_ORIGIN], credentials: true });
  app.useGlobalFilters(new AllExceptionsFilter());
  // Uploaded photos (already re-encoded, so safe to serve as-is). Behind a CDN in production.
  app.useStaticAssets(uploadDir(), { prefix: '/media/', maxAge: '30d', immutable: true, index: false });

  const io = new RedisIoAdapter(app);
  io.connectToRedis(config.REDIS_URL);
  app.useWebSocketAdapter(io);

  app.enableShutdownHooks();
  await app.listen(config.PORT);
  Logger.log(
    `API on http://localhost:${config.PORT} · worker ${config.RUN_WORKER_IN_API ? 'in-process' : 'separate'} · ` +
      `dev login ${config.DEV_LOGIN ? 'on' : 'off'} · search ${config.MEILI_URL ? 'meilisearch' : 'postgres'}`,
    'Bootstrap',
  );
}

void bootstrap();
