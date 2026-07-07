import { EntityGeoHint, EntityValidationError } from './entity-types';

export function normalizeEntityText(value: string, field = 'text'): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new EntityValidationError(`${field} must be a non-empty string`);
  }
  return value.trim().replace(/\s+/gu, ' ');
}

export function normalizeEntityLookupText(value: string, field = 'text'): string {
  return normalizeEntityText(value, field)
    .toLocaleLowerCase('und')
    .replace(/[._/]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
}

export function normalizeOptionalText(
  value: string | undefined,
): string | null {
  if (value === undefined) {
    return null;
  }
  return normalizeEntityText(value);
}

export function normalizeGeoKey(geo?: EntityGeoHint): string | null {
  if (!geo) {
    return null;
  }
  const parts = [
    geo.countryCode?.trim().toUpperCase(),
    geo.regionCode?.trim().toUpperCase(),
    geo.city?.trim().toLocaleLowerCase('und'),
  ].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(':') : null;
}
