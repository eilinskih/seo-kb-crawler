import { createCandidateObservation } from './candidate-observation';

describe('createCandidateObservation', () => {
  it('creates stable idempotency keys from provider item identity', () => {
    const input = {
      topicId: 'topic-1',
      topicConfigurationVersion: 2,
      discoveryRunId: 'run-1',
      sourceType: 'seed' as const,
      sourceKey: 'source-1',
      discoveredUrl: 'https://example.com/page',
      providerItemIdentity: 'seed:1:https://example.com/page',
    };

    const first = createCandidateObservation(input);
    const second = createCandidateObservation(input);

    expect(first.idempotencyKey).toBe(second.idempotencyKey);
    expect(first.discoveredUrl).toBe('https://example.com/page');
  });
});
