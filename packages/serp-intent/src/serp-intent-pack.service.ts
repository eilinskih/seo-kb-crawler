import {
  SerpIntent,
  SerpIntentAnalyzerConfig,
  SerpIntentPack,
  SerpIntentPackRequest,
} from './domain/serp-intent-types';
import { IntentCandidateService } from './intent-candidate.service';
import { IntentDepthService } from './intent-depth.service';
import { IntentGapService } from './intent-gap.service';
import {
  DEFAULT_SERP_INTENT_CONFIG,
  DEFAULT_SERP_INTENT_RULE_VERSION,
} from './serp-intent-defaults';

export class SerpIntentPackService {
  constructor(
    private readonly candidateService = new IntentCandidateService(),
    private readonly depthService = new IntentDepthService(),
    private readonly gapService = new IntentGapService(),
  ) {}

  build(request: SerpIntentPackRequest): SerpIntentPack {
    const config = mergeConfig(request.config);
    const candidates = this.candidateService.extract(request.serpPack);
    const intents = candidates.map((candidate): SerpIntent => {
      const depth = this.depthService.classify(candidate);
      const decision = this.gapService.classify(candidate, depth, {
        config,
        degraded: request.serpPack.degraded,
      });
      return {
        intentKey: candidate.intentKey,
        label: candidate.label,
        intentClass: decision.intentClass,
        frequency: candidate.frequency,
        sourceDiversity: candidate.sourceDiversity,
        depth,
        gap: decision.gap,
        confidence: candidate.confidence,
        supportingResults: candidate.supportingResults,
        sourceKinds: candidate.sourceKinds,
        evidenceTypes: candidate.evidenceTypes,
      };
    });

    return {
      normalizedQuery: request.serpPack.normalizedQuery,
      topicId: request.serpPack.topicId,
      language: request.serpPack.language,
      geo: request.serpPack.geo,
      sourceSnapshotIds: request.serpPack.snapshotIds,
      mustCover: intents.filter((intent) => intent.gap === 'must_cover'),
      recommended: intents.filter((intent) => intent.gap === 'recommended'),
      opportunity: intents.filter((intent) => intent.gap === 'opportunity'),
      monitor: intents.filter((intent) => intent.gap === 'monitor'),
      degraded: request.serpPack.degraded,
      warnings: [
        ...request.serpPack.warnings,
        ...(candidates.length === 0
          ? ['SERP Intent Pack built without intent candidates']
          : []),
      ],
      ruleVersion: request.ruleVersion ?? DEFAULT_SERP_INTENT_RULE_VERSION,
    };
  }
}

function mergeConfig(
  config?: Partial<SerpIntentAnalyzerConfig>,
): SerpIntentAnalyzerConfig {
  return {
    ...DEFAULT_SERP_INTENT_CONFIG,
    ...config,
  };
}
