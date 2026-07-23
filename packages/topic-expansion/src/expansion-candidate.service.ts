import {
  ExpansionCandidate,
  ExpansionCandidateType,
  ExpansionConfidence,
  ExpansionSignal,
  TopicExpansionRequest,
} from './domain/topic-expansion-types';
import { confidenceRank, highestConfidence } from './topic-expansion-defaults';
import { stableKey } from './normalize-expansion-text';

export class ExpansionCandidateService {
  generate(
    signals: ExpansionSignal[],
    request: TopicExpansionRequest,
  ): ExpansionCandidate[] {
    return signals
      .flatMap((signal) => candidateFromSignal(signal, signals, request))
      .sort(
        (a, b) =>
          confidenceRank(b.confidence) - confidenceRank(a.confidence) ||
          a.candidateKey.localeCompare(b.candidateKey),
      );
  }
}

function candidateFromSignal(
  signal: ExpansionSignal,
  allSignals: ExpansionSignal[],
  request: TopicExpansionRequest,
): ExpansionCandidate[] {
  const type = candidateType(signal, allSignals);
  if (!type) {
    return [];
  }
  const supportingSignals = relatedSignals(signal, allSignals);
  const confidence = candidateConfidence(supportingSignals);
  const warnings = candidateWarnings(supportingSignals);

  return [{
    candidateKey: stableKey(type, signal.normalizedValue),
    topicId: request.topicId,
    candidateType: type,
    primaryLabel: signal.label,
    normalizedConcept: signal.normalizedValue,
    supportingLabels: supportingSignals
      .filter((item) => item.normalizedValue !== signal.normalizedValue)
      .map((item) => item.label),
    signals: supportingSignals,
    confidence,
    language: request.language,
    geo: request.geo,
    evidenceSummary: `${supportingSignals.length} supporting signal(s) for ${signal.label}`,
    warnings,
    status: confidenceRank(confidence) >= confidenceRank('medium')
      ? 'candidate'
      : 'needs_validation',
  }];
}

function candidateType(
  signal: ExpansionSignal,
  allSignals: ExpansionSignal[],
): ExpansionCandidateType | null {
  if (signal.signalType === 'demand_candidate') {
    return 'supporting_page';
  }
  if (signal.signalType === 'serp_faq') {
    return 'faq_page';
  }
  if (
    signal.signalType === 'knowledge_entity' ||
    signal.signalType === 'serp_entity'
  ) {
    return hasGeoEvidence(signal, allSignals) ? 'geo_page' : 'entity_page';
  }
  if (signal.signalType === 'intent_opportunity') {
    return looksLikeComparison(signal.normalizedValue)
      ? 'comparison_page'
      : 'supporting_page';
  }
  if (signal.signalType === 'serp_missing_opportunity') {
    return 'supporting_page';
  }
  if (signal.signalType === 'serp_heading' && looksLikeComparison(signal.normalizedValue)) {
    return 'comparison_page';
  }
  return null;
}

function relatedSignals(
  signal: ExpansionSignal,
  allSignals: ExpansionSignal[],
): ExpansionSignal[] {
  return allSignals.filter((candidate) =>
    candidate.normalizedValue === signal.normalizedValue ||
    candidate.normalizedValue.includes(signal.normalizedValue) ||
    signal.normalizedValue.includes(candidate.normalizedValue),
  );
}

function candidateConfidence(signals: ExpansionSignal[]): ExpansionConfidence {
  const sourceDiversity = Math.max(
    ...signals.map((signal) => signal.sourceDiversity ?? 0),
    0,
  );
  if (signals.length >= 2 && sourceDiversity >= 2) {
    return 'high';
  }
  if (signals.length >= 2 || sourceDiversity >= 2) {
    return 'medium';
  }
  return highestConfidence(signals.map((signal) => signal.confidence));
}

function candidateWarnings(signals: ExpansionSignal[]): string[] {
  if (candidateConfidence(signals) !== 'low') {
    return [];
  }
  return ['Candidate has limited supporting evidence and needs validation'];
}

function looksLikeComparison(value: string): boolean {
  return /\b(vs|versus|compare|comparison|alternative)\b/u.test(value);
}

function hasGeoEvidence(
  signal: ExpansionSignal,
  allSignals: ExpansionSignal[],
): boolean {
  return allSignals.some((candidate) =>
    candidate.signalType === 'geo_hint' &&
    (signal.normalizedValue.includes(candidate.normalizedValue) ||
      candidate.normalizedValue.includes(signal.normalizedValue)),
  );
}
