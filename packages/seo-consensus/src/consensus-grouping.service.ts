import { Injectable } from '@nestjs/common';
import { ComparableValueService } from './comparable-value.service';
import {
  ConsensusAlternative,
  ConsensusConfidenceLevel,
  ConsensusGroup,
  FactForConsensus,
} from './domain/seo-consensus-types';

@Injectable()
export class ConsensusGroupingService {
  constructor(private readonly comparableValues: ComparableValueService) {}

  group(facts: FactForConsensus[]): ConsensusGroup[] {
    const groups = new Map<string, FactForConsensus[]>();
    for (const fact of facts) {
      const value = this.comparableValues.fromAttributes(fact.normalizedAttributes);
      const key = [
        fact.subjectEntityId,
        fact.predicateId,
        value.comparableKey,
      ].join(':');
      groups.set(key, [...(groups.get(key) ?? []), fact]);
    }

    return [...groups.entries()]
      .map(([groupKey, groupFacts]) => this.toGroup(groupKey, groupFacts))
      .sort((a, b) => a.groupKey.localeCompare(b.groupKey));
  }

  private toGroup(groupKey: string, facts: FactForConsensus[]): ConsensusGroup {
    const firstFact = facts[0];
    const firstValue = this.comparableValues.fromAttributes(
      firstFact.normalizedAttributes,
    );
    const alternatives = this.toAlternatives(facts);
    const strongestAlternative = alternatives[0] ?? null;
    const supportingChunkCount = unique(
      facts.flatMap((fact) => fact.supportingChunkIds),
    ).length;
    const supportingDomainCount = unique(
      facts.flatMap((fact) =>
        fact.sourceDomains.filter((domain): domain is string => Boolean(domain)),
      ),
    ).length;

    return {
      groupKey,
      subjectEntityId: firstFact.subjectEntityId,
      predicateId: firstFact.predicateId,
      comparableKey: firstValue.comparableKey,
      alternatives,
      strongestAlternative,
      factCount: facts.length,
      supportingChunkCount,
      supportingDomainCount,
      confidenceLevel: confidenceLevel(
        facts.length,
        supportingDomainCount,
        strongestAlternative?.supportScore ?? 0,
      ),
    };
  }

  private toAlternatives(facts: FactForConsensus[]): ConsensusAlternative[] {
    const alternatives = new Map<string, FactForConsensus[]>();
    for (const fact of facts) {
      const value = this.comparableValues.fromAttributes(fact.normalizedAttributes);
      alternatives.set(value.fingerprint, [
        ...(alternatives.get(value.fingerprint) ?? []),
        fact,
      ]);
    }

    return [...alternatives.values()]
      .map((alternativeFacts) => {
        const value = this.comparableValues.fromAttributes(
          alternativeFacts[0].normalizedAttributes,
        );
        const supportingDomainCount = unique(
          alternativeFacts.flatMap((fact) =>
            fact.sourceDomains.filter((domain): domain is string => Boolean(domain)),
          ),
        ).length;
        const averageSourceTrust = average(
          alternativeFacts
            .map((fact) => fact.sourceTrustScore)
            .filter((score): score is number => typeof score === 'number'),
        );
        const averageEvidenceStrength = average(
          alternativeFacts
            .map((fact) => fact.evidenceStrengthScore)
            .filter((score): score is number => typeof score === 'number'),
        );

        return {
          value,
          factIds: alternativeFacts.map((fact) => fact.factId).sort(),
          supportingChunkCount: unique(
            alternativeFacts.flatMap((fact) => fact.supportingChunkIds),
          ).length,
          supportingDomainCount,
          averageSourceTrust,
          averageEvidenceStrength,
          supportScore: supportScore(
            alternativeFacts.length,
            supportingDomainCount,
            averageSourceTrust,
            averageEvidenceStrength,
          ),
        };
      })
      .sort((a, b) =>
        b.supportScore - a.supportScore ||
        a.value.fingerprint.localeCompare(b.value.fingerprint),
      );
  }
}

function supportScore(
  factCount: number,
  domainCount: number,
  sourceTrust: number | null,
  evidenceStrength: number | null,
): number {
  return clamp(
    Math.min(0.35, factCount * 0.1) +
      Math.min(0.25, domainCount * 0.1) +
      (sourceTrust ?? 0.45) * 0.2 +
      (evidenceStrength ?? 0.45) * 0.2,
  );
}

function confidenceLevel(
  factCount: number,
  domainCount: number,
  support: number,
): ConsensusConfidenceLevel {
  if (factCount === 0) {
    return 'unknown';
  }
  if (factCount >= 3 && domainCount >= 2 && support >= 0.65) {
    return 'strong';
  }
  if (factCount >= 2 && support >= 0.5) {
    return 'moderate';
  }
  return 'weak';
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
