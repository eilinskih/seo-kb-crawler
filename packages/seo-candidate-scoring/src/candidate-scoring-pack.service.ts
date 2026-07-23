import {
  CandidateScoringPack,
  CandidateScoringRequest,
  ScoredCandidate,
} from './domain/seo-candidate-scoring-types';
import { CandidatePageTypeService } from './candidate-page-type.service';
import { CandidateSignalService } from './candidate-signal.service';
import { FocusedResearchHintService } from './focused-research-hint.service';
import { OpportunityScoreService } from './opportunity-score.service';
import {
  DEFAULT_SEO_CANDIDATE_SCORING_RULE_VERSION,
  SCORING_PROFILES,
} from './seo-candidate-scoring-defaults';

export class CandidateScoringPackService {
  constructor(
    private readonly signalService = new CandidateSignalService(),
    private readonly scoreService = new OpportunityScoreService(),
    private readonly hintService = new FocusedResearchHintService(),
    private readonly pageTypeService = new CandidatePageTypeService(),
  ) {}

  build(request: CandidateScoringRequest): CandidateScoringPack {
    const profile = SCORING_PROFILES[request.profile ?? 'default'];
    const ruleVersion =
      request.ruleVersion ?? DEFAULT_SEO_CANDIDATE_SCORING_RULE_VERSION;
    const scoredCandidates = request.candidates
      .map((candidate): ScoredCandidate => {
        const contributions = this.signalService.normalize(candidate, profile);
        const score = this.scoreService.score(
          contributions,
          profile,
          Boolean(request.degraded),
        );
        const focusedResearchHints = this.hintService.generate(contributions);
        const warnings = [
          ...contributions
            .map((contribution) => contribution.missingDataWarning)
            .filter((warning): warning is string => Boolean(warning)),
          ...(score.degraded ? ['Candidate score is degraded by missing or weak evidence'] : []),
        ];

        return {
          candidateKey: candidate.candidateKey,
          topicId: candidate.topicId,
          label: candidate.label,
          normalizedConcept: candidate.normalizedConcept,
          sourceCandidateType: candidate.sourceCandidateType,
          recommendedPageType: this.pageTypeService.recommend(
            candidate,
            contributions,
          ),
          opportunityScore: score.opportunityScore,
          scoreBand: score.scoreBand,
          confidence: score.confidence,
          signalContributions: contributions,
          rationale: contributions
            .filter((contribution) => contribution.weightedScore > 0)
            .sort((a, b) => b.weightedScore - a.weightedScore)
            .slice(0, 5)
            .map((contribution) => contribution.rationale),
          focusedResearchHints,
          warnings,
          degraded: score.degraded,
          sourcePackReferences: candidate.sourcePackReferences ?? [],
          ruleVersion,
        };
      })
      .sort(
        (a, b) =>
          b.opportunityScore - a.opportunityScore ||
          a.candidateKey.localeCompare(b.candidateKey),
      );

    return {
      topicId: request.topicId,
      profile: profile.name,
      language: request.language,
      geo: request.geo,
      scoredCandidates,
      warnings: [
        ...(request.warnings ?? []),
        ...(request.candidates.length === 0
          ? ['Candidate Scoring Pack built without candidates']
          : []),
      ],
      degraded:
        Boolean(request.degraded) ||
        request.candidates.length === 0 ||
        scoredCandidates.some((candidate) => candidate.degraded),
      ruleVersion,
    };
  }
}
