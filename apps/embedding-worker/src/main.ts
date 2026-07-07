import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { EmbeddingWorkerModule } from './embedding-worker.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(EmbeddingWorkerModule);
  app.enableShutdownHooks();

  Logger.log('Embedding worker is ready', 'Bootstrap');
}

void bootstrap();
