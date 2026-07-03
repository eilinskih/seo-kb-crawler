import { createHash } from 'node:crypto';

export function providerItemIdentity(
  source: string,
  index: number,
  parts: string[],
): string {
  const digest = createHash('sha256')
    .update(source)
    .update('\0')
    .update(String(index))
    .update('\0')
    .update(parts.join('\0'))
    .digest('hex');

  return `${source}:${index}:${digest}`;
}
