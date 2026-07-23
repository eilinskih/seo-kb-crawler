import {
  SeoPackPageBrief,
  SeoPackRequest,
  SeoPackScoredCandidateInput,
} from './domain/seo-pack-types';

export class PageBriefService {
  build(
    request: SeoPackRequest,
    selectedCandidate: SeoPackScoredCandidateInput | null,
  ): SeoPackPageBrief {
    const intents = request.serpIntentPack?.intents ?? [];
    const primaryIntent =
      intents.find((intent) => intent.priority === 'mandatory') ??
      intents.find((intent) => intent.priority === 'recommended') ??
      intents[0] ??
      null;

    return {
      titleConcept:
        selectedCandidate?.label ??
        request.demandPack?.candidateLabel ??
        request.demandPack?.primaryKeyword ??
        request.candidateKey,
      targetAudience: request.profile === 'local_page' ? 'Local searchers' : null,
      primaryIntent: primaryIntent?.label ?? null,
      secondaryIntents: intents
        .filter((intent) => intent.intentId !== primaryIntent?.intentId)
        .map((intent) => intent.label),
      candidateRationale: selectedCandidate?.rationale ?? [],
      demandSummary: request.demandPack?.demandSummary ?? null,
      serpSummary: request.serpPack?.summary ?? null,
      knowledgeSummary: request.knowledgePack?.summary ?? null,
      evidenceGaps: request.knowledgePack?.evidenceGaps ?? [],
      nonGoals: [],
    };
  }
}
