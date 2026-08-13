import { FocusedSerpDiscoveryController } from './focused-serp-discovery.controller';
import { FocusedSerpDiscoveryApiService } from './focused-serp-discovery.service';

describe('FocusedSerpDiscoveryController', () => {
  it('passes focused SERP discovery requests to the service', async () => {
    const service = {
      run: jest.fn(async () => ({
        snapshot: { id: 'snapshot-1' },
        observations: { submitted: 1, receipts: [] },
        frontier: { examined: 1 },
      })),
    } as unknown as FocusedSerpDiscoveryApiService;
    const controller = new FocusedSerpDiscoveryController(service);

    const result = await controller.focusedDiscovery({
      topicId: 'topic-1',
      query: ' depilacja laserowa jasło ',
      language: 'pl',
      geo: { countryCode: 'PL', city: 'Jasło' },
      providerKey: 'manual_test',
      results: [{
        url: 'https://example.com/',
        title: 'Depilacja laserowa Jasło',
        snippet: 'Oferta lokalna.',
        position: 1,
      }],
    });

    expect(service.run).toHaveBeenCalledWith({
      topicId: 'topic-1',
      query: 'depilacja laserowa jasło',
      language: 'pl',
      geo: { countryCode: 'PL', regionCode: undefined, city: 'Jasło' },
      providerKey: 'manual_test',
      results: [{
        url: 'https://example.com/',
        title: 'Depilacja laserowa Jasło',
        snippet: 'Oferta lokalna.',
        position: 1,
      }],
    });
    expect(result).toEqual(expect.objectContaining({
      snapshot: { id: 'snapshot-1' },
    }));
  });
});
