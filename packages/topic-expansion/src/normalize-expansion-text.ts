export function normalizeExpansionText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s?]/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
}

export function stableKey(prefix: string, value: string): string {
  return `${prefix}:${normalizeExpansionText(value).replace(/\s+/gu, '-')}`;
}
