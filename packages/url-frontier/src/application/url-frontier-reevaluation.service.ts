import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { TopicService, TopicSnapshot } from '@seo-kb/topic-engine';
import {
  UrlFrontierCrawlPolicySnapshot,
  UrlFrontierEntrySeed,
  UrlFrontierPendingObservation,
  UrlFrontierRelevanceDecision,
} from '../domain/url-frontier-types';
import { KnexUrlFrontierRepository } from '../persistence/knex-url-frontier.repository';

export interface UrlFrontierReevaluationOptions {
  limit: number;
  now: Date;
}

export interface UrlFrontierReevaluationResult {
  examined: number;
  upsertedEntries: number;
  linkedObservations: number;
  missingSnapshots: number;
  accepted: number;
  rejected: number;
  insufficientEvidence: number;
}

export interface UrlFrontierPreCrawlEvaluation {
  relevanceScore: number | null;
  relevanceDecision: UrlFrontierRelevanceDecision;
  relevanceExplanation: Record<string, unknown>;
  priorityScore: number;
}

@Injectable()
export class UrlFrontierReevaluationService {
  constructor(
    private readonly repository: KnexUrlFrontierRepository,
    private readonly topicService: TopicService,
  ) {}

  async reevaluatePending(
    options: UrlFrontierReevaluationOptions,
  ): Promise<UrlFrontierReevaluationResult> {
    if (!Number.isInteger(options.limit) || options.limit < 1) {
      throw new Error('limit must be a positive integer');
    }

    const observations = await this.repository.listPendingDiscoveryObservations(
      options.limit,
    );
    const result: UrlFrontierReevaluationResult = {
      examined: observations.length,
      upsertedEntries: 0,
      linkedObservations: 0,
      missingSnapshots: 0,
      accepted: 0,
      rejected: 0,
      insufficientEvidence: 0,
    };

    for (const observation of observations) {
      const snapshot = await this.findSnapshot(observation);
      if (!snapshot) {
        result.missingSnapshots += 1;
        continue;
      }

      const evaluation = evaluatePreCrawlObservation(observation, snapshot);
      const seed = toEntrySeed(observation, snapshot, evaluation, options.now);
      await this.repository.upsertEntry(seed);
      result.upsertedEntries += 1;

      if (
        await this.repository.linkDiscoveryObservation(
          observation.observationId,
          seed.id,
        )
      ) {
        result.linkedObservations += 1;
      }

      if (evaluation.relevanceDecision === 'accepted') {
        result.accepted += 1;
      } else if (evaluation.relevanceDecision === 'rejected') {
        result.rejected += 1;
      } else {
        result.insufficientEvidence += 1;
      }
    }

    return result;
  }

  private async findSnapshot(
    observation: UrlFrontierPendingObservation,
  ): Promise<TopicSnapshot | null> {
    try {
      return await this.topicService.getSnapshot(
        observation.topicId,
        observation.topicConfigurationVersion,
      );
    } catch {
      return null;
    }
  }
}

export function evaluatePreCrawlObservation(
  observation: UrlFrontierPendingObservation,
  snapshot: TopicSnapshot,
): UrlFrontierPreCrawlEvaluation {
  const policyDecision = evaluateCrawlPolicy(observation, snapshot);
  if (policyDecision) {
    return policyDecision;
  }

  const evidence = evidenceText(observation);
  const profile = snapshot.relevanceProfile;
  const excludedTerm = profile.excludedTerms.find((term) =>
    evidence.includes(term),
  );
  if (excludedTerm) {
    return rejected(0, 'excluded_term', { term: excludedTerm });
  }

  const missingRequiredGroup = profile.requiredTermGroups.find((group) =>
    !group.some((term) => evidence.includes(term)),
  );
  if (missingRequiredGroup) {
    if (profile.allowExploratoryCrawl) {
      return {
        relevanceScore: null,
        relevanceDecision: 'insufficient_evidence',
        relevanceExplanation: {
          reason: 'missing_required_pre_crawl_evidence',
          missingRequiredGroup,
          exploratoryCrawlAllowed: true,
        },
        priorityScore: 100,
      };
    }
    return rejected(0, 'missing_required_pre_crawl_evidence', {
      missingRequiredGroup,
    });
  }

  const weightedScore = profile.weightedTerms.reduce((total, item) => {
    return evidence.includes(item.term) ? total + item.weight : total;
  }, 0);
  const hostAdjustment = profile.hostAdjustments.find((item) =>
    item.host === hostFor(observation.normalizedUrl),
  )?.adjustment ?? 0;
  const score = clamp01(0.5 + weightedScore + hostAdjustment);

  if (score < profile.minimumScore) {
    return rejected(score, 'below_minimum_score', {
      minimumScore: profile.minimumScore,
    });
  }

  return {
    relevanceScore: score,
    relevanceDecision: 'accepted',
    relevanceExplanation: {
      reason: 'pre_crawl_evidence_matched',
      weightedScore,
      hostAdjustment,
    },
    priorityScore: Math.round(250 + score * 400),
  };
}

