import { ExpansionPackService } from './expansion-pack.service';

describe('ExpansionPackService', () => {
  it('builds traceable candidates and clusters from explicit upstream signals', () => {
    const pack = new ExpansionPackService().build({
      topicId: 'topic-1',
      topicLabel: 'Laser Hair Removal Poland',
      language: 'en',
      geo: { countryCode: 'PL' },
      sourcePackReferences: ['serp-pack-1', 'serp-intent-pack-1'],
      inputSignals: [
        {
          signalType: 'intent_opportunity',
          label: 'Laser hair removal for blonde hair',
          confidence: 'medium',
          sourceDiversity: 2,
          supportingIds: ['intent-1'],
        },
        {
          signalType: 'serp_faq',
          label: 'Does laser hair removal hurt?',
          confidence: 'medium',
          sourceDiversity: 2,
          supportingIds: ['faq-1'],
        },
        {
          signalType: 'knowledge_entity',
          label: 'Diode laser',
          confidence: 'high',
          sourceDiversity: 3,
          supportingIds: ['entity-1'],
        },
        {
          signalType: 'geo_hint',
          label: 'Diode laser Warsaw',
          confidence: 'medium',
          sourceDiversity: 2,
          supportingIds: ['geo-1'],
        },
        {
          signalType: 'serp_heading',
          label: 'Diode laser vs IPL',
          confidence: 'medium',
          sourceDiversity: 2,
          supportingIds: ['heading-1'],
        },
      ],
    });

    expect(pack.degraded).toBe(false);
    expect(pack.candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          candidateType: 'supporting_page',
          normalizedConcept: 'laser hair removal for blonde hair',
          status: 'candidate',
        }),
        expect.objectContaining({
          candidateType: 'faq_page',
          normalizedConcept: 'does laser hair removal hurt?',
        }),
        expect.objectContaining({
          candidateType: 'geo_page',
          normalizedConcept: 'diode laser',
        }),
        expect.objectContaining({
          candidateType: 'comparison_page',
          normalizedConcept: 'diode laser vs ipl',
        }),
      ]),
    );
    expect(pack.clusters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ parentLabel: 'Supporting' }),
        expect.objectContaining({ parentLabel: 'FAQ' }),
        expect.objectContaining({ parentLabel: 'Geo' }),
        expect.objectContaining({ parentLabel: 'Comparison' }),
      ]),
    );
  });

  it('continues in degraded mode without input signals', () => {
    const pack = new ExpansionPackService().build({
      topicId: 'topic-1',
      topicLabel: 'Laser Hair Removal Poland',
      inputSignals: [],
    });

    expect(pack.degraded).toBe(true);
    expect(pack.candidates).toEqual([]);
    expect(pack.warnings).toEqual([
      'Expansion Pack built without input signals',
    ]);
  });
});
