import {
  FocusedSerpDiscoveryApiService,
} from './focused-serp-discovery.service';

describe('FocusedSerpDiscoveryApiService', () => {
  it('records SERP snapshots and hands result URLs to URL Frontier', async () => {
    const topicService = {
      get: jest.fn(async () => ({
        id: 'topic-1',
        configurationVersion: 3,
        discovery: {
          search: {
            queries: [{ text: 'depilacja laserowa jasło', language: 'pl' }],
            maxResultsPerQuery: 10,
          },
        },
        languageGeo: {
          languages: [{ tag: 'pl' }],
          geoTargets: [{ countryCode: 'PL' }],
        },
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
    const serpSearchProvider = {
      providerKey: 'fallback_test',
      search: jest.fn(),
    };
    const service = new FocusedSerpDiscoveryApiService(
      topicService as never,
      serpDiscovery as never,
      frontierRepository as never,
      frontierReevaluation as never,
      serpSearchProvider as never,
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

  it('runs automatic SERP discovery from the topic seed keyword', async () => {
    const topicService = {
      get: jest.fn(async () => ({
        id: 'topic-1',
        configurationVersion: 3,
        discovery: {
          search: {
            queries: [{ text: 'depilacja laserowa jasło', language: 'pl' }],
            maxResultsPerQuery: 10,
          },
        },
        languageGeo: {
          languages: [{ tag: 'pl' }],
          geoTargets: [{ countryCode: 'PL' }],
        },
      })),
    };
    const serpDiscovery = {
      recordSnapshot: jest.fn(async () => ({
        snapshot: { id: 'snapshot-1', results: [{ url: 'https://clinic.example/' }] },
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
    const serpSearchProvider = {
      providerKey: 'fallback_test',
      search: jest.fn(async () => ({
        providerKey: 'fallback_test',
        providerMode: 'fallback',
        degraded: false,
        warnings: [],
        results: [{
          url: 'https://clinic.example/',
          title: 'Clinic',
          position: 1,
        }],
      })),
    };
    const service = new FocusedSerpDiscoveryApiService(
      topicService as never,
      serpDiscovery as never,
      frontierRepository as never,
      frontierReevaluation as never,
      serpSearchProvider as never,
    );

    const result = await service.runFromTopic({ topicId: 'topic-1' });

    expect(serpSearchProvider.search).toHaveBeenCalledWith({
      query: 'depilacja laserowa jasło',
      language: 'pl',
      geo: { countryCode: 'PL', regionCode: undefined },
      limit: 10,
    });
    expect(serpDiscovery.recordSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        providerKey: 'fallback_test',
        providerMode: 'fallback',
        results: [expect.objectContaining({ url: 'https://clinic.example/' })],
      }),
    );
    expect(result).toEqual(expect.objectContaining({
      status: 'recorded',
      providerKey: 'fallback_test',
    }));
  });

  it('does not fabricate frontier entries when automatic SERP fallback has no results', async () => {
    const topicService = {
      get: jest.fn(async () => ({
        id: 'topic-1',
        configurationVersion: 3,
        discovery: {
          search: {
            queries: [{ text: 'depilacja laserowa jasło', language: 'pl' }],
            maxResultsPerQuery: 10,
          },
        },
        languageGeo: {
          languages: [{ tag: 'pl' }],
          geoTargets: [{ countryCode: 'PL' }],
        },
      })),
    };
    const serpDiscovery = { recordSnapshot: jest.fn() };
    const frontierRepository = { appendDiscoveryObservations: jest.fn() };
    const frontierReevaluation = { reevaluatePending: jest.fn() };
    const serpSearchProvider = {
      providerKey: 'fallback_test',
      search: jest.fn(async () => ({
        providerKey: 'fallback_test',
        providerMode: 'fallback',
        degraded: true,
        warnings: ['No fallback results.'],
        results: [],
      })),
    };
    const service = new FocusedSerpDiscoveryApiService(
      topicService as never,
      serpDiscovery as never,
      frontierRepository as never,
      frontierReevaluation as never,
      serpSearchProvider as never,
    );

    const result = await service.runFromTopic({ topicId: 'topic-1' });

    expect(serpDiscovery.recordSnapshot).not.toHaveBeenCalled();
    expect(frontierRepository.appendDiscoveryObservations).not.toHaveBeenCalled();
    expect(result).toEqual({
      status: 'degraded_no_results',
      providerKey: 'fallback_test',
      warnings: ['No fallback results.'],
      snapshot: null,
      observations: { submitted: 0, receipts: [] },
      frontier: null,
    });
  });
});
