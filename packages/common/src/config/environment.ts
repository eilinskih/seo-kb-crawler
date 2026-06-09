export interface Environment {
  NODE_ENV: string;
  API_PORT: number;
  DATABASE_URL: string;
  REDIS_URL: string;
}

export function validateEnvironment(
  environment: Record<string, unknown>,
): Environment {
  const apiPort = Number(environment.API_PORT ?? 3000);
  const databaseUrl = requiredString(environment, 'DATABASE_URL');
  const redisUrl = requiredString(environment, 'REDIS_URL');

  if (!Number.isInteger(apiPort) || apiPort < 1 || apiPort > 65535) {
    throw new Error('API_PORT must be an integer between 1 and 65535');
  }

  assertProtocol(databaseUrl, 'DATABASE_URL', ['postgres:', 'postgresql:']);
  assertProtocol(redisUrl, 'REDIS_URL', ['redis:', 'rediss:']);

  return {
    NODE_ENV: String(environment.NODE_ENV ?? 'development'),
    API_PORT: apiPort,
    DATABASE_URL: databaseUrl,
    REDIS_URL: redisUrl,
  };
}

function requiredString(
  environment: Record<string, unknown>,
  key: string,
): string {
  const value = environment[key];

  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${key} is required`);
  }

  return value;
}

function assertProtocol(
  value: string,
  key: string,
  protocols: string[],
): void {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`${key} must be a valid URL`);
  }

  if (!protocols.includes(url.protocol)) {
    throw new Error(`${key} uses an unsupported protocol`);
  }
}
