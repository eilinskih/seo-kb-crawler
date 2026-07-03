import { CrawlExecutionWrapper } from './crawl-execution-wrapper';
import { CrawlCommand } from './domain/crawler-types';
import { RobotsPolicyService } from './infrastructure/robots-policy.service';
import { SafeNetworkGatewayService } from './infrastructure/safe-network-gateway.service';

describe('CrawlExecutionWrapper', () => {
  const command: CrawlCommand = {
    attemptId: 'attempt-1',
    frontierEntryId: 'frontier-1',
    topicId: 'topic-1',
    topicConfigurationVersion: 1,
    normalizedUrl: 'https://example.com/docs/page',
    crawlPolicyFingerprint: 'policy-1',
    leaseExpiresAt: new Date('2026-07-03T10:01:00Z'),
    deadline: new Date(Date.now() + 60_000),
    policy: {
      userAgent: 'seo-kb-crawler',
      respectRobots: true,
      allowedHosts: ['example.com'],
      deniedHosts: [],
      includedPathPatterns: ['/docs/*'],
      excludedPathPatterns: ['/docs/private/*'],
      crossHostCanonicalPolicy: 'same-host',
      maxBodyBytes: 500_000,
      maxRedirects: 5,
      timeoutMs: 30_000,
      maxOutgoingLinks: 100,
      maxMediaAssets: 25,
    },
  };

  it('blocks commands outside Topic policy before robots evaluation', async () => {
    const robotsPolicyService = {
      evaluate: jest.fn(),
    } as unknown as RobotsPolicyService;

    const result = await new CrawlExecutionWrapper(
      robotsPolicyService,
      {} as SafeNetworkGatewayService,
    ).prepare({
      ...command,
      normalizedUrl: 'https://other.com/docs/page',
    });

    expect(result).toMatchObject({
      status: 'blocked',
      result: {
        status: 'blocked_by_policy',
        failure: {
          category: 'policy_redirect_blocked',
          retryable: false,
        },
      },
    });
    expect(robotsPolicyService.evaluate).not.toHaveBeenCalled();
  });

  it('blocks commands denied by robots policy', async () => {
    const result = await new CrawlExecutionWrapper(
      {
        evaluate: jest.fn(async () => ({
          allowed: false,
          checkedUrl: command.normalizedUrl,
          userAgent: command.policy.userAgent,
          evidence: 'disallow: /docs',
        })),
      } as unknown as RobotsPolicyService,
      {} as SafeNetworkGatewayService,
    ).prepare(command);

    expect(result).toMatchObject({
      status: 'blocked',
      result: {
        status: 'blocked_by_policy',
        failure: {
          category: 'robots_denied',
          detail: 'disallow: /docs',
          retryable: false,
        },
      },
    });
  });

  it('returns timed_out when the command deadline has already expired', async () => {
    const result = await new CrawlExecutionWrapper(
      {
        evaluate: jest.fn(),
      } as unknown as RobotsPolicyService,
      {} as SafeNetworkGatewayService,
    ).prepare({
      ...command,
      deadline: new Date('2000-01-01T00:00:00Z'),
    });

    expect(result).toMatchObject({
      status: 'blocked',
      result: {
        status: 'timed_out',
        failure: {
          category: 'network_timeout',
          retryable: true,
        },
      },
    });
  });

  it('returns an execution context after Topic and robots policy allow crawling', async () => {
    const safeNetworkGateway = {} as SafeNetworkGatewayService;
    const result = await new CrawlExecutionWrapper(
      {
        evaluate: jest.fn(async () => ({
          allowed: true,
          checkedUrl: command.normalizedUrl,
          userAgent: command.policy.userAgent,
          evidence: 'topic policy allowed',
        })),
      } as unknown as RobotsPolicyService,
      safeNetworkGateway,
    ).prepare(command);

    expect(result.status).toBe('ready');
    if (result.status !== 'ready') {
      throw new Error('expected ready result');
    }

    expect(result.context).toMatchObject({
      command,
      robotsDecision: {
        allowed: true,
      },
      topicPolicyDecision: {
        allowed: true,
      },
      safeNetworkGateway,
      deadline: command.deadline,
    });
    expect(result.context.signal.aborted).toBe(false);
    result.dispose();
  });
});
