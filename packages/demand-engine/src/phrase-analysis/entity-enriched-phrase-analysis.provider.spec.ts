import {
  EntityEnrichedPhraseAnalysisProvider,
  PhraseEntityEnrichmentService,
} from './entity-enriched-phrase-analysis.provider';

describe('EntityEnrichedPhraseAnalysisProvider', () => {
  it('keeps external entity lookups bounded for each phrase', async () => {
    const entityEnrichment = countingEntityEnrichment();
    const provider = new EntityEnrichedPhraseAnalysisProvider(entityEnrichment, {
      maxLookups: 2,
    });

    await provider.analyze({
      phrase: 'szafka garażowa z szufladami metalowa czarna',
      topicSeed: 'szafka garażowa',
      language: 'pl',
      evidenceTypes: ['competitor_heading'],
    });

    expect(entityEnrichment.enrich).toHaveBeenCalledTimes(2);
  });
});

function countingEntityEnrichment(): PhraseEntityEnrichmentService {
  return {
    enrich: jest.fn(async (request) => ({
      request,
      generatedAt: '2026-08-21T00:00:00.000Z',
      degraded: true,
      providerStatuses: [],
      warnings: [],
      candidates: [],
      externalIds: [],
    })),
  };
}
