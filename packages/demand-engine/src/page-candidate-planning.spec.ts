import { planCandidatePages } from './page-candidate-planning';
import { CandidatePage } from './domain/demand-engine-types';

describe('page candidate planning', () => {
  it('separates technical readiness from editorial create recommendations', () => {
    const plan = planCandidatePages([
      candidatePage('depilacja laserowa jasło', {
        primaryIntent: 'local_commercial',
        proposedPageType: 'local_page',
        evidenceUrls: ['https://example.com/local'],
      }),
      candidatePage('depilacja laserowa przeciwwskazania dla mężczyzn ciąża', {
        primaryIntent: 'safety_audience',
        evidenceUrls: ['https://example.com/bad-combo'],
      }),
      candidatePage('depilacja laserowa cena salon dla kobiet', {
        primaryIntent: 'price_commercial_audience',
        evidenceUrls: ['https://example.com/mechanical'],
      }),
    ]);

    expect(plan.summary).toEqual(expect.objectContaining({
      createCount: 1,
      mergeCount: 1,
      rejectCount: 1,
    }));
    expect(plan.candidates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        primaryKeyword: 'depilacja laserowa jasło',
        planning: expect.objectContaining({
          role: 'money_page',
          recommendation: 'create',
          parentClusterKey: 'core-service',
        }),
      }),
      expect.objectContaining({
        primaryKeyword: 'depilacja laserowa przeciwwskazania dla mężczyzn ciąża',
        planning: expect.objectContaining({
          role: 'reject',
          recommendation: 'reject',
          parentClusterKey: 'men',
        }),
      }),
      expect.objectContaining({
        primaryKeyword: 'depilacja laserowa cena salon dla kobiet',
        planning: expect.objectContaining({
          role: 'merge_candidate',
          recommendation: 'merge',
          parentClusterKey: 'pricing',
        }),
      }),
    ]));
  });

  it('keeps one canonical money page per parent cluster', () => {
    const plan = planCandidatePages([
      candidatePage('depilacja laserowa jasło cena', {
        primaryIntent: 'price',
        evidenceUrls: ['https://example.com/price'],
      }),
      candidatePage('depilacja laserowa jasło cena salon', {
        primaryIntent: 'price_commercial',
        evidenceUrls: ['https://example.com/price-salon'],
      }),
      candidatePage('depilacja laserowa jasło cena dla skóry wrażliwej', {
        primaryIntent: 'price_audience',
        evidenceUrls: ['https://example.com/price-skin'],
      }),
    ]);

    expect(plan.summary).toEqual(expect.objectContaining({
      createCount: 1,
      mergeCount: 2,
      moneyPageCount: 1,
    }));
    expect(plan.candidates.find((page) =>
      page.planning.recommendation === 'create',
    )).toEqual(expect.objectContaining({
      primaryKeyword: 'depilacja laserowa jasło cena',
    }));
  });
});

function candidatePage(
  primaryKeyword: string,
  overrides: Partial<CandidatePage> = {},
): CandidatePage {
  return {
    slug: `/${primaryKeyword.replace(/\s+/gu, '-')}/`,
    primaryKeyword,
    supportingKeywords: [],
    proposedPageType: 'landing_page',
    confidence: 'low',
    readiness: 'ready',
    primaryIntent: 'commercial_service',
    clusterKey: 'commercial_service',
    clusterLabel: 'Commercial service',
    evidenceTypes: ['autocomplete', 'serp_snippet'],
    evidenceUrls: [],
    metrics: {
      searchVolume: null,
      keywordDifficulty: null,
      cpc: null,
      trafficPotential: null,
      trend: null,
      seasonality: null,
      metricStatus: 'fallback_only',
      providerKey: 'topic_universe',
      collectedAt: null,
    },
    missingMetrics: ['searchVolume', 'keywordDifficulty', 'cpc'],
    missingResearchGaps: ['Provider-backed demand metrics'],
    pageAction: 'new',
    ...overrides,
  };
}
