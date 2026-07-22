import { Injectable } from '@nestjs/common';
import {
  EntityScoreInput,
  EntityTrustScore,
} from './domain/source-trust-types';

@Injectable()
export class EntityScoringService {
  score(input: EntityScoreInput): EntityTrustScore {
    const aliasConfidence = average(input.aliasConfidences);
    const sourceDiversityScore = clamp(
      Math.min(1, input.supportingDocumentCount * 0.12) +
        Math.min(1, input.supportingDomainCount * 0.18),
    );
    const mentionSupport = clamp(Math.min(1, input.mentionCount * 0.05));
    const finalConfidence = clamp(
      input.entityConfidence * 0.35 +
        (aliasConfidence ?? input.entityConfidence) * 0.2 +
        mentionSupport * 0.15 +
        sourceDiversityScore * 0.15 +
        (input.averageSourceTrust ?? 0.45) * 0.15,
    );

    return {
      entityId: input.entityId,
      entityConfidence: clamp(input.entityConfidence),
      aliasConfidence,
      mentionCount: input.mentionCount,
      sourceDiversityScore,
      averageSourceTrust: input.averageSourceTrust,
      finalConfidence,
      components: {
        entityConfidence: clamp(input.entityConfidence),
        aliasConfidence,
        mentionSupport,
        sourceDiversity: sourceDiversityScore,
        averageSourceTrust: input.averageSourceTrust,
      },
    };
  }
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
