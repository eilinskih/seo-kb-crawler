import {
  LongTailCandidate,
  LongTailOpportunityTree,
} from './domain/long-tail-discovery-types';
import { confidenceRank, lowestConfidence } from './long-tail-defaults';
import { stableLongTailKey } from './normalize-long-tail-text';

export class OpportunityTreeService {
  build(candidates: LongTailCandidate[]): LongTailOpportunityTree[] {
    const grouped = new Map<string, LongTailCandidate[]>();

    for (const candidate of candidates) {
      const rootLabel = candidate.dimensions[0]?.label ?? 'Long-tail';
      grouped.set(rootLabel, [...(grouped.get(rootLabel) ?? []), candidate]);
    }

    return [...grouped.entries()]
      .map(([rootLabel, group]) => ({
        treeKey: stableLongTailKey('tree', rootLabel),
        rootLabel,
        pathLabels: unique(
          group.flatMap((candidate) =>
            candidate.dimensions.map((dimension) => dimension.label),
          ),
        ),
        childCandidateKeys: group.map((candidate) => candidate.candidateKey),
        supportingSignalCount: group.reduce(
          (sum, candidate) => sum + candidate.sourceSignals.length,
          0,
        ),
        confidence: lowestConfidence(group.map((candidate) => candidate.confidence)),
        warnings:
          group.length === 1
            ? ['Opportunity tree has one candidate and may need more evidence']
            : [],
      }))
      .sort(
        (a, b) =>
          confidenceRank(b.confidence) - confidenceRank(a.confidence) ||
          a.treeKey.localeCompare(b.treeKey),
      );
  }
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}
