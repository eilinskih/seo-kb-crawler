import { SerpPack } from '@seo-kb/serp-intelligence';
import { SerpIntentPackService } from './serp-intent-pack.service';

describe('SerpIntentPackService', () => {
  it('classifies must-cover and opportunity intents from SERP Pack evidence', () => {
    const pack = new SerpIntentPackService().build({
      serpPack: fixtureSerpPack(),
    });

    expect(pack.mustCover).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          intentKey: 'laser hair removal cost',
          gap: 'must_cover',
          intentClass: 'core',
          depth: 'moderate',
          confidence: 'medium',
        }),
      ]),
    );
    expect(pack.opportunity).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          intentKey: 'laser hair removal for blonde hair',
          gap: 'opportunity',
          intentClass: 'opportunity',
        }),
      ]),
    );
    expect(pack.mustCover).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          intentKey: 'diode laser',
        }),
      ]),
    );
  });

  it('downgrades mandatory-looking intents when SERP evidence is degraded', () => {
    const pack = new SerpIntentPackService().build({
      serpPack: {
        ...fixtureSerpPack(),
        degraded: true,
        warnings: ['SERP Pack built from fallback-only result URLs'],
      },
    });

    expect(pack.mustCover).toEqual([]);
    expect(pack.recommended).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          intentKey: 'laser hair removal cost',
          gap: 'recommended',
          intentClass: 'recommended',
        }),
      ]),
    );
    expect(pack.warnings).toEqual([
      'SERP Pack built from fallback-only result URLs',
    ]);
  });
});

function fixtureSerpPack(): SerpPack {
  const resultOne = {
    resultId: 'result-1',
    position: 1,
    url: 'https://example.test/laser-cost',
    domain: 'example.test',
    title: 'Laser Hair Removal Cost',
  };
  const resultTwo = {
    resultId: 'result-2',
    position: 2,
    url: 'https://clinic.test/laser-prices',
    domain: 'clinic.test',
    title: 'Laser Hair Removal Prices',
  };

  return {
    normalizedQuery: 'laser hair removal warsaw',
    topicId: 'topic-1',
    language: 'en',
    geo: { countryCode: 'PL', city: 'Warsaw' },
    snapshotIds: ['snapshot-1'],
    recurringHeadings: [],
    recurringFaqs: [],
    recurringEntities: [],
    dominantContentAngle: 'commercial',
    secondaryContentAngles: [],
    depthSummary: {
      wordCount: { min: 900, median: 1200, max: 1500 },
      sectionCount: { min: 3, median: 5, max: 8 },
      faqCount: { min: 1, median: 2, max: 3 },
      tableUsageRatio: 0.5,
      listUsageRatio: 1,
      comparisonUsageRatio: 0.25,
      sampleSize: 2,
    },
    expectations: [
      {
        kind: 'section',
        label: 'laser hair removal cost',
        frequency: 2,
        sourceDiversity: 2,
        supportingResults: [resultOne, resultTwo],
      },
      {
        kind: 'faq',
        label: 'does laser hair removal hurt?',
        frequency: 2,
        sourceDiversity: 2,
        supportingResults: [resultOne, resultTwo],
      },
      {
        kind: 'entity',
        label: 'Diode laser',
        frequency: 3,
        sourceDiversity: 3,
        supportingResults: [resultOne, resultTwo],
      },
    ],
    missingOpportunities: [
      {
        kind: 'section',
        label: 'laser hair removal for blonde hair',
        frequency: 1,
        sourceDiversity: 1,
        supportingResults: [resultOne],
      },
    ],
    degraded: false,
    warnings: [],
    ruleVersion: 'serp-intelligence-foundation-v1',
  };
}
