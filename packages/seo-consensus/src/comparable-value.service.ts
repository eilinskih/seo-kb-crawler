import { Injectable } from '@nestjs/common';
import { ComparableValue } from './domain/seo-consensus-types';

@Injectable()
export class ComparableValueService {
  fromAttributes(attributes: Record<string, unknown>): ComparableValue {
    if ('value' in attributes) {
      return toComparableValue('value', attributes.value);
    }
    if (
      typeof attributes.min === 'number' &&
      typeof attributes.max === 'number'
    ) {
      return {
        comparableKey: 'range',
        kind: 'range',
        fingerprint: `range:${attributes.min}:${attributes.max}`,
        summary: `${attributes.min}..${attributes.max}`,
        rawValue: { min: attributes.min, max: attributes.max },
      };
    }

    const primitiveEntries = Object.entries(attributes).filter(([, value]) =>
      ['string', 'number', 'boolean'].includes(typeof value),
    );
    if (primitiveEntries.length === 1) {
      const [key, value] = primitiveEntries[0];
      return toComparableValue(key, value);
    }

    return {
      comparableKey: 'comparison_deferred',
      kind: 'comparison_deferred',
      fingerprint: `deferred:${stableStringify(attributes)}`,
      summary: 'Comparison deferred',
      rawValue: attributes,
    };
  }
}

function toComparableValue(key: string, value: unknown): ComparableValue {
  if (typeof value === 'number') {
    return {
      comparableKey: key,
      kind: 'number',
      fingerprint: `${key}:number:${value}`,
      summary: String(value),
      rawValue: value,
    };
  }
  if (typeof value === 'boolean') {
    return {
      comparableKey: key,
      kind: 'boolean',
      fingerprint: `${key}:boolean:${value}`,
      summary: String(value),
      rawValue: value,
    };
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase().replace(/\s+/gu, ' ');
    return {
      comparableKey: key,
      kind: normalized.length <= 80 ? 'category' : 'string',
      fingerprint: `${key}:string:${normalized}`,
      summary: normalized,
      rawValue: value,
    };
  }
  return {
    comparableKey: key,
    kind: 'comparison_deferred',
    fingerprint: `${key}:deferred:${stableStringify(value)}`,
    summary: 'Comparison deferred',
    rawValue: value,
  };
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => `${key}:${stableStringify(nested)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}
