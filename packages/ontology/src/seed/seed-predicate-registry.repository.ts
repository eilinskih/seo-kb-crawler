import {
  PredicateAliasRecord,
  PredicateAliasResolverRepository,
  PredicateRegistryRecord,
  PredicateRegistrySnapshot,
} from '../domain/ontology-types';
import { globalPredicateRegistrySnapshot } from './global-predicate-registry';

export class SeedPredicateRegistryRepository
  implements PredicateAliasResolverRepository
{
  constructor(
    private readonly snapshot: PredicateRegistrySnapshot =
      globalPredicateRegistrySnapshot,
  ) {}

  async findAliasesByNormalizedText(input: {
    normalizedAliasText: string;
    language?: string;
    vertical?: string;
    includeDraft: boolean;
  }): Promise<PredicateAliasRecord[]> {
    return this.snapshot.aliases.filter((alias) =>
      alias.normalizedAliasText === input.normalizedAliasText &&
      (input.includeDraft || alias.reviewStatus === 'approved') &&
      matchesOptional(alias.language, input.language) &&
      matchesOptional(alias.vertical, input.vertical),
    );
  }

  async findPredicateById(
    id: string,
  ): Promise<PredicateRegistryRecord | null> {
    return this.snapshot.predicates.find((predicate) => predicate.id === id)
      ?? null;
  }
}

function matchesOptional(
  stored: string | null,
  requested?: string,
): boolean {
  if (requested === undefined) {
    return true;
  }
  return stored === requested || stored === null;
}
