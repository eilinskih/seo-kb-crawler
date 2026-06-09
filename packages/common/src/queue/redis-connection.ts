import { ConnectionOptions } from 'bullmq';

export function redisConnectionFromUrl(redisUrl: string): ConnectionOptions {
  const url = new URL(redisUrl);
  const database = url.pathname.slice(1);

  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 6379,
    username: url.username || undefined,
    password: url.password || undefined,
    db: database ? Number(database) : 0,
    tls: url.protocol === 'rediss:' ? {} : undefined,
  };
}
