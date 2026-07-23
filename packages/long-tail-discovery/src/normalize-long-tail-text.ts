export function normalizeLongTailText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s?]/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
}

export function stableLongTailKey(prefix: string, value: string): string {
  return `${prefix}:${normalizeLongTailText(value).replace(/\s+/gu, '-')}`;
}
