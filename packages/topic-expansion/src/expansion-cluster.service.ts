import {
  ExpansionCandidate,
  ExpansionSignalType,
  TopicExpansionCluster,
} from './domain/topic-expansion-types';
import { confidenceRank, highestConfidence } from './topic-expansion-defaults';
import { stableKey } from './normalize-expansion-text';

export class ExpansionClusterService {
  cluster(candidates: ExpansionCandidate[]): TopicExpansionCluster[] {
    const clusters = new Map<string, ExpansionCandidate[]>();

    for (const candidate of candidates) {
      const parentLabel = parentFor(candidate);
      const key = stableKey('cluster', parentLabel);
      clusters.set(key, [...(clusters.get(key) ?? []), candidate]);
    }

    return [...clusters.entries()]
      .map(([clusterKey, grouped]) => ({
        clusterKey,
        parentLabel: parentFor(grouped[0]),
        normalizedParent: parentFor(grouped[0]).toLowerCase(),
        childCandidateKeys: grouped.map((candidate) => candidate.candidateKey),
        sourceSignalCounts: sourceSignalCounts(grouped),
        confidence: highestConfidence(grouped.map((candidate) => candidate.confidence)),
        warnings:
          grouped.length === 1
            ? ['Cluster has one candidate and may need more evidence']
            : [],
      }))
      .sort(
        (a, b) =>
          confidenceRank(b.confidence) - confidenceRank(a.confidence) ||
          a.clusterKey.localeCompare(b.clusterKey),
      );
  }
}

function parentFor(candidate: ExpansionCandidate): string {
  if (candidate.candidateType === 'faq_page') {
    return 'FAQ';
  }
  if (candidate.candidateType === 'comparison_page') {
    return 'Comparison';
  }
  if (candidate.candidateType === 'geo_page') {
    return 'Geo';
  }
  if (candidate.candidateType === 'entity_page') {
    return 'Entity';
  }
  return 'Supporting';
}

function sourceSignalCounts(
  candidates: ExpansionCandidate[],
): Partial<Record<ExpansionSignalType, number>> {
  const counts: Partial<Record<ExpansionSignalType, number>> = {};
  for (const signal of candidates.flatMap((candidate) => candidate.signals)) {
    counts[signal.signalType] = (counts[signal.signalType] ?? 0) + 1;
  }
  return counts;
}
