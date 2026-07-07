import { createHash } from 'node:crypto';

export function normalizeChunkText(text: string): string {
  return text.replace(/\s+/gu, ' ').trim().toLowerCase();
}

export function stableHash(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}
