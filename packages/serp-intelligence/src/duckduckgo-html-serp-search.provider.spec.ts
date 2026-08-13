import {
  DuckDuckGoHtmlSerpSearchProvider,
  __duckDuckGoHtmlSerpSearchProviderTesting,
  parseBingHtmlResults,
  parseDuckDuckGoHtmlResults,
  parseGoogleHtmlResults,
} from './duckduckgo-html-serp-search.provider';

describe('DuckDuckGoHtmlSerpSearchProvider', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    __duckDuckGoHtmlSerpSearchProviderTesting.resetGoogleHeadlessSearch();
  });

  it('tries Google before secondary fallback sources', async () => {
    const fetchMock = jest.fn(async (_url: string) => ({
      ok: true,
      text: async () => `
        <a href="/url?q=https%3A%2F%2Fclinic.example%2Fdepilacja">Depilacja laserowa Jasło</a>
      `,
    }));
    global.fetch = fetchMock as never;

    const provider = new DuckDuckGoHtmlSerpSearchProvider();
    const result = await provider.search({
      query: 'depilacja laserowa jasło',
      language: 'pl',
      geo: { countryCode: 'PL' },
      limit: 10,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('google.com/search');
    expect(result.results).toEqual([
      {
        url: 'https://clinic.example/depilacja',
        title: 'Depilacja laserowa Jasło',
        snippet: null,
        position: 1,
      },
    ]);
  });

  it('uses bounded Google headless fallback when static Google HTML is blocked', async () => {
    const fetchMock = jest.fn(async (_url: string) => ({
      ok: true,
      text: async () => '<a href="/httpservice/retry/enablejs">enable js</a>',
    }));
    global.fetch = fetchMock as never;
    __duckDuckGoHtmlSerpSearchProviderTesting.setGoogleHeadlessSearch(
      async () => ({
        html: `
          <a href="/url?q=https%3A%2F%2Fclinic.example%2Fdepilacja">Depilacja laserowa Jasło</a>
        `,
        warnings: ['Google HTML fallback used bounded local Playwright Chrome.'],
      }),
    );

    const provider = new DuckDuckGoHtmlSerpSearchProvider();
    const result = await provider.search({
      query: 'depilacja laserowa jasło',
      language: 'pl',
      geo: { countryCode: 'PL' },
      limit: 10,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.degraded).toBe(true);
    expect(result.warnings).toContain(
      'Google HTML fallback returned an anti-bot challenge',
    );
    expect(result.warnings).toContain(
      'Google HTML fallback used bounded local Playwright Chrome.',
    );
    expect(result.results).toEqual([
      {
        url: 'https://clinic.example/depilacja',
        title: 'Depilacja laserowa Jasło',
        snippet: null,
        position: 1,
      },
    ]);
  });
});

describe('parseGoogleHtmlResults', () => {
  it('extracts organic result URLs from Google HTML fallback output', () => {
    const results = parseGoogleHtmlResults(`
      <a href="/url?q=https%3A%2F%2Fclinic.example%2Fdepilacja%23hero&sa=U">Depilacja laserowa Jasło</a>
      <a href="https://example.org/laser">Laser Jasło</a>
      <a href="/search?q=depilacja+laserowa+jaslo">Ignored Google search link</a>
    `);

    expect(results).toEqual([
      {
        url: 'https://clinic.example/depilacja',
        title: 'Depilacja laserowa Jasło',
        snippet: null,
        position: 1,
      },
      {
        url: 'https://example.org/laser',
        title: 'Laser Jasło',
        snippet: null,
        position: 2,
      },
    ]);
  });
});

describe('parseDuckDuckGoHtmlResults', () => {
  it('extracts organic result URLs from DuckDuckGo HTML fallback output', () => {
    const results = parseDuckDuckGoHtmlResults(`
      <a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fdepilacja%23section">Depilacja laserowa Jasło</a>
      <a rel="nofollow" class="result__a" href="https://example.org/laser">Laser Jasło</a>
      <a rel="nofollow" class="result__a" href="javascript:void(0)">Ignored</a>
    `);

    expect(results).toEqual([
      {
        url: 'https://example.com/depilacja',
        title: 'Depilacja laserowa Jasło',
        snippet: null,
        position: 1,
      },
      {
        url: 'https://example.org/laser',
        title: 'Laser Jasło',
        snippet: null,
        position: 2,
      },
    ]);
  });
});

describe('parseBingHtmlResults', () => {
  it('extracts organic result URLs from Bing HTML fallback output', () => {
    const results = parseBingHtmlResults(`
      <li class="b_algo">
        <h2><a href="https://www.bing.com/ck/a?u=a1aHR0cHM6Ly9jbGluaWMuZXhhbXBsZS9kZXBpbGFjamEjaGVybyZudGI9MQ">Depilacja laserowa Jasło</a></h2>
      </li>
      <li class="b_algo">
        <h2><a href="https://example.org/laser">Laser Jasło</a></h2>
      </li>
    `);

    expect(results).toEqual([
      {
        url: 'https://clinic.example/depilacja',
        title: 'Depilacja laserowa Jasło',
        snippet: null,
        position: 1,
      },
      {
        url: 'https://example.org/laser',
        title: 'Laser Jasło',
        snippet: null,
        position: 2,
      },
    ]);
  });
});