function evaluateCrawlPolicy(
  observation: UrlFrontierPendingObservation,
  snapshot: TopicSnapshot,
): UrlFrontierPreCrawlEvaluation | null {
  const url = new URL(observation.normalizedUrl);
  const host = url.hostname;
  const policy = snapshot.crawlPolicy;

  if (policy.deniedHosts.includes(host)) {
    return rejected(0, 'denied_host', { host });
  }
  if (!policy.allowedHosts.includes(host)) {
    return rejected(0, 'host_not_allowed', { host });
  }
  if (
    policy.includedPathPatterns.length > 0 &&
    !policy.includedPathPatterns.some((pattern) => pathMatches(url.pathname, pattern))
  ) {
    return rejected(0, 'path_not_included', { path: url.pathname });
  }
  const excludedPattern = policy.excludedPathPatterns.find((pattern) =>
    pathMatches(url.pathname, pattern),
  );
  if (excludedPattern) {
    return rejected(0, 'path_excluded', {
      path: url.pathname,
      pattern: excludedPattern,
    });
  }

  return null;
}

function toEntrySeed(
  observation: UrlFrontierPendingObservation,
  snapshot: TopicSnapshot,
  evaluation: UrlFrontierPreCrawlEvaluation,
  now: Date,
): UrlFrontierEntrySeed {
  return {
    id: randomUUID(),
    topicId: observation.topicId,
    topicConfigurationVersion: snapshot.configurationVersion,
    normalizedUrl: observation.normalizedUrl,
    normalizedUrlHash: observation.normalizedUrlHash,
    crawlPolicyFingerprint: snapshot.crawlPolicyFingerprint,
    crawlPolicy: toCrawlPolicySnapshot(snapshot),
    priorityScore: evaluation.priorityScore,
    relevanceScore: evaluation.relevanceScore ?? undefined,
    relevanceDecision: evaluation.relevanceDecision,
    relevanceExplanation: evaluation.relevanceExplanation,
    relevanceProfileVersion: snapshot.configurationVersion,
    nextCrawlAt: now,
    now,
  };
}

function toCrawlPolicySnapshot(
  snapshot: TopicSnapshot,
): UrlFrontierCrawlPolicySnapshot {
  const policy = snapshot.crawlPolicy;
  return {
    userAgent: 'seo-kb-crawler',
    respectRobots: policy.robotsPolicy === 'strict',
    allowedHosts: policy.allowedHosts,
    deniedHosts: policy.deniedHosts,
    includedPathPatterns: policy.includedPathPatterns,
    excludedPathPatterns: policy.excludedPathPatterns,
    crossHostCanonicalPolicy: policy.crossHostCanonicalPolicy,
    requiresJavaScript: policy.renderMode === 'always',
    maxBodyBytes: policy.maxResponseBytes,
    maxRedirects: 5,
    timeoutMs: policy.requestTimeoutMs,
    maxOutgoingLinks: 100,
    maxMediaAssets: 25,
    recrawlIntervalHours: policy.recrawlIntervalHours,
    minRecrawlIntervalHours: policy.minRecrawlIntervalHours,
    maxRecrawlIntervalHours: policy.maxRecrawlIntervalHours,
  };
}

function rejected(
  relevanceScore: number,
  reason: string,
  detail: Record<string, unknown>,
): UrlFrontierPreCrawlEvaluation {
  return {
    relevanceScore,
    relevanceDecision: 'rejected',
    relevanceExplanation: {
      reason,
      ...detail,
    },
    priorityScore: 0,
  };
}

function evidenceText(observation: UrlFrontierPendingObservation): string {
  return [
    observation.normalizedUrl,
    observation.title,
    observation.snippet,
    observation.anchorText,
  ]
    .filter((value): value is string => Boolean(value))
    .join(' ')
    .toLowerCase();
}

function hostFor(value: string): string {
  return new URL(value).hostname;
}

function pathMatches(path: string, pattern: string): boolean {
  const escaped = pattern
    .split('*')
    .map((part) => part.replace(/[.\^$]/gu, '\\$&'))
    .join('.*');
  return new RegExp(`^${escaped}$`, 'u').test(path);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
