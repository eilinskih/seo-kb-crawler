import {
  AttributeSchemaRecord,
  EntityTypeRegistryRecord,
  PredicateAliasRecord,
  PredicateRegistryRecord,
  PredicateRegistrySnapshot,
} from '../domain/ontology-types';

const now = new Date('2026-07-08T00:00:00.000Z');

export const globalAttributeSchemas: AttributeSchemaRecord[] = [
  {
    key: 'empty',
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {},
    },
    description: 'No structured attributes are required.',
    examples: [{}],
    reviewStatus: 'approved',
    createdAt: now,
    updatedAt: now,
  },
  {
    key: 'price',
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        amount: { type: 'number' },
        currency: { type: 'string' },
        unit: { type: 'string' },
      },
      required: ['amount', 'currency'],
    },
    description: 'Unit-aware price attributes.',
    examples: [{ amount: 199, currency: 'PLN', unit: 'session' }],
    reviewStatus: 'approved',
    createdAt: now,
    updatedAt: now,
  },
];

export const globalEntityTypes: EntityTypeRegistryRecord[] = [
  {
    id: 'entity-type-concept',
    key: 'concept',
    label: 'Concept',
    description: 'General topic, concept or abstract object.',
    vertical: null,
    aliases: ['topic', 'idea'],
    examples: [{ text: 'laser hair removal' }],
    usageNotes: null,
    reviewStatus: 'approved',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'entity-type-place',
    key: 'place',
    label: 'Place',
    description: 'Location, city, region or country.',
    vertical: null,
    aliases: ['location', 'geo'],
    examples: [{ text: 'Warsaw' }],
    usageNotes: null,
    reviewStatus: 'approved',
    createdAt: now,
    updatedAt: now,
  },
];

export const globalPredicates: PredicateRegistryRecord[] = [
  predicate('predicate-has-price', 'has_price', 'Has price', 'price'),
  predicate(
    'predicate-available-in-location',
    'available_in_location',
    'Available in location',
    'empty',
    ['place'],
  ),
  predicate(
    'predicate-has-requirement',
    'has_requirement',
    'Has requirement',
    'empty',
  ),
  predicate(
    'predicate-has-contraindication',
    'has_contraindication',
    'Has contraindication',
    'empty',
  ),
  predicate('predicate-compatible-with', 'compatible_with', 'Compatible with'),
  predicate('predicate-mentions', 'mentions', 'Mentions'),
];

export const globalPredicateAliases: PredicateAliasRecord[] = [
  alias('alias-price', 'predicate-has-price', 'price'),
  alias('alias-cost', 'predicate-has-price', 'cost'),
  alias('alias-available-location', 'predicate-available-in-location', 'available in'),
  alias('alias-applies-to', 'predicate-available-in-location', 'applies to'),
  alias('alias-requires', 'predicate-has-requirement', 'requires'),
  alias('alias-eligible-for', 'predicate-has-requirement', 'eligible for'),
  alias('alias-contraindication', 'predicate-has-contraindication', 'contraindication'),
  alias('alias-compatible', 'predicate-compatible-with', 'compatible with'),
  alias('alias-mentions', 'predicate-mentions', 'mentions'),
];

export const globalPredicateRegistrySnapshot: PredicateRegistrySnapshot = {
  predicates: globalPredicates,
  aliases: globalPredicateAliases,
  attributeSchemas: globalAttributeSchemas,
  entityTypes: globalEntityTypes,
};

function predicate(
  id: string,
  key: string,
  label: string,
  attributeSchemaKey = 'empty',
  objectEntityTypes: string[] = [],
): PredicateRegistryRecord {
  return {
    id,
    key,
    label,
    description: label,
    subjectEntityTypes: [],
    objectEntityTypes,
    attributeSchemaKey,
    vertical: null,
    aliases: [],
    examples: [],
    usageNotes: null,
    reviewStatus: 'approved',
    replacementPredicateId: null,
    createdAt: now,
    updatedAt: now,
  };
}

function alias(
  id: string,
  predicateId: string,
  aliasText: string,
): PredicateAliasRecord {
  return {
    id,
    predicateId,
    aliasText,
    normalizedAliasText: aliasText,
    language: null,
    vertical: null,
    confidence: 1,
    reviewStatus: 'approved',
    createdAt: now,
    updatedAt: now,
  };
}
