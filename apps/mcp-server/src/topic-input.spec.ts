import { buildTopicInput, slugify } from './topic-input';

describe('MCP topic input builder', () => {
  it('builds a complete Topic Engine payload from one seed', () => {
    const input = buildTopicInput({
      seed: 'depilacja laserowa jasło',
      language: 'pl',
      countryCode: 'PL',
      maxResultsPerQuery: 10,
    });

    expect(input).toMatchObject({
      slug: 'depilacja-laserowa-jaslo',
      name: 'Depilacja Laserowa Jasło',
      discovery: {
        search: {
          enabled: true,
          queries: [{
            text: 'depilacja laserowa jasło',
            language: 'pl',
            geo: { countryCode: 'PL' },
          }],
          maxResultsPerQuery: 10,
        },
      },
      languageGeo: {
        geoMode: 'targeted',
        geoTargets: [{ countryCode: 'PL', priority: 100 }],
      },
      crawlPolicy: {
        allowedHosts: [],
        renderMode: 'auto',
        robotsPolicy: 'strict',
      },
    });
  });

  it('normalizes unicode topic slugs into kebab-case', () => {
    expect(slugify('Laserowa Depilacja Łódź / Cena')).toBe(
      'laserowa-depilacja-lodz-cena',
    );
  });
});
