import { LongTailDiscoveryPackService } from './long-tail-discovery-pack.service';

describe('LongTailDiscoveryPackService', () => {
  it('generates bounded candidates only when dimensions have combination evidence', () => {
    const service = new LongTailDiscoveryPackService();

    const pack = service.build({
      topicId: 'topic-1',
      topicLabel: 'Laser Hair Removal Poland',
      language: 'en',
      geo: { countryCode: 'PL' },
      dimensionInputs: [
        {
          dimensionType: 'city',
          label: 'Warsaw',
          confidence: 'high',
          sourceDiversity: 2,
          supportingIds: ['serp-1'],
          compatibleWith: ['procedure:laser-hair-removal'],
        },
        {
          dimensionType: 'procedure',
          label: 'Laser hair removal',
          confidence: 'high',
          sourceDiversity: 3,
          supportingIds: ['serp-1'],
          compatibleWith: [
            'city:warsaw',
            'body_part:bikini',
            'faq:does-laser-hair-removal-hurt?',
          ],
        },
        {
          dimensionType: 'body_part',
          label: 'Bikini',
          confidence: 'medium',
          sourceDiversity: 2,
          supportingIds: ['serp-2'],
          compatibleWith: ['procedure:laser-hair-removal'],
        },
        {
          dimensionType: 'faq',
          label: 'Does laser hair removal hurt?',
          confidence: 'medium',
          sourceDiversity: 2,
          supportingIds: ['faq-1'],
          compatibleWith: ['procedure:laser-hair-removal'],
        },
        {
          dimensionType: 'technology',
          label: 'Diode laser',
          confidence: 'high',
          sourceDiversity: 2,
          supportingIds: ['serp-3'],
        },
      ],
    });

    expect(pack.degraded).toBe(false);
    expect(pack.candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          normalizedConcept: 'warsaw laser hair removal',
          candidatePageTypeHint: 'local_page',
          missingMetrics: ['searchVolume', 'keywordDifficulty', 'cpc', 'trafficPotential'],
        }),
        expect.objectContaining({
          normalizedConcept: 'laser hair removal does laser hair removal hurt?',
          candidatePageTypeHint: 'faq_page',
        }),
      ]),
    );
    expect(pack.candidates).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          normalizedConcept: 'diode laser bikini',
        }),
      ]),
    );
    expect(pack.opportunityTrees.length).toBeGreaterThan(0);
  });

  it('continues in degraded mode and avoids high-confidence candidates', () => {
    const service = new LongTailDiscoveryPackService();

    const pack = service.build({
      topicId: 'topic-1',
      topicLabel: 'Laser Hair Removal Poland',
      degraded: true,
      dimensionInputs: [
        {
          dimensionType: 'city',
          label: 'Warsaw',
          confidence: 'high',
          supportingIds: ['serp-1'],
          compatibleWith: ['procedure:laser-hair-removal'],
        },
        {
          dimensionType: 'procedure',
          label: 'Laser hair removal',
          confidence: 'high',
          supportingIds: ['serp-1'],
          compatibleWith: ['city:warsaw'],
        },
      ],
    });

    expect(pack.degraded).toBe(true);
    expect(pack.candidates[0]).toMatchObject({
      confidence: 'medium',
      warnings: expect.arrayContaining([
        'Degraded run lowered long-tail candidate confidence',
      ]),
    });
  });
});
