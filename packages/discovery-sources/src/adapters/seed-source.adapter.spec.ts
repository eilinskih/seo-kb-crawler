import { SeedSourceAdapter } from './seed-source.adapter';
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

describe('SeedSourceAdapter', () => {
  it('emits configured seed URLs without network requests', async () => {
    const sink = new RecordingSink();
    const context: DiscoveryExecutionContext = {
      runId: 'run-1',
      attempt: 1,
      topicId: 'topic-1',
      topicConfigurationVersion: 1,
      sourceType: 'seed',
      sourceKey: 'seed-source',
      configuration: {
        sourceType: 'seed',
        urls: ['https://example.com/a', 'https://example.com/b'],
      },
      checkpoint: null,
      deadline: new Date('2026-07-03T00:00:00Z'),
    };

    const result = await new SeedSourceAdapter().execute(context, sink);

    expect(result).toMatchObject({
      status: 'completed',
      itemsExamined: 2,
      observationsEmitted: 2,
    });
    expect(sink.observations.map((observation) => observation.discoveredUrl)).toEqual(
      ['https://example.com/a', 'https://example.com/b'],
    );
  });

  it('uses bounded provider identities for long seed URLs', async () => {
    const sink = new RecordingSink();
    const longUrl = `https://example.com/page?${'q='.repeat(300)}`;
    const context: DiscoveryExecutionContext = {
      runId: 'run-1',
      attempt: 1,
      topicId: 'topic-1',
      topicConfigurationVersion: 1,
      sourceType: 'seed',
      sourceKey: 'seed-source',
      configuration: {
        sourceType: 'seed',
        urls: [longUrl],
      },
      checkpoint: null,
      deadline: new Date('2026-07-03T00:00:00Z'),
    };

    await expect(new SeedSourceAdapter().execute(context, sink)).resolves.toMatchObject({
      status: 'completed',
      observationsEmitted: 1,
    });
  });
});
