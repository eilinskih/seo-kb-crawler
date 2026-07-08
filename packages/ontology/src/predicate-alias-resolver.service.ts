import { Inject, Injectable } from '@nestjs/common';
import { normalizePredicateText } from './domain/predicate-normalization';
import {
  PredicateAliasRecord,
  PredicateAliasResolution,
  PredicateAliasResolutionInput,
  PredicateAliasResolverRepository,
} from './domain/ontology-types';
import { PREDICATE_ALIAS_RESOLVER_REPOSITORY } from './ontology.tokens';

@Injectable()
export class PredicateAliasResolverService {
  constructor(
    @Inject(PREDICATE_ALIAS_RESOLVER_REPOSITORY)
    private readonly repository: PredicateAliasResolverRepository,
  ) {}

  async resolve(
    input: PredicateAliasResolutionInput,
  ): Promise<PredicateAliasResolution> {
    const normalizedCandidate = normalizePredicateText(input.predicateCandidate);
    const aliases = await this.repository.findAliasesByNormalizedText({
      normalizedAliasText: normalizedCandidate,
      language: input.language,
      vertical: input.vertical,
      includeDraft: input.includeDraft ?? false,
    });
    if (aliases.length === 0) {
      return {
        status: 'not_found',
        normalizedCandidate,
        predicate: null,
        alias: null,
        candidates: [],
        reason: 'No registry alias matched the predicate candidate',
      };
    }
    const rankedAliases = rankAliases(aliases, input.language, input.vertical);
    const topAlias = rankedAliases[0];
    const topScore = aliasRankScore(topAlias, input.language, input.vertical);
    const competingAliases = rankedAliases.filter(
      (alias) =>
        aliasRankScore(alias, input.language, input.vertical) === topScore,
    );
    if (competingAliases.length > 1) {
      return {
        status: 'ambiguous',
        normalizedCandidate,
        predicate: null,
        alias: null,
        candidates: competingAliases,
        reason: 'Multiple predicate aliases matched with equal confidence',
      };
    }
    const predicate = await this.repository.findPredicateById(topAlias.predicateId);
    if (!predicate) {
      return {
        status: 'pending_review',
        normalizedCandidate,
        predicate: null,
        alias: topAlias,
        candidates: rankedAliases,
        reason: 'Predicate alias references a missing predicate',
      };
    }
    if (topAlias.reviewStatus === 'draft' || predicate.reviewStatus === 'draft') {
      return {
        status: 'pending_review',
        normalizedCandidate,
        predicate,
        alias: topAlias,
        candidates: rankedAliases,
        reason: 'Matched predicate or alias is still in draft review state',
      };
    }
    if (
      topAlias.reviewStatus === 'deprecated' ||
      predicate.reviewStatus === 'deprecated'
    ) {
      return {
        status: 'deprecated',
        normalizedCandidate,
        predicate,
        alias: topAlias,
        candidates: rankedAliases,
        reason: 'Matched predicate or alias is deprecated',
      };
    }
    return {
      status: 'resolved',
      normalizedCandidate,
      predicate,
      alias: topAlias,
      candidates: rankedAliases,
      reason: 'Approved predicate alias resolved',
    };
  }
}

function rankAliases(
  aliases: PredicateAliasRecord[],
  language?: string,
  vertical?: string,
): PredicateAliasRecord[] {
  return [...aliases].sort((a, b) => {
    const aScore = aliasRankScore(a, language, vertical);
    const bScore = aliasRankScore(b, language, vertical);
    if (aScore !== bScore) {
      return bScore - aScore;
    }
    return a.id.localeCompare(b.id);
  });
}

function aliasRankScore(
  alias: PredicateAliasRecord,
  language?: string,
  vertical?: string,
): number {
  return aliasSpecificityScore(alias, language, vertical) + alias.confidence;
}

function aliasSpecificityScore(
  alias: PredicateAliasRecord,
  language?: string,
  vertical?: string,
): number {
  let score = 0;
  if (language && alias.language === language) {
    score += 2;
  }
  if (vertical && alias.vertical === vertical) {
    score += 3;
  }
  if (!alias.language) {
    score += 1;
  }
  if (!alias.vertical) {
    score += 1;
  }
  return score;
}
