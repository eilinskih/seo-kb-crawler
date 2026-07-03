import { Injectable } from '@nestjs/common';
import { createDeadlineSignal } from './domain/deadline-signal';
import { evaluateTopicCrawlPolicy } from './domain/topic-policy';
import {
  CrawlCommand,
  CrawlExecutionPreparation,
  RobotsPolicyOptions,
  SafeNetworkGateway,
  TopicCrawlPolicySnapshot,
} from './domain/crawler-types';
import { RobotsPolicyService } from './infrastructure/robots-policy.service';
import { SafeNetworkGatewayService } from './infrastructure/safe-network-gateway.service';

export interface CrawlExecutionWrapperOptions {
  robotsTtlMs: number;
  robotsFailClosed: boolean;
  maxRobotsBytes: number;
  maxRobotsResponseHeaderBytes: number;
}

const defaultOptions: CrawlExecutionWrapperOptions = {
  robotsTtlMs: 60 * 60 * 1000,
  robotsFailClosed: true,
  maxRobotsBytes: 100_000,
  maxRobotsResponseHeaderBytes: 16_000,
};

@Injectable()
export class CrawlExecutionWrapper {
  private readonly options = defaultOptions;

  constructor(
    private readonly robotsPolicyService: RobotsPolicyService,
    private readonly safeNetworkGateway: SafeNetworkGatewayService,
  ) {}

  async prepare(command: CrawlCommand): Promise<CrawlExecutionPreparation> {
    const deadlineSignal = createDeadlineSignal(command.deadline);
    if (deadlineSignal.signal.aborted) {
      deadlineSignal.dispose();
      return blockedResult('timed_out', 'network_timeout', 'crawl deadline expired', true);
    }

    const topicPolicy = topicPolicyFromCommand(command);
    const topicPolicyDecision = evaluateTopicCrawlPolicy(
      command.normalizedUrl,
      topicPolicy,
      'request',
    );

    if (!topicPolicyDecision.allowed) {
      deadlineSignal.dispose();
      return blockedResult(
        'blocked_by_policy',
        'policy_redirect_blocked',
        topicPolicyDecision.evidence,
        false,
      );
    }

    const robotsDecision = await this.robotsPolicyService.evaluate(
      command.normalizedUrl,
      robotsOptionsFromCommand(command, this.options),
      command.deadline,
      deadlineSignal.signal,
    );

    if (!robotsDecision.allowed) {
      deadlineSignal.dispose();
      return blockedResult(
        'blocked_by_policy',
        'robots_denied',
        robotsDecision.evidence ?? 'robots denied',
        false,
      );
    }

    return {
      status: 'ready',
      context: {
        command,
        robotsDecision,
        topicPolicyDecision,
        safeNetworkGateway: this.safeNetworkGateway as SafeNetworkGateway,
        deadline: command.deadline,
        signal: deadlineSignal.signal,
      },
      dispose: () => deadlineSignal.dispose(),
    };
  }
}

function topicPolicyFromCommand(command: CrawlCommand): TopicCrawlPolicySnapshot {
  return {
    allowedHosts: command.policy.allowedHosts ?? [],
    deniedHosts: command.policy.deniedHosts ?? [],
    includedPathPatterns: command.policy.includedPathPatterns ?? [],
    excludedPathPatterns: command.policy.excludedPathPatterns ?? [],
    crossHostCanonicalPolicy:
      command.policy.crossHostCanonicalPolicy ?? 'same-host',
  };
}

function robotsOptionsFromCommand(
  command: CrawlCommand,
  options: CrawlExecutionWrapperOptions,
): RobotsPolicyOptions {
  return {
    respectRobots: command.policy.respectRobots,
    userAgent: command.policy.userAgent,
    robotsTtlMs: options.robotsTtlMs,
    failClosed: options.robotsFailClosed,
    maxRobotsBytes: options.maxRobotsBytes,
    maxRedirects: command.policy.maxRedirects,
    maxResponseHeaderBytes: options.maxRobotsResponseHeaderBytes,
  };
}

function blockedResult(
  status: 'blocked_by_policy' | 'timed_out',
  category: 'policy_redirect_blocked' | 'robots_denied' | 'network_timeout',
  detail: string,
  retryable: boolean,
): CrawlExecutionPreparation {
  return {
    status: 'blocked',
    result: {
      status,
      timing: { totalMs: 0 },
      failure: {
        category,
        detail,
        retryable,
      },
    },
  };
}
