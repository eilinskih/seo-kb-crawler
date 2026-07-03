import { createCrawlCommand } from './crawl-command';
import { CrawlerValidationError } from './crawler-errors';
import { CrawlCommandPayload } from './crawler-types';

describe('createCrawlCommand', () => {
  const basePayload: CrawlCommandPayload = {
    attemptId: 'attempt-1',
    frontierEntryId: 'frontier-1',
    topicId: 'topic-1',
    topicConfigurationVersion: 1,
    normalizedUrl: 'https://example.com/page',
    crawlPolicyFingerprint: 'policy-1',
    leaseExpiresAt: '2026-07-03T10:01:00Z',
    deadline: '2026-07-03T10:00:30Z',
    policy: {
      userAgent: 'seo-kb-crawler',
      respectRobots: true,
      allowedHosts: ['example.com'],
      deniedHosts: [],
      includedPathPatterns: ['/docs/*'],
      excludedPathPatterns: ['/docs/private/*'],
      crossHostCanonicalPolicy: 'same-host',
      requiresMarkdown: true,
      maxBodyBytes: 500_000,
      maxRedirects: 5,
      timeoutMs: 30_000,
      maxOutgoingLinks: 100,
      maxMediaAssets: 25,
    },
  };

  it('normalizes a valid crawl command payload', () => {
    const command = createCrawlCommand(basePayload);

    expect(command.normalizedUrl).toBe('https://example.com/page');
    expect(command.deadline).toEqual(new Date('2026-07-03T10:00:30Z'));
    expect(command.policy.requiresMarkdown).toBe(true);
    expect(command.policy.allowedHosts).toEqual(['example.com']);
    expect(command.policy.includedPathPatterns).toEqual(['/docs/*']);
    expect(command.policy.crossHostCanonicalPolicy).toBe('same-host');
  });

  it('rejects commands whose deadline exceeds the frontier lease', () => {
    expect(() =>
      createCrawlCommand({
        ...basePayload,
        deadline: '2026-07-03T10:02:00Z',
      }),
    ).toThrow(CrawlerValidationError);
  });

  it('rejects non-http crawl targets', () => {
    expect(() =>
      createCrawlCommand({
        ...basePayload,
        normalizedUrl: 'file:///etc/passwd',
      }),
    ).toThrow('normalizedUrl must use http or https');
  });
});
