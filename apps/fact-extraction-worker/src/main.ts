import { NestFactory } from '@nestjs/core';
import { FactExtractionWorkerModule } from './fact-extraction-worker.module';

async function bootstrap(): Promise<void> {
  await NestFactory.createApplicationContext(FactExtractionWorkerModule);
}

void bootstrap();
