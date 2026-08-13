import {
  FocusedSerpDiscoveryApiService,
} from './focused-serp-discovery.service';

describe('FocusedSerpDiscoveryApiService', () => {
  it('records SERP snapshots and hands result URLs to URL Frontier', async () => {
    const topicService = {
      get: jest.fn(async () => ({
        id: 'topic-1',
        configurationVersion: 3,
      })),
    };
    const serpDiscovery = {
      recordSnapshot: jest.fn(async () => ({
        snapshot: { id: 'snapshot-1', results: [] },
        observations: [{ idempotencyKey: 'hashed-serp-key' }],
      })),
    };
    const frontierRepository = {
      appendDiscoveryObservations: jest.fn(async () => [{
        idempotencyKey: 'hashed-serp-key',
        status: 'accepted',
        frontierEntryId: null,
      }]),
    };
    const frontierReevaluation = {
      reevaluatePending: jest.fn(async () => ({
        examined: 1,
        upsertedEntries: 1,
        linkedObservations: 1,
        missingSnapshots: 0,
        accepted: 1,
        rejected: 0,
        insufficientEvidence: 0,
      })),
    };
    const service = new FocusedSerpDiscoveryApiService(
      topicService as never,
      serpDiscovery as never,
      frontierRepository as never,
      frontierReevaluation as never,
    );

    const result = await service.run({
      topicId: 'topic-1',
      query: 'depilacja laserowa jasło',
      language: 'pl',
      geo: { countryCode: 'PL', city: 'Jasło' },
      results: [{ url: 'https://example.com/' }],
    });

    expect(serpDiscovery.recordSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        topicConfigurationVersion: 3,
        providerMode: 'manual_import',
      }),
    );
    expect(frontierRepository.appendDiscoveryObservations).toHaveBeenCalledWith([
      { idempotencyKey: 'hashed-serp-key' },
    ]);
    expect(frontierReevaluation.reevaluatePending).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 1 }),
    );
    expect(result.frontier).toEqual(expect.objectContaining({
      upsertedEntries: 1,
    }));
  });
});
