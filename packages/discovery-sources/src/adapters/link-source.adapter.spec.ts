import { LinkSourceAdapter } from './link-source.adapter';
import {
  CandidateObservation,
  CandidateObservationReceipt,
  CandidateObservationSink,
  DiscoveryExecutionContext,
} from '../domain/discovery-types';

class RecordingSink implements CandidateObservationSink {
  observations: CandidateObservation[] = [];

  async appendBatch(
    observations: CandidateObservation[],
  ): Promise<CandidateObservationReceipt[]> {
    this.observations.push(...observations);
    return observations.map((observation) => ({
      idempotencyKey: observation.idempotencyKey,
      status: 'accepted',
    }));
  }
}

describe('LinkSourceAdapter', () => {
  it('converts extracted links into candidate observations', async () => {
    const sink = new RecordingSink();
    const context: DiscoveryExecutionContext = {
      runId: 'run-1',
      attempt: 1,
      topicId: 'topic-1',
      topicConfigurationVersion: 1,
      sourceType: 'link',
      sourceKey: 'link-source',
      configuration: {
        sourceType: 'link',
        crawlAttemptId: 'crawl-1',
        referringUrl: 'https://example.com/source',
        links: [
          {
            href: '/target',
            resolvedUrl: 'https://example.com/target',
            anchorText: 'Target page',
            rel: ['nofollow'],
          },
        ],
      },
      checkpoint: null,
      deadline: new Date('2026-07-03T00:00:00Z'),
    };

    const result = await new LinkSourceAdapter().execute(context, sink);

    expect(result.observationsEmitted).toBe(1);
    expect(sink.observations[0]).toMatchObject({
      discoveredUrl: 'https://example.com/target',
      sourceUrl: 'https://example.com/source',
      anchorText: 'Target page',
      metadata: {
        crawlAttemptId: 'crawl-1',
        href: '/target',
        rel: ['nofollow'],
      },
    });
  });
});
