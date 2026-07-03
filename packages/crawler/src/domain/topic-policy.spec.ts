import { evaluateTopicCrawlPolicy } from './topic-policy';
import { TopicCrawlPolicySnapshot } from './crawler-types';

describe('evaluateTopicCrawlPolicy', () => {
  const policy: TopicCrawlPolicySnapshot = {
    allowedHosts: ['example.com', '*.example.org'],
    deniedHosts: ['blocked.example.org'],
    includedPathPatterns: ['/docs/*', '/'],
    excludedPathPatterns: ['/docs/private/*'],
    crossHostCanonicalPolicy: 'same-host',
  };

  it('allows exact and wildcard hosts inside included paths', () => {
    expect(
      evaluateTopicCrawlPolicy('https://example.com/docs/page', policy),
    ).toMatchObject({
      allowed: true,
      evidence: 'topic policy allowed',
    });

    expect(
      evaluateTopicCrawlPolicy('https://sub.example.org/docs/page', policy),
    ).toMatchObject({
      allowed: true,
    });
  });

  it('denies hosts outside the allowlist and denied hosts before path checks', () => {
    expect(
      evaluateTopicCrawlPolicy('https://other.com/docs/page', policy),
    ).toMatchObject({
      allowed: false,
      evidence: 'host not allowed: other.com',
    });

    expect(
      evaluateTopicCrawlPolicy('https://blocked.example.org/docs/page', policy),
    ).toMatchObject({
      allowed: false,
      evidence: 'denied host: blocked.example.org',
    });
  });

  it('applies included and excluded path patterns', () => {
    expect(
      evaluateTopicCrawlPolicy('https://example.com/blog/page', policy),
    ).toMatchObject({
      allowed: false,
      evidence: 'path not included: /blog/page',
    });

    expect(
      evaluateTopicCrawlPolicy('https://example.com/docs/private/page', policy),
    ).toMatchObject({
      allowed: false,
      evidence: 'excluded path: /docs/private/page',
    });
  });

  it('blocks cross-host canonicals when policy is same-host', () => {
    expect(
      evaluateTopicCrawlPolicy(
        'https://sub.example.org/docs/page',
        policy,
        'canonical',
        'https://example.com/docs/page',
      ),
    ).toMatchObject({
      allowed: false,
      evidence: 'cross-host canonical blocked by policy',
      kind: 'canonical',
    });
  });

  it('allows cross-host canonicals when policy permits allowed hosts', () => {
    expect(
      evaluateTopicCrawlPolicy(
        'https://sub.example.org/docs/page',
        {
          ...policy,
          crossHostCanonicalPolicy: 'allowed-hosts',
        },
        'canonical',
        'https://example.com/docs/page',
      ),
    ).toMatchObject({
      allowed: true,
    });
  });

  it('marks redirect decisions with redirect kind', () => {
    expect(
      evaluateTopicCrawlPolicy(
        'https://other.com/docs/page',
        policy,
        'redirect',
        'https://example.com/docs/page',
      ),
    ).toMatchObject({
      allowed: false,
      kind: 'redirect',
    });
  });
});
