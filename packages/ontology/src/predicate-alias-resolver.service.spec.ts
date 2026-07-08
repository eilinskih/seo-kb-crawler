import { PredicateAliasResolverService } from './predicate-alias-resolver.service';
import {
  PredicateRegistryRecord,
  PredicateRegistrySnapshot,
} from './domain/ontology-types';
import { SeedPredicateRegistryRepository } from './seed/seed-predicate-registry.repository';

const now = new Date('2026-07-08T00:00:00.000Z');

describe('PredicateAliasResolverService', () => {
  it('resolves approved predicate aliases to canonical predicates', async () => {
    const service = serviceFromSnapshot({
      predicates: [
        predicate('predicate-has-requirement', 'has_requirement', 'approved'),
      ],
      aliases: [
        alias('alias-eligible-for', 'predicate-has-requirement', 'eligible for'),
      ],
    });

    await expect(
      service.resolve({ predicateCandidate: 'eligible_for' }),
    ).resolves.toEqual(expect.objectContaining({
      status: 'resolved',
      normalizedCandidate: 'eligible for',
      predicate: expect.objectContaining({ key: 'has_requirement' }),
    }));
  });

  it('does not resolve deprecated predicates as canonical facts', async () => {
    const service = serviceFromSnapshot({
      predicates: [
        predicate('predicate-old-price', 'old_price', 'deprecated'),
      ],
      aliases: [
        alias('alias-old-cost', 'predicate-old-price', 'cost'),
      ],
    });

    await expect(
      service.resolve({ predicateCandidate: 'cost' }),
    ).resolves.toEqual(expect.objectContaining({
      status: 'deprecated',
      predicate: expect.objectContaining({ key: 'old_price' }),
    }));
  });

  it('keeps draft alias matches pending when draft aliases are included', async () => {
    const service = serviceFromSnapshot({
      predicates: [
        predicate('predicate-applies-to', 'applies_to', 'approved'),
      ],
      aliases: [
        alias('alias-qualified-for', 'predicate-applies-to', 'qualified for', {
          reviewStatus: 'draft',
        }),
      ],
    });

    await expect(
      service.resolve({
        predicateCandidate: 'qualified-for',
        includeDraft: true,
      }),
    ).resolves.toEqual(expect.objectContaining({
      status: 'pending_review',
      reason: 'Matched predicate or alias is still in draft review state',
    }));
  });

  it('does not invent canonical predicates for unknown raw candidates', async () => {
    const service = serviceFromSnapshot({
      predicates: [],
      aliases: [],
    });

    await expect(
      service.resolve({ predicateCandidate: 'model generated maybe thing' }),
    ).resolves.toEqual({
      status: 'not_found',
      normalizedCandidate: 'model generated maybe thing',
      predicate: null,
      alias: null,
      candidates: [],
      reason: 'No registry alias matched the predicate candidate',
    });
  });

  it('prefers vertical-specific aliases over global aliases', async () => {
    const service = serviceFromSnapshot({
      predicates: [
        predicate('predicate-global-applies', 'applies_to', 'approved'),
        predicate('predicate-medical-eligible', 'eligible_for', 'approved'),
      ],
      aliases: [
        alias('alias-global-applies', 'predicate-global-applies', 'applies to'),
        alias('alias-medical-applies', 'predicate-medical-eligible', 'applies to', {
          vertical: 'health',
        }),
      ],
    });

    await expect(
      service.resolve({
        predicateCandidate: 'applies to',
        vertical: 'health',
      }),
    ).resolves.toEqual(expect.objectContaining({
      status: 'resolved',
      predicate: expect.objectContaining({ key: 'eligible_for' }),
    }));
  });
});

function serviceFromSnapshot(
  partial: Partial<PredicateRegistrySnapshot>,
): PredicateAliasResolverService {
  return new PredicateAliasResolverService(
    new SeedPredicateRegistryRepository({
      predicates: partial.predicates ?? [],
      aliases: partial.aliases ?? [],
      attributeSchemas: partial.attributeSchemas ?? [],
      entityTypes: partial.entityTypes ?? [],
    }),
  );
}

function predicate(
  id: string,
  key: string,
  reviewStatus: PredicateRegistryRecord['reviewStatus'],
): PredicateRegistryRecord {
  return {
    id,
    key,
    label: key,
    description: key,
    subjectEntityTypes: [],
    objectEntityTypes: [],
    attributeSchemaKey: null,
    vertical: null,
    aliases: [],
    examples: [],
    usageNotes: null,
    reviewStatus,
    replacementPredicateId: null,
    createdAt: now,
    updatedAt: now,
  };
}

function alias(
  id: string,
  predicateId: string,
  aliasText: string,
  overrides: Partial<PredicateRegistrySnapshot['aliases'][number]> = {},
): PredicateRegistrySnapshot['aliases'][number] {
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
    ...overrides,
  };
}
