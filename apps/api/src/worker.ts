import 'dotenv/config';
import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { WorkerAppModule } from './app.module';

/** Standalone worker: same image as the API, different entry point. */
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerAppModule);
  app.enableShutdownHooks();
  Logger.log('Worker running', 'Bootstrap');
}

void bootstrap();
