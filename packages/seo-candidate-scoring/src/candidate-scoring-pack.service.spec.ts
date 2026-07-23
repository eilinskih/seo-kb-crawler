import { CandidateScoringPackService } from './candidate-scoring-pack.service';

describe('CandidateScoringPackService', () => {
  it('ranks candidates with explainable scores and non-blocking research hints', () => {
    const pack = new CandidateScoringPackService().build({
      topicId: 'topic-1',
      profile: 'default',
      candidates: [
        {
          candidateKey: 'candidate:laser-hair-removal-warsaw',
          topicId: 'topic-1',
          label: 'Laser hair removal Warsaw',
          normalizedConcept: 'laser hair removal warsaw',
          pageTypeHint: 'local_page',
          sourcePackReferences: ['long-tail-pack-1'],
          rawSignals: [
            {
              signalType: 'demand_strength',
              rawValue: 80,
              confidence: 'high',
              rationale: 'Demand candidate has repeated supporting evidence.',
              supportingIds: ['demand-1', 'demand-2'],
            },
            {
              signalType: 'serp_weakness',
              rawValue: 70,
              confidence: 'medium',
              rationale: 'Competitor SERP coverage is shallow.',
              supportingIds: ['serp-1', 'serp-2'],
            },
            {
              signalType: 'knowledge_strength',
              rawValue: 75,
              confidence: 'high',
              rationale: 'Knowledge Pack has strong local evidence.',
              supportingIds: ['knowledge-1', 'knowledge-2'],
            },
            {
              signalType: 'provider_metric',
              rawValue: null,
              confidence: 'unknown',
              rationale: 'Provider metrics are unavailable.',
              missingDataWarning: 'Provider metrics are unavailable.',
            },
          ],
        },
        {
          candidateKey: 'candidate:weak',
          topicId: 'topic-1',
          label: 'Weak candidate',
          normalizedConcept: 'weak candidate',
          rawSignals: [
            {
              signalType: 'demand_strength',
              rawValue: 20,
              confidence: 'low',
              rationale: 'Weak demand evidence.',
              supportingIds: ['demand-3'],
            },
          ],
        },
      ],
    });

    expect(pack.scoredCandidates[0]).toMatchObject({
      candidateKey: 'candidate:laser-hair-removal-warsaw',
      recommendedPageType: 'local_page',
      scoreBand: 'medium',
      degraded: true,
      warnings: expect.arrayContaining([
        'Provider metrics are unavailable.',
        'Candidate score is degraded by missing or weak evidence',
      ]),
    });
    expect(pack.scoredCandidates[0].focusedResearchHints).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'missing_provider_metrics',
          blocking: false,
        }),
      ]),
    );
    expect(pack.scoredCandidates[0].rationale).toEqual(
      expect.arrayContaining([
        'Demand candidate has repeated supporting evidence.',
        'Knowledge Pack has strong local evidence.',
      ]),
    );
    expect(pack.scoredCandidates[0].opportunityScore).toBeGreaterThan(
      pack.scoredCandidates[1].opportunityScore,
    );
  });

  it('continues in degraded mode without candidates', () => {
    const pack = new CandidateScoringPackService().build({
      topicId: 'topic-1',
      candidates: [],
    });

    expect(pack.degraded).toBe(true);
    expect(pack.scoredCandidates).toEqual([]);
    expect(pack.warnings).toEqual([
      'Candidate Scoring Pack built without candidates',
    ]);
  });
});
