import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ApiModule } from './api.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(ApiModule);
  const config = app.get(ConfigService);
  const port = config.getOrThrow<number>('API_PORT');

  app.enableShutdownHooks();
  await app.listen(port, '0.0.0.0');

  Logger.log(`API listening on port ${port}`, 'Bootstrap');
}

void bootstrap();
