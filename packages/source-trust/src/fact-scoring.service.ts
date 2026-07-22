import { Injectable } from '@nestjs/common';
import {
  FactScoreInput,
  FactTrustScore,
} from './domain/source-trust-types';

@Injectable()
export class FactScoringService {
  score(input: FactScoreInput): FactTrustScore {
    const normalizationConfidence =
      input.normalizationConfidence ?? input.extractionConfidence;
    const sourceTrustScore = input.sourceTrustScore ?? 0.45;
    const finalConfidence = clamp(
      input.extractionConfidence * 0.3 +
        normalizationConfidence * 0.25 +
        input.evidenceStrength.score * 0.3 +
        sourceTrustScore * 0.15,
    );

    return {
      factId: input.factId,
      extractionConfidence: clamp(input.extractionConfidence),
      normalizationConfidence: input.normalizationConfidence ?? null,
      evidenceStrengthScore: input.evidenceStrength.score,
      sourceTrustScore: input.sourceTrustScore,
      finalConfidence,
      uncertaintyFlags: unique([
        ...input.evidenceStrength.uncertaintyFlags,
        ...(input.uncertaintyFlags ?? []),
      ]),
      components: {
        extractionConfidence: clamp(input.extractionConfidence),
        normalizationConfidence: input.normalizationConfidence ?? null,
        evidenceStrength: input.evidenceStrength.score,
        sourceTrust: input.sourceTrustScore,
      },
    };
  }
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, Number(value.toFixed(4))));
}
