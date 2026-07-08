import { OntologyValidationError } from './ontology-types';

export function normalizePredicateText(value: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new OntologyValidationError(
      'predicateCandidate must be a non-empty string',
    );
  }
  return value
    .trim()
    .replace(/[_-]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .toLocaleLowerCase('und');
}
