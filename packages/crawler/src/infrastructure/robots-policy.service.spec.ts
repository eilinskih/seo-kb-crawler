import { RobotsPolicyService } from './robots-policy.service';
import {
  RobotsPolicyOptions,
  SafeNetworkGateway,
  SafeNetworkRequest,
  SafeNetworkResponse,
} from '../domain/crawler-types';

class FakeSafeNetworkGateway implements SafeNetworkGateway {
  requests: SafeNetworkRequest[] = [];
  responseBody = '';
  statusCode = 200;
  error: Error | null = null;

  async fetch(request: SafeNetworkRequest): Promise<SafeNetworkResponse> {
    this.requests.push(request);
    if (this.error) {
      throw this.error;
    }
    return {
      finalUrl: request.url,
      statusCode: this.statusCode,
      headers: {},
      body: new TextEncoder().encode(this.responseBody),
      redirectChain: [],
    };
  }
}

describe('RobotsPolicyService', () => {
  const options: RobotsPolicyOptions = {
    respectRobots: true,
    userAgent: 'seo-kb-crawler',
    robotsTtlMs: 60_000,
    failClosed: true,
    maxRobotsBytes: 50_000,
    maxRedirects: 2,
    maxResponseHeaderBytes: 5000,
  };

  it('allows crawling when robots is disabled by policy', async () => {
    const gateway = new FakeSafeNetworkGateway();

    const decision = await new RobotsPolicyService(gateway).evaluate(
      'https://example.com/private',
      {
        ...options,
        respectRobots: false,
      },
      new Date('2026-07-03T10:00:30Z'),
      new AbortController().signal,
    );

    expect(decision).toMatchObject({
      allowed: true,
      evidence: 'robots disabled by policy',
    });
    expect(gateway.requests).toHaveLength(0);
  });

  it('blocks explicit disallow rules for matching user agents', async () => {
    const gateway = new FakeSafeNetworkGateway();
    gateway.responseBody = [
      'User-agent: seo-kb-crawler',
      'Disallow: /private',
      'Crawl-delay: 3',
    ].join('\n');

    const decision = await new RobotsPolicyService(gateway).evaluate(
      'https://example.com/private/page',
      options,
      new Date('2026-07-03T10:00:30Z'),
      new AbortController().signal,
    );

    expect(decision).toMatchObject({
      allowed: false,
      evidence: 'disallow: /private',
      crawlDelaySeconds: 3,
      cacheKey: 'https://example.com|seo-kb-crawler',
    });
    expect(gateway.requests[0]).toMatchObject({
      url: 'https://example.com/robots.txt',
      maxBodyBytes: options.maxRobotsBytes,
      maxRedirects: options.maxRedirects,
    });
  });

  it('prefers the longest matching allow rule', async () => {
    const gateway = new FakeSafeNetworkGateway();
    gateway.responseBody = [
      'User-agent: *',
      'Disallow: /private',
      'Allow: /private/public',
    ].join('\n');

    const decision = await new RobotsPolicyService(gateway).evaluate(
      'https://example.com/private/public/page',
      options,
      new Date('2026-07-03T10:00:30Z'),
      new AbortController().signal,
    );

    expect(decision).toMatchObject({
      allowed: true,
      evidence: 'allow: /private/public',
    });
  });

  it('caches robots by scheme, authority and user-agent', async () => {
    const gateway = new FakeSafeNetworkGateway();
    gateway.responseBody = ['User-agent: *', 'Disallow: /private'].join('\n');
    const service = new RobotsPolicyService(gateway);

    await service.evaluate(
      'https://example.com:8443/private/a',
      options,
      new Date('2026-07-03T10:00:30Z'),
      new AbortController().signal,
      new Date('2026-07-03T10:00:00Z'),
    );
    await service.evaluate(
      'https://example.com:8443/private/b',
      options,
      new Date('2026-07-03T10:00:30Z'),
      new AbortController().signal,
      new Date('2026-07-03T10:00:10Z'),
    );

    expect(gateway.requests).toHaveLength(1);
    expect(gateway.requests[0].url).toBe('https://example.com:8443/robots.txt');
  });

  it('fails closed by default when robots cannot be fetched', async () => {
    const gateway = new FakeSafeNetworkGateway();
    gateway.error = new Error('network unavailable');

    const decision = await new RobotsPolicyService(gateway).evaluate(
      'https://example.com/page',
      options,
      new Date('2026-07-03T10:00:30Z'),
      new AbortController().signal,
    );

    expect(decision).toMatchObject({
      allowed: false,
      evidence: 'robots unavailable: network unavailable',
    });
  });

  it('can fail open when configured explicitly', async () => {
    const gateway = new FakeSafeNetworkGateway();
    gateway.error = new Error('network unavailable');

    const decision = await new RobotsPolicyService(gateway).evaluate(
      'https://example.com/page',
      {
        ...options,
        failClosed: false,
      },
      new Date('2026-07-03T10:00:30Z'),
      new AbortController().signal,
    );

    expect(decision.allowed).toBe(true);
    expect(decision.evidence).toBe('robots unavailable: network unavailable');
  });
});
