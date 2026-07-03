import { Injectable } from '@nestjs/common';
import {
  RobotsDecision,
  RobotsPolicyOptions,
  SafeNetworkGateway,
} from '../domain/crawler-types';

interface CachedRobotsRules {
  expiresAt: number;
  rules: RobotsRules;
}

interface RobotsRules {
  groups: RobotsRuleGroup[];
}

interface RobotsRuleGroup {
  userAgents: string[];
  rules: RobotsPathRule[];
  crawlDelaySeconds?: number;
}

interface RobotsPathRule {
  type: 'allow' | 'disallow';
  path: string;
}

@Injectable()
export class RobotsPolicyService {
  private readonly cache = new Map<string, CachedRobotsRules>();

  constructor(private readonly safeNetworkGateway: SafeNetworkGateway) {}

  async evaluate(
    targetUrl: string,
    options: RobotsPolicyOptions,
    deadline: Date,
    signal: AbortSignal,
    now = new Date(),
  ): Promise<RobotsDecision> {
    const target = parseHttpUrl(targetUrl);
    if (!options.respectRobots) {
      return {
        allowed: true,
        checkedUrl: target.href,
        userAgent: options.userAgent,
        evidence: 'robots disabled by policy',
      };
    }

    const cacheKey = robotsCacheKey(target, options.userAgent);

    try {
      const rules = await this.getRules(cacheKey, target, options, deadline, signal, now);
      const decision = evaluateRules(target, options.userAgent, rules);
      return {
        allowed: decision.allowed,
        checkedUrl: target.href,
        userAgent: options.userAgent,
        evidence: decision.evidence,
        cacheKey,
        crawlDelaySeconds: decision.crawlDelaySeconds,
      };
    } catch (error) {
      if (!options.failClosed) {
        return {
          allowed: true,
          checkedUrl: target.href,
          userAgent: options.userAgent,
          evidence: `robots unavailable: ${errorDetail(error)}`,
          cacheKey,
        };
      }

      return {
        allowed: false,
        checkedUrl: target.href,
        userAgent: options.userAgent,
        evidence: `robots unavailable: ${errorDetail(error)}`,
        cacheKey,
      };
    }
  }

  private async getRules(
    cacheKey: string,
    target: URL,
    options: RobotsPolicyOptions,
    deadline: Date,
    signal: AbortSignal,
    now: Date,
  ): Promise<RobotsRules> {
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > now.getTime()) {
      return cached.rules;
    }

    const robotsUrl = new URL('/robots.txt', target);
    const response = await this.safeNetworkGateway.fetch({
      url: robotsUrl.href,
      method: 'GET',
      deadline,
      signal,
      maxBodyBytes: options.maxRobotsBytes,
      maxRedirects: options.maxRedirects,
      maxResponseHeaderBytes: options.maxResponseHeaderBytes,
    });

    const rules =
      response.statusCode >= 200 && response.statusCode < 300
        ? parseRobotsTxt(new TextDecoder().decode(response.body))
        : { groups: [] };

    this.cache.set(cacheKey, {
      expiresAt: now.getTime() + options.robotsTtlMs,
      rules,
    });

    return rules;
  }
}

function parseHttpUrl(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('robots target must use http or https');
  }
  return url;
}

function robotsCacheKey(target: URL, userAgent: string): string {
  return `${target.protocol}//${target.host}|${userAgent.toLowerCase()}`;
}

function parseRobotsTxt(body: string): RobotsRules {
  const groups: RobotsRuleGroup[] = [];
  let currentGroup: RobotsRuleGroup | null = null;

  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.split('#', 1)[0]?.trim() ?? '';
    if (!line) {
      currentGroup = null;
      continue;
    }

    const separator = line.indexOf(':');
    if (separator === -1) {
      continue;
    }

    const field = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();

    if (field === 'user-agent') {
      if (!currentGroup || currentGroup.rules.length > 0) {
        currentGroup = { userAgents: [], rules: [] };
        groups.push(currentGroup);
      }
      currentGroup.userAgents.push(value.toLowerCase());
      continue;
    }

    if (!currentGroup) {
      continue;
    }

    if (field === 'allow' || field === 'disallow') {
      currentGroup.rules.push({
        type: field,
        path: value,
      });
      continue;
    }

    if (field === 'crawl-delay') {
      const seconds = Number(value);
      if (Number.isFinite(seconds) && seconds >= 0) {
        currentGroup.crawlDelaySeconds = seconds;
      }
    }
  }

  return { groups };
}

function evaluateRules(
  target: URL,
  userAgent: string,
  rules: RobotsRules,
): { allowed: boolean; evidence: string; crawlDelaySeconds?: number } {
  const groups = matchingGroups(rules, userAgent);
  if (groups.length === 0) {
    return { allowed: true, evidence: 'no matching robots group' };
  }

  const targetPath = `${target.pathname}${target.search}`;
  const matchingRules = groups
    .flatMap((group) => group.rules)
    .filter((rule) => rule.path.length > 0 && targetPath.startsWith(rule.path))
    .sort((left, right) => right.path.length - left.path.length);
  const crawlDelaySeconds = groups.find(
    (group) => group.crawlDelaySeconds !== undefined,
  )?.crawlDelaySeconds;

  if (matchingRules.length === 0) {
    return {
      allowed: true,
      evidence: 'no matching robots path rule',
      crawlDelaySeconds,
    };
  }

  const rule = matchingRules[0];
  return {
    allowed: rule.type === 'allow',
    evidence: `${rule.type}: ${rule.path}`,
    crawlDelaySeconds,
  };
}

function matchingGroups(rules: RobotsRules, userAgent: string): RobotsRuleGroup[] {
  const normalizedUserAgent = userAgent.toLowerCase();
  const exact = rules.groups.filter((group) =>
    group.userAgents.some((agent) => normalizedUserAgent.includes(agent)),
  );
  if (exact.length > 0) {
    return exact;
  }
  return rules.groups.filter((group) => group.userAgents.includes('*'));
}

function errorDetail(error: unknown): string {
  return error instanceof Error ? error.message.slice(0, 500) : 'unknown error';
}
