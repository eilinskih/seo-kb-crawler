import {
  parseBingHtmlResults,
  parseDuckDuckGoHtmlResults,
} from './duckduckgo-html-serp-search.provider';

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
