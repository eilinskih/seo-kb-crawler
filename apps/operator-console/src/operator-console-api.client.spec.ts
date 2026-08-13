import { __testing } from './operator-console-api.client';

describe('OperatorConsoleApiClient', () => {
  it('builds Topic API input with normalized relevance field weights', () => {
    const input = __testing.toCreateTopicInput({
      slug: 'laser-hair-removal',
      name: 'Laser Hair Removal',
      description: null,
      seedUrls: ['https://example.com/'],
      seedKeywords: ['laser hair removal'],
      language: 'en',
      countryCode: 'US',
      maxPages: 100,
    });

    expect(input).toEqual(expect.objectContaining({
      relevanceProfile: expect.objectContaining({
        fieldWeights: {
          url: 0.125,
          title: 0.375,
          headings: 0.25,
          body: 0.125,
          anchorText: 0.125,
        },
      }),
    }));
    expect(
      Object.values(
        (input.relevanceProfile as { fieldWeights: Record<string, number> })
          .fieldWeights,
      ).reduce((total, weight) => total + weight, 0),
    ).toBe(1);
  });
});
