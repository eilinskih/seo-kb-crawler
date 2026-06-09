import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { CrawlerWorkerModule } from './crawler-worker.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(CrawlerWorkerModule);
  app.enableShutdownHooks();

  Logger.log('Crawler worker is ready', 'Bootstrap');
}

void bootstrap();
