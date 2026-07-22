import { EntityScoringService } from './entity-scoring.service';
import { EvidenceAggregationService } from './evidence-aggregation.service';
import { FactScoringService } from './fact-scoring.service';
import { SourceClassifier } from './source-classifier.service';
import { SourceTrustService } from './source-trust.service';

describe('Source Trust foundation services', () => {
  it('classifies source type deterministically from source signals', () => {
    const classifier = new SourceClassifier();

    expect(classifier.classify({
      sourceUrl: 'https://example.gov/procedure',
    })).toMatchObject({
      sourceType: 'government',
      confidence: 0.95,
      matchedRules: ['government_domain'],
    });
  });

  it('keeps source trust separate from metadata and processing penalties', () => {
    const service = new SourceTrustService(new SourceClassifier());

    const score = service.score({
      sourceUrl: 'https://reviews.example/best-laser-clinics',
      sourceDomain: 'reviews.example',
      metadataComplete: false,
      warnings: ['missing language'],
    });

    expect(score.sourceType).toBe('affiliate');
    expect(score.components.adjustments.map((adjustment) => adjustment.key))
      .toEqual([
        'metadata_incomplete',
        'processing_warnings',
        'affiliate_source_penalty',
      ]);
    expect(score.score).toBeLessThan(score.components.baseScore);
  });

  it('aggregates evidence strength from chunks documents domains and trust', () => {
    const service = new EvidenceAggregationService();

    const score = service.aggregate({
      itemId: 'fact-1',
      itemType: 'fact',
      chunkIds: ['chunk-1', 'chunk-2', 'chunk-2'],
      documentIds: ['doc-1', 'doc-2'],
      sourceDomains: ['a.test', 'b.test', 'b.test'],
      sourceTrustScores: [0.8, 0.6],
    });

    expect(score.supportingChunkCount).toBe(2);
    expect(score.supportingDocumentCount).toBe(2);
    expect(score.supportingDomainCount).toBe(2);
    expect(score.averageSourceTrust).toBe(0.7);
    expect(score.score).toBeGreaterThan(0.6);
  });

  it('preserves unresolved conflict as uncertainty instead of resolving it', () => {
    const service = new EvidenceAggregationService();

    const score = service.aggregate({
      itemId: 'fact-1',
      itemType: 'fact',
      chunkIds: ['chunk-1'],
      documentIds: ['doc-1'],
      sourceDomains: ['a.test'],
      sourceTrustScores: [0.7],
      possibleConflict: true,
    });

    expect(score.uncertaintyFlags).toEqual(['possible_conflict_unresolved']);
    expect(score.components.adjustments).toContainEqual(expect.objectContaining({
      key: 'possible_conflict_unresolved',
    }));
  });

  it('calculates fact confidence while exposing component signals', () => {
    const evidence = new EvidenceAggregationService().aggregate({
      itemId: 'fact-1',
      itemType: 'fact',
      chunkIds: ['chunk-1', 'chunk-2'],
      documentIds: ['doc-1', 'doc-2'],
      sourceDomains: ['a.test', 'b.test'],
      sourceTrustScores: [0.8, 0.7],
    });

    const score = new FactScoringService().score({
      factId: 'fact-1',
      extractionConfidence: 0.74,
      normalizationConfidence: 0.9,
      evidenceStrength: evidence,
      sourceTrustScore: 0.75,
    });

    expect(score.components).toEqual({
      extractionConfidence: 0.74,
      normalizationConfidence: 0.9,
      evidenceStrength: evidence.score,
      sourceTrust: 0.75,
    });
    expect(score.finalConfidence).toBeGreaterThan(0.7);
  });

  it('calculates entity confidence from aliases mentions and source diversity', () => {
    const score = new EntityScoringService().score({
      entityId: 'entity-1',
      entityConfidence: 0.82,
      aliasConfidences: [0.8, 0.7],
      mentionCount: 6,
      supportingDocumentCount: 3,
      supportingDomainCount: 2,
      averageSourceTrust: 0.72,
    });

    expect(score.aliasConfidence).toBe(0.75);
    expect(score.sourceDiversityScore).toBe(0.72);
    expect(score.finalConfidence).toBeGreaterThan(0.6);
  });
});
