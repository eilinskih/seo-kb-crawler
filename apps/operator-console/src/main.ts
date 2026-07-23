import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { OperatorConsoleModule } from './operator-console.module';

const defaultPort = 4010;

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(OperatorConsoleModule);
  const port = normalizePort(process.env.OPERATOR_CONSOLE_PORT);

  app.enableShutdownHooks();
  await app.listen(port, '0.0.0.0');

  Logger.log(`Operator Console listening on port ${port}`, 'Bootstrap');
}

function normalizePort(value: string | undefined): number {
  if (!value) {
    return defaultPort;
  }
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('OPERATOR_CONSOLE_PORT must be a valid TCP port');
  }
  return port;
}

void bootstrap();
