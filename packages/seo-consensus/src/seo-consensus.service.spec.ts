import { ComparableValueService } from './comparable-value.service';
import { ConflictDetectionService } from './conflict-detection.service';
import { ConsensusGroupingService } from './consensus-grouping.service';
import { ContentGapHintService } from './content-gap-hint.service';
import { FactForConsensus } from './domain/seo-consensus-types';
import { SeoPhrasingHintService } from './seo-phrasing-hint.service';

describe('SEO Consensus foundation services', () => {
  it('normalizes primitive comparable values deterministically', () => {
    const service = new ComparableValueService();

    expect(service.fromAttributes({ value: ' Diode Laser ' })).toEqual({
      comparableKey: 'value',
      kind: 'category',
      fingerprint: 'value:string:diode laser',
      summary: 'diode laser',
      rawValue: ' Diode Laser ',
    });
  });

  it('marks unsupported comparison shapes as deferred', () => {
    const service = new ComparableValueService();

    expect(service.fromAttributes({ price: { min: 100, max: 200 } }))
      .toMatchObject({
        comparableKey: 'comparison_deferred',
        kind: 'comparison_deferred',
        summary: 'Comparison deferred',
      });
  });

  it('groups repeated claims and selects the strongest supported value', () => {
    const groups = groupingService().group([
      fact('fact-1', { value: 'diode' }, ['a.test'], 0.8),
      fact('fact-2', { value: 'diode' }, ['b.test'], 0.7),
      fact('fact-3', { value: 'alexandrite' }, ['c.test'], 0.6),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].alternatives).toHaveLength(2);
    expect(groups[0].strongestAlternative?.value.summary).toBe('diode');
    expect(groups[0].supportingDomainCount).toBe(3);
  });

  it('detects conflicts when comparable values differ', () => {
    const groups = groupingService().group([
      fact('fact-1', { value: true }, ['a.test'], 0.8),
      fact('fact-2', { value: false }, ['b.test'], 0.7),
    ]);
    const conflicts = new ConflictDetectionService().detect(groups);

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatchObject({
      comparableKey: 'value',
      severity: 'medium',
      suggestedHandling: 'phrase_cautiously',
    });
  });

  it('does not create conflict sets for deferred comparisons only', () => {
    const groups = groupingService().group([
      fact('fact-1', { nested: { value: 1 } }, ['a.test'], 0.8),
      fact('fact-2', { nested: { value: 2 } }, ['b.test'], 0.7),
    ]);
    const conflicts = new ConflictDetectionService().detect(groups);

    expect(conflicts).toEqual([]);
  });

  it('creates SEO phrasing hints for consensus and conflict states', () => {
    const groups = groupingService().group([
      fact('fact-1', { value: 'diode' }, ['a.test'], 0.8),
      fact('fact-2', { value: 'diode' }, ['b.test'], 0.8),
      fact('fact-3', { value: 'diode' }, ['c.test'], 0.8),
    ]);
    const hintService = new SeoPhrasingHintService();

    expect(hintService.forConsensusGroup(groups[0])).toMatchObject({
      hintType: 'confident',
    });
  });

  it('creates content gap hints for weak support and deferred comparison', () => {
    const groups = groupingService().group([
      fact('fact-1', { nested: { value: 1 } }, ['a.test'], 0.5),
    ]);

    expect(new ContentGapHintService().fromConsensusGroup(groups[0]))
      .toEqual([
        expect.objectContaining({ gapType: 'weak_support' }),
        expect.objectContaining({ gapType: 'comparison_deferred' }),
      ]);
  });
});

function groupingService(): ConsensusGroupingService {
  return new ConsensusGroupingService(new ComparableValueService());
}

function fact(
  factId: string,
  normalizedAttributes: Record<string, unknown>,
  sourceDomains: string[],
  score: number,
): FactForConsensus {
  return {
    factId,
    subjectEntityId: 'entity-1',
    predicateId: 'predicate-1',
    normalizedAttributes,
    supportingChunkIds: [`chunk-${factId}`],
    sourceDomains,
    sourceTrustScore: score,
    evidenceStrengthScore: score,
  };
}
