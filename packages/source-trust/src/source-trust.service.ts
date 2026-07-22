import { Injectable } from '@nestjs/common';
import {
  ScoreComponents,
  SourceTrustInput,
  SourceTrustScore,
  SourceTrustValidationError,
  SourceType,
  TrustAdjustment,
} from './domain/source-trust-types';
import { SourceClassifier } from './source-classifier.service';

export const SOURCE_TRUST_RULE_VERSION = 'source-trust-default-v1';

const BASE_SOURCE_TYPE_SCORES: Record<SourceType, number> = {
  official_documentation: 0.9,
  government: 0.95,
  manufacturer: 0.85,
  vendor: 0.72,
  news: 0.65,
  wiki_reference: 0.62,
  forum_community: 0.42,
  user_generated: 0.35,
  marketplace: 0.58,
  affiliate: 0.38,
  unknown: 0.45,
};

@Injectable()
export class SourceTrustService {
  constructor(private readonly classifier: SourceClassifier) {}

  score(input: SourceTrustInput): SourceTrustScore {
    if (!input.sourceUrl.trim()) {
      throw new SourceTrustValidationError('sourceUrl must be non-empty');
    }

    const classification = input.classification ?? this.classifier.classify(input);
    const adjustments: TrustAdjustment[] = [];
    const baseScore = input.reviewedScore ?? BASE_SOURCE_TYPE_SCORES[
      classification.sourceType
    ];

    if (input.metadataComplete === false) {
      adjustments.push({
        key: 'metadata_incomplete',
        value: -0.06,
        reason: 'Source metadata is incomplete',
      });
    }
    if ((input.warnings ?? []).length > 0) {
      adjustments.push({
        key: 'processing_warnings',
        value: -0.04 * Math.min(input.warnings?.length ?? 0, 3),
        reason: 'Crawl or processing warnings are present',
      });
    }
    if (classification.sourceType === 'forum_community') {
      adjustments.push({
        key: 'community_source_penalty',
        value: -0.08,
        reason: 'Community sources need stronger corroboration',
      });
    }
    if (classification.sourceType === 'affiliate') {
      adjustments.push({
        key: 'affiliate_source_penalty',
        value: -0.12,
        reason: 'Affiliate sources may optimize for monetization',
      });
    }

    const components = buildComponents(baseScore, adjustments);

    return {
      sourceUrl: input.sourceUrl.trim(),
      canonicalUrl: input.canonicalUrl ?? null,
      sourceDomain: input.sourceDomain ?? domainFromUrl(input.sourceUrl),
      sourceType: classification.sourceType,
      reviewStatus: input.reviewStatus ?? (
        input.reviewedScore !== undefined || input.reviewedSourceType
          ? 'overridden'
          : 'inferred'
      ),
      ruleVersion: input.ruleVersion ?? SOURCE_TRUST_RULE_VERSION,
      components,
      score: components.finalScore,
    };
  }
}

function buildComponents(
  baseScore: number,
  adjustments: TrustAdjustment[],
): ScoreComponents {
  return {
    baseScore: clamp(baseScore),
    adjustments,
    finalScore: clamp(
      baseScore + adjustments.reduce((sum, adjustment) => sum + adjustment.value, 0),
    ),
  };
}

function domainFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, Number(value.toFixed(4))));
}
