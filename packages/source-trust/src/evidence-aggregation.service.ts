import { Injectable } from '@nestjs/common';
import {
  EvidenceAggregationInput,
  EvidenceStrengthScore,
  ScoreComponents,
  TrustAdjustment,
} from './domain/source-trust-types';

@Injectable()
export class EvidenceAggregationService {
  aggregate(input: EvidenceAggregationInput): EvidenceStrengthScore {
    const supportingChunkCount = unique(input.chunkIds).length;
    const supportingDocumentCount = unique(input.documentIds).length;
    const supportingDomainCount = unique(
      input.sourceDomains.filter((domain): domain is string => Boolean(domain)),
    ).length;
    const averageSourceTrust = average(input.sourceTrustScores);
    const adjustments: TrustAdjustment[] = [
      {
        key: 'supporting_chunks',
        value: Math.min(0.24, supportingChunkCount * 0.06),
        reason: 'Evidence is supported by chunks',
      },
      {
        key: 'supporting_documents',
        value: Math.min(0.24, supportingDocumentCount * 0.08),
        reason: 'Evidence is supported by documents',
      },
      {
        key: 'supporting_domains',
        value: Math.min(0.24, supportingDomainCount * 0.08),
        reason: 'Evidence is supported by distinct domains',
      },
    ];

    if (averageSourceTrust !== null) {
      adjustments.push({
        key: 'average_source_trust',
        value: (averageSourceTrust - 0.5) * 0.28,
        reason: 'Average source trust adjusts evidence strength',
      });
    }
    if (input.possibleConflict) {
      adjustments.push({
        key: 'possible_conflict_unresolved',
        value: -0.18,
        reason: 'Possible conflict is visible but unresolved',
      });
    }

    const components = buildComponents(0.28, adjustments);

    return {
      itemId: input.itemId,
      itemType: input.itemType,
      supportingChunkCount,
      supportingDocumentCount,
      supportingDomainCount,
      averageSourceTrust,
      components,
      score: components.finalScore,
      uncertaintyFlags: input.possibleConflict
        ? ['possible_conflict_unresolved']
        : [],
    };
  }
}

function buildComponents(
  baseScore: number,
  adjustments: TrustAdjustment[],
): ScoreComponents {
  return {
    baseScore,
    adjustments,
    finalScore: clamp(
      baseScore + adjustments.reduce((sum, adjustment) => sum + adjustment.value, 0),
    ),
  };
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  return clamp(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, Number(value.toFixed(4))));
}
